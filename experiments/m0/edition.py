"""Compare the vocal staff of eight engraved bars with its public source edition."""

import io
import json
import os
import subprocess
import xml.etree.ElementTree as ET
from time import monotonic

from fixtures import WORK
from omr import read_part, unpack
from search import fetch


def main():
    catalogue = json.loads((WORK / "search-results.json").read_text())
    rows = []
    for i, candidate in enumerate(catalogue["results"]):
        if "source" not in candidate:
            continue
        name = f"edition-{i}"
        root = unpack(io.BytesIO(fetch(candidate["source"])))
        for part in root.findall("part"):
            for bar in part.findall("measure")[8:]:
                part.remove(bar)
        expected = read_part(root.find("part"))
        ET.ElementTree(root).write(WORK / f"{name}.musicxml", encoding="utf-8")
        subprocess.run(["node", "render.mjs", name], check=True)
        out = WORK / "omr" / name
        out.mkdir(parents=True, exist_ok=True)
        engine = os.environ.get(
            "AUDIVERIS", str(WORK / "mount/Audiveris.app/Contents/MacOS/Audiveris")
        )
        start = monotonic()
        with (out / "log.txt").open("w") as log:
            result = subprocess.run(
                [
                    engine,
                    "-batch",
                    "-transcribe",
                    "-export",
                    "-output",
                    out,
                    "--",
                    WORK / f"{name}.pdf",
                ],
                stdout=log,
                stderr=subprocess.STDOUT,
                timeout=180,
                check=False,
            )
        outputs = list(out.rglob("*.mxl"))
        row = {
            "piece": candidate["query"],
            "exit": result.returncode,
            "seconds": round(monotonic() - start, 2),
            "expected_events": len(expected),
        }
        if result.returncode == 0 and outputs:
            from difflib import SequenceMatcher

            actual_root = unpack(outputs[0])
            actual = read_part(actual_root.find("part"))
            row.update(
                parts=len(actual_root.findall("part")),
                returned_events=len(actual),
                exact=actual == expected,
                matched=sum(
                    b.size
                    for b in SequenceMatcher(
                        None, expected, actual
                    ).get_matching_blocks()
                ),
            )
        rows.append(row)
        print(row, flush=True)
        (WORK / "edition-results.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
