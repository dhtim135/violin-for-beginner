"""Serve the score page, print view and their matching browser assets."""

from hashlib import sha256
from html import escape
from itertools import groupby
from operator import itemgetter
import json
from pathlib import Path
from string import Template

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from music21.key import KeySignature

from . import starters

router = APIRouter()
ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
# Snapshot all relative module imports together with the stylesheet and renderer.
files = [*sorted(WEB.glob("*.js")), WEB / "style.css"]
assets = {path.name: path.read_bytes() for path in files}
renderer = ROOT / "node_modules/abcjs/dist/abcjs-basic-min.js"
# Include the upstream MIT notice in every browser copy of the renderer.
assets["abcjs.js"] = renderer.with_suffix(".js.LICENSE").read_bytes() + b"\n" + renderer.read_bytes()
digest = sha256()
for name, data in assets.items():
    digest.update(name.encode() + b"\0" + sha256(data).digest())
asset_path = "/ui/" + digest.hexdigest()[:16]
index_template = Template((WEB / "index.html").read_text())
print_template = Template((WEB / "print.html").read_text())
key_names = {
    mode: [
        KeySignature(fifths).asKey(mode).tonic.name.replace("-", "b")
        + ("m" if mode == "minor" else "")
        for fifths in range(-6, 7)
    ]
    for mode in ("major", "minor")
}


def key_label(key):
    tonic = key.removesuffix("m").replace("#", "♯").replace("b", "♭")
    return tonic + (" minor" if key.endswith("m") else " major")


@router.api_route(asset_path + "/{name}", methods=["GET", "HEAD"])
def asset(name: str):
    if name not in assets:
        raise HTTPException(404, "Unknown UI asset")
    return Response(
        assets[name],
        media_type="text/css" if name.endswith(".css") else "text/javascript",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


# A cached entry page from before asset versioning still imports /app.js.
@router.get("/app.js")
def upgrade_legacy_page():
    return Response(
        f'location.replace("/index.html?ui={digest.hexdigest()[:16]}");',
        media_type="text/javascript",
        headers={"Cache-Control": "no-store"},
    )


def title_markup(piece):
    return f'{escape(piece["title"])} <span lang="zh-Hans">{escape(piece["titleZh"])}</span>'


@router.api_route("/", methods=["GET", "HEAD"])
@router.api_route("/index.html", methods=["GET", "HEAD"])
def index(piece: str = "starter", key: str | None = None):
    try:
        score = starters.load(piece)
    except KeyError:
        raise HTTPException(404, "Starter score unavailable")
    source_key = score["key"]
    options = key_names["minor" if source_key.endswith("m") else "major"]
    if key is not None and key not in options:
        raise HTTPException(400, "Choose a key in the same mode as the piece")
    current = key or source_key
    groups = []
    for section, rows in groupby(starters.catalogue(), key=itemgetter("section")):
        buttons = "".join(
            f'<button class="sourceitem" name="piece" value="{escape(row["example"])}">'
            f'{title_markup(row)}<small>{escape(row.get("focus", row["composer"]))}</small></button>'
            for row in rows
        )
        groups.append(f'<fieldset><legend>{escape(section)}</legend>{buttons}</fieldset>')
    keys = "".join(
        f'<button name="key" value="{option}" aria-pressed="{str(option == current).lower()}">'
        f'{key_label(option)}</button>'
        for option in options
    )
    initial = json.dumps({"score": score, "key": current}).replace("<", "\\u003c")
    html = index_template.substitute(
        assets=asset_path,
        piece=escape(piece),
        title=title_markup(score),
        key_label=key_label(current),
        key_choices=keys,
        starter_choices="".join(groups),
        initial_score=initial,
    )
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


@router.api_route("/print.html", methods=["GET", "HEAD"])
def print_page():
    html = print_template.substitute(assets=asset_path)
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})
