"""Exercise three acquisition variants per phrase and compare complete note/rest sequences."""

import json
import os
import subprocess
import time
import xml.etree.ElementTree as ET
import zipfile
from difflib import SequenceMatcher
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageFilter

from fixtures import PHRASES, WORK


def read_part(part):
    events = []
    for measure in part.findall("measure"):
        if measure.find("attributes/divisions") is not None:
            divisions = int(measure.findtext("attributes/divisions"))
        for n in measure.findall("note"):
            p = n.find("pitch")
            pitch = (
                "rest"
                if p is None
                else p.findtext("step")
                + {"0": "", "1": "#", "-1": "b"}.get(p.findtext("alter", "0"), "?")
                + p.findtext("octave")
            )
            units = 0 if n.find("grace") is not None else int(n.findtext("duration"))
            events.append((pitch, Fraction(2 * units, divisions)))
    return events


def unpack(data):
    with zipfile.ZipFile(data) as archive:
        manifest = ET.fromstring(archive.read("META-INF/container.xml"))
        path = manifest.find(".//{*}rootfile").get("full-path")
        return ET.fromstring(archive.read(path))


def run():
    engine = os.environ.get(
        "AUDIVERIS", str(WORK / "mount/Audiveris.app/Contents/MacOS/Audiveris")
    )
    inputs = []
    for name in PHRASES:
        base = WORK / name
        subprocess.run(
            [
                "pdftoppm",
                "-r",
                "220",
                "-png",
                "-singlefile",
                base.with_suffix(".pdf"),
                str(base) + "-scan",
            ],
            check=True,
        )
        scan = Path(str(base) + "-scan.png")
        with Image.open(scan) as image:
            image.rotate(
                2, resample=Image.Resampling.BICUBIC, fillcolor="white"
            ).filter(ImageFilter.GaussianBlur(0.8)).save(
                str(base) + "-skew.jpg", quality=65
            )
        inputs.extend([base.with_suffix(".pdf"), scan, Path(str(base) + "-skew.jpg")])
    out = WORK / "omr"
    out.mkdir(exist_ok=True)
    rows = []
    for path in inputs:
        start = time.monotonic()
        job = out / path.stem
        job.mkdir(exist_ok=True)
        with (job / "log.txt").open("w") as log:
            result = subprocess.run(
                [
                    engine,
                    "-batch",
                    "-transcribe",
                    "-export",
                    "-output",
                    job,
                    "--",
                    path,
                ],
                stdout=log,
                stderr=subprocess.STDOUT,
                timeout=180,
                check=False,
            )
        expected = PHRASES[path.stem.split("-")[0]]
        rows.append(
            row := {
                "input": path.name,
                "seconds": round(time.monotonic() - start, 2),
                "exit": result.returncode,
            }
        )
        outputs = list(job.rglob("*.mxl"))
        if result.returncode == 0 and outputs:
            root = unpack(outputs[0])
            actual = read_part(root.find("part"))
            row.update(
                expected=len(expected),
                actual=len(actual),
                exact=expected == actual,
                matched=sum(
                    block.size
                    for block in SequenceMatcher(
                        None, expected, actual
                    ).get_matching_blocks()
                ),
            )
        print(row, flush=True)
        (WORK / "omr-results.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    run()
