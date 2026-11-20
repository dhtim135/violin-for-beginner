"""Search a pinned public score catalogue and verify the selected edition contains notes."""

import argparse
import io
import json
import subprocess
import unicodedata
from pathlib import PurePosixPath
from urllib.parse import quote

from fixtures import WORK
from omr import unpack

REV = "38c5db510224d9facdc4b08d741fc788cfb58ea8"
REPO = "OpenScore/Lieder"


def fetch(url):
    return subprocess.run(
        ["curl", "-fsSL", "--retry", "2", "--max-time", "30", url],
        capture_output=True,
        check=True,
    ).stdout


def normalized(value):
    return "".join(
        c
        for c in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(c)
    ).replace("_", " ")


def lookup(paths, query):
    return [
        path
        for path in paths
        if normalized(query) in normalized(PurePosixPath(path).parent.name)
    ]


def inspect(path):
    url = f"https://raw.githubusercontent.com/{REPO}/{REV}/{quote(path)}"
    root = unpack(io.BytesIO(fetch(url)))
    parts = {
        p.get("id"): p.findtext("part-name")
        for p in root.findall("part-list/score-part")
    }
    return {
        "source": url,
        "credit": "OpenScore Lieder (CC0)",
        "parts": parts,
        "notes": len(root.findall(".//note/pitch")),
        "measures": len(root.findall("part/measure")),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "queries",
        nargs="*",
        default=["Just for Today", "Crazy Jane", "Die Forelle", "zzzz-no-such-title"],
    )
    parser.add_argument(
        "--pick", type=int, default=1, help="one-based index of edition to retrieve"
    )
    args = parser.parse_args()
    tree = json.loads(
        fetch(f"https://api.github.com/repos/{REPO}/git/trees/{REV}?recursive=1")
    )
    if tree["truncated"]:
        raise RuntimeError("Incomplete source catalogue")
    paths = sorted(x["path"] for x in tree["tree"] if x["path"].endswith(".mxl"))
    results = []
    for query in args.queries:
        matches = lookup(paths, query)
        row = {"query": query, "matches": matches}
        if matches:
            if not 1 <= args.pick <= len(matches):
                parser.error(f"Choose an edition from 1 through {len(matches)}")
            row.update(inspect(matches[args.pick - 1]))
        results.append(row)
    result = json.dumps(
        {"catalogue_size": len(paths), "results": results}, indent=2, ensure_ascii=False
    )
    print(result)
    WORK.mkdir(exist_ok=True)
    (WORK / "search-results.json").write_text(result)


if __name__ == "__main__":
    main()
