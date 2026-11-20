import io
import json
import logging
import os
import re
import shutil
import sqlite3
import subprocess
import unicodedata
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote, urlsplit
from uuid import UUID, uuid4
import xml.etree.ElementTree as ET

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader, PdfWriter
from .score import normalize, read_parts
from . import starters, ui

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("VIOLIN_DATA", ROOT / ".data")).resolve()
DATA.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((ROOT / "assets/openscore.json").read_text())
REV = "38c5db510224d9facdc4b08d741fc788cfb58ea8"
worker = ThreadPoolExecutor(max_workers=1)
log = logging.getLogger("uvicorn.error")
app = FastAPI(docs_url=None, redoc_url=None)


def db():
    return sqlite3.connect(DATA / "library.sqlite", timeout=10)


with db() as conn:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS library(id TEXT PRIMARY KEY, revision INTEGER, title TEXT, score TEXT, updated TEXT);
    CREATE TABLE IF NOT EXISTS revisions(id TEXT, revision INTEGER, score TEXT, PRIMARY KEY(id,revision));
    INSERT OR IGNORE INTO revisions SELECT id,revision,score FROM library;
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, status TEXT, result TEXT);
    UPDATE jobs SET status='error',result='"Interrupted. Please import the source again."' WHERE status IN ('waiting','working');
    """)


@app.middleware("http")
async def local_only(req: Request, call_next):
    origin = req.headers.get("origin")
    if req.url.hostname not in ("127.0.0.1", "localhost", "::1") or (
        origin and urlsplit(origin).netloc != req.headers.get("host")
    ):
        return JSONResponse({"detail": "Open the local app address."}, status_code=403)
    response = await call_next(req)
    if "cache-control" not in response.headers and req.url.path.endswith((".html", ".js", ".css")):
        response.headers["Cache-Control"] = "no-cache"
    return response


def result(job, status, value):
    with db() as c:
        c.execute(
            "UPDATE jobs SET status=?,result=? WHERE id=?",
            (status, json.dumps(value), job),
        )


def enqueue(job, task):
    with db() as c:
        c.execute("INSERT INTO jobs VALUES(?,?,?)", (job, "waiting", '""'))

    def execute():
        result(job, "working", "")
        try:
            result(job, "ready", task())
        except Exception as exc:
            log.exception("Import %s failed", job)
            message = (
                str(exc)
                if isinstance(exc, ValueError)
                else "Conversion failed. Try a clearer source or a shorter segment. See the server log for details."
            )
            result(job, "error", message)

    worker.submit(execute)
    return {"job": job}


@app.get("/api/jobs/{job}")
def status(job: UUID):
    with db() as c:
        row = c.execute(
            "SELECT status,result FROM jobs WHERE id=?", (job.hex,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Job unavailable")
    return dict(status=row[0], result=json.loads(row[1]))


def clean(s):
    return "".join(
        c
        for c in unicodedata.normalize("NFKD", s.casefold().replace("’", "'"))
        if not unicodedata.combining(c)
    ).replace("_", " ")


@app.get("/api/search")
def search(q: str):
    if not q.strip():
        return []
    term = clean(q.strip())
    found = [
        row
        for row in starters.catalogue()
        if term in clean(" ".join(
            (row["title"], row["titleZh"], row["composer"], row["aliases"], row.get("focus", ""))
        ))
    ]
    for i, path in enumerate(CATALOG):
        author, book, title = (
            path.split("/")[1],
            path.split("/")[-3],
            path.split("/")[-2],
        )
        if clean(q.strip()) in clean(title + " " + author):
            found.append(
                dict(
                    id=i,
                    title=title.replace("_", " "),
                    composer=author.replace("_", " "),
                    collection=book.replace("_", " "),
                )
            )
        if len(found) >= 40:
            break
    return found


def read_mxl(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        manifest = ET.fromstring(z.read("META-INF/container.xml"))
        name = manifest.find(".//{*}rootfile").get("full-path")
        if z.getinfo(name).file_size > 32 * 1024 * 1024:
            raise ValueError("Score is too large.")
        return z.read(name)


def parts_result(folder, xml, base):
    path = folder / "score.musicxml"
    path.write_bytes(xml)
    parts = read_parts(path)
    if not parts:
        raise ValueError("No parts were recognized.")
    (folder / "metadata.json").write_text(json.dumps(base))
    return dict(
        asset=folder.name,
        parts=[p.partName or f"Part {i + 1}" for i, p in enumerate(parts)],
        **base,
    )


@app.post("/api/edition/{index}")
def edition(index: int):
    if not 0 <= index < len(CATALOG):
        raise HTTPException(404, "Edition unavailable")
    path = CATALOG[index]
    folder = DATA / uuid4().hex
    folder.mkdir()

    def convert():
        url = f"https://raw.githubusercontent.com/OpenScore/Lieder/{REV}/{quote(path)}"
        data = subprocess.run(
            ["curl", "-fsSL", "--retry", "2", "--max-time", "25", url],
            capture_output=True,
            check=True,
        ).stdout
        return parts_result(
            folder,
            read_mxl(data),
            dict(
                title=path.split("/")[-2].replace("_", " "),
                kind="catalogue",
                source="OpenScore Lieder · CC0",
                url=url,
            ),
        )

    return enqueue(folder.name, convert)


def pdf_subset(path, spec, folder):
    reader = PdfReader(path)
    pages = []
    if spec:
        for piece in spec.split(","):
            match = re.fullmatch(r"(\d+)(?:-(\d+))?", piece.strip())
            if not match:
                raise ValueError("Use page numbers such as 1 or 2-4.")
            a, b = int(match[1]), int(match[2] or match[1])
            if not 1 <= a <= b <= len(reader.pages) or b - a >= 12:
                raise ValueError("Page range does not fit the PDF or exceeds 12 pages.")
            pages.extend(range(a, b + 1))
    else:
        pages = list(range(1, len(reader.pages) + 1))
    pages = sorted(set(pages))
    if not 0 < len(pages) <= 12:
        raise ValueError("Choose up to 12 pages.")
    writer = PdfWriter()
    for p in pages:
        writer.add_page(reader.pages[p - 1])
    subset = folder / "pages.pdf"
    writer.write(subset)
    return subset, ", ".join(map(str, pages))


@app.post("/api/upload")
def upload(
    file: UploadFile = File(...),
    pages: str = Form(""),
    start: float = Form(0),
    end: float | None = Form(None),
    bpm: int | None = Form(None),
):
    name = Path(file.filename or "Untitled").name
    ext = Path(name).suffix.lower()
    images = {".png", ".jpg", ".jpeg"}
    audio = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
    if ext not in images | audio | {".pdf"}:
        raise HTTPException(
            400, "Choose PNG, JPEG, PDF, WAV, MP3, M4A, FLAC, OGG or AAC."
        )
    if bpm is not None and not 30 <= bpm <= 240:
        raise HTTPException(400, "Tempo must be 30–240 BPM.")
    folder = DATA / uuid4().hex
    folder.mkdir()
    path = folder / ("original" + ext)
    with path.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            if out.tell() + len(chunk) > 40 * 1024 * 1024:
                out.close()
                shutil.rmtree(folder)
                raise HTTPException(413, "Maximum upload is 40 MB.")
            out.write(chunk)
    base = dict(title=Path(name).stem, source=name, asset=folder.name)

    def convert():
        if ext in audio:
            from .transcribe import transcribe

            bars, tempo, notices = transcribe(path, folder, start, end, bpm)
            return dict(
                **base,
                kind="audio",
                part="Suggested melody",
                bars=bars,
                bpm=tempo,
                notices=notices,
            )
        exe = os.environ.get(
            "AUDIVERIS", str(ROOT / ".runtime/Audiveris.app/Contents/MacOS/Audiveris")
        )
        if not Path(exe).is_file():
            raise ValueError("Install Audiveris using INSTRUCTIONS.md and retry.")
        selected = path
        source = name
        if ext == ".pdf":
            selected, selection = pdf_subset(path, pages, folder)
            source += f" · pages {selection}"
        with (folder / "recognition.log").open("w") as out:
            run = subprocess.run(
                [
                    exe,
                    "-batch",
                    "-transcribe",
                    "-export",
                    "-output",
                    str(folder),
                    "--",
                    str(selected),
                ],
                stdout=out,
                stderr=subprocess.STDOUT,
                timeout=420,
            )
        scores = list(folder.rglob("*.mxl"))
        if run.returncode or not scores:
            raise ValueError(
                "No readable score found. Try a straight, well-lit crop of one staff or select fewer pages."
            )
        return parts_result(
            folder,
            read_mxl(scores[0].read_bytes()),
            dict(
                title=base["title"],
                source=source,
                kind="pdf" if ext == ".pdf" else "image",
            ),
        )

    return enqueue(folder.name, convert)


@app.get("/api/part/{asset}/{index}")
def part(asset: UUID, index: int):
    folder = DATA / asset.hex
    if not (folder / "metadata.json").exists():
        raise HTTPException(404, "Source unavailable")
    parts = read_parts(folder / "score.musicxml")
    if not 0 <= index < len(parts):
        raise HTTPException(400, "Select an available part")
    try:
        bars, tempo, notices = normalize(parts[index])
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    base = json.loads((folder / "metadata.json").read_text())
    if base["kind"] in ("image", "pdf"):
        notices += ["Recognition draft. Compare pitches and rhythms with the original."]
        for b in bars:
            if sum(n["ticks"] for n in b["events"]) != 96 * 4 * int(
                b["meter"].split("/")[0]
            ) / int(b["meter"].split("/")[1]):
                for n in b["events"]:
                    n["flag"] = "Check measure length or pickup"
    # A signature without a mode can represent either major or minor.
    from music21.key import KeySignature
    signatures = list(parts[index].recurse().getElementsByClass(KeySignature))
    keys = {(getattr(k, "mode", None), k.sharps) for k in signatures}
    key = None
    if len(keys) == 1:
        mode, fifths = keys.pop()
        if mode in ("major", "minor") and fifths is not None and -6 <= fifths <= 6:
            key = signatures[0].asKey(mode).tonic.name.replace("-", "b") + ("m" if mode == "minor" else "")
    return dict(
        **base,
        asset=asset.hex,
        part=parts[index].partName or f"Part {index + 1}",
        partIndex=index,
        key=key,
        parts=[p.partName or f"Part {i + 1}" for i, p in enumerate(parts)],
        bars=bars,
        bpm=tempo,
        notices=notices,
    )


@app.get("/api/source/{asset}")
def original(asset: UUID):
    folder = DATA / asset.hex
    files = list(folder.glob("original.*")) or list(folder.glob("score.musicxml"))
    if not files:
        raise HTTPException(404, "Source unavailable")
    return FileResponse(files[0])


@app.get("/api/clip/{asset}")
def audio_clip(asset: UUID):
    path = DATA / asset.hex / "clip.wav"
    if not path.is_file():
        raise HTTPException(404, "Recording unavailable")
    return FileResponse(path)


@app.get("/api/example")
def demo(piece: str = "starter"):
    try:
        return starters.load(piece)
    except KeyError:
        raise HTTPException(404, "Starter score unavailable")


@app.get("/api/starters")
def starter_editions():
    return starters.catalogue()


class Saved(BaseModel):
    id: UUID | None = None
    revision: int = 0
    score: dict


@app.post("/api/library")
def save(body: Saved):
    score = body.score
    title = str(score.get("title", "")).strip()[:200]
    if not title or not score.get("bars"):
        raise HTTPException(422, "A title and a score are required.")
    identity = body.id.hex if body.id else uuid4().hex
    revision = body.revision + 1
    encoded = json.dumps(score)
    with db() as c:
        if body.id:
            changed = c.execute(
                "UPDATE library SET revision=?,title=?,score=?,updated=CURRENT_TIMESTAMP WHERE id=? AND revision=?",
                (revision, title, encoded, identity, body.revision),
            )
            if not changed.rowcount:
                raise HTTPException(
                    409, "A newer save exists. Reopen the library copy before editing."
                )
        else:
            c.execute(
                "INSERT INTO library VALUES(?,?,?,?,CURRENT_TIMESTAMP)",
                (identity, revision, title, encoded),
            )
        c.execute("INSERT INTO revisions VALUES(?,?,?)", (identity, revision, encoded))
    return dict(id=identity, revision=revision)


@app.get("/api/library")
def library():
    with db() as c:
        return [
            dict(id=i, revision=r, title=t, updated=d,
                 titleZh=zh or (starters.CHINESE_TITLES.get(t) if kind == "example" else None))
            for i, r, t, d, zh, kind in c.execute(
                """SELECT id, revision, title, updated, json_extract(score, '$.titleZh'),
                          json_extract(score, '$.kind') FROM library ORDER BY updated DESC,rowid DESC"""
            )
        ]


@app.get("/api/library/{identity}")
def reopen(identity: UUID):
    with db() as c:
        row = c.execute(
            "SELECT score,revision FROM library WHERE id=?", (identity.hex,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Score unavailable")
    score = json.loads(row[0])
    if score.get("kind") == "example" and not score.get("titleZh"):
        score["titleZh"] = starters.CHINESE_TITLES.get(score["title"])
    return dict(score=score, revision=row[1], id=identity.hex)


@app.get("/vendor/abcjs.js")
def renderer():
    return Response(ui.assets["abcjs.js"], media_type="text/javascript")


@app.post("/api/pdf")
def export_pdf(score: dict, request: Request):
    port = request.scope["server"][1]
    try:
        pdf = subprocess.run(
            ["node", ROOT / "scripts/export.mjs", f"http://127.0.0.1:{port}"],
            input=json.dumps(score).encode(),
            capture_output=True,
            check=True,
            timeout=100,
        ).stdout
    except (subprocess.SubprocessError, OSError) as exc:
        log.exception("PDF export failed")
        raise HTTPException(
            503, "PDF export needs Chrome. Set CHROME_BIN and try again."
        ) from exc
    return Response(pdf, media_type="application/pdf")


app.include_router(ui.router)
app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="studio")
