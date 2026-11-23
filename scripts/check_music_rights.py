"""Check the public music evidence register against Git objects, without importing app code."""

import argparse
import ast
from functools import lru_cache
import json
from pathlib import PurePosixPath
import re
import subprocess
import sys
from urllib.parse import urlsplit

REGISTER = "music-rights.json"
AUDIO = set(".wav .mp3 .m4a .aif .aiff .flac .ogg .opus .aac .wma .webm .mp4 .mov .mkv".split())
MEDIA = AUDIO | set(".abc .mid .midi .kar .musicxml .xml .mxl .mscz .mscx .mss .sib .musx .ly .mei .mml .gp .gp3 .gp4 .gp5 .gpx .pdf .png .jpg .jpeg .svg .gif .webp .zip .gz .7z .rar .tar".split())
CATALOGUES = {"studio/starters.py": "TUNES", "studio/nursery.py": "EDITIONS"}
# Also flag note strings or normalized scores in other source/data files.
NOTE_DATA = re.compile(rb"(?:\b[A-G][#b]?[2-7](?::[0-9/]+)?[ \t]+){3}[A-G][#b]?[2-7]\b")
ALLOWED = {"original", "public-domain", "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "written-permission"}


def git(*args):
    return subprocess.check_output(["git", *args])


@lru_cache(maxsize=256)
def blob(oid):
    return git("cat-file", "blob", oid)


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate register key {key!r}")
        result[key] = value
    return result


def tree(commit):
    paths = {}
    for item in git("ls-tree", "-rz", commit).split(b"\0"):
        if item:
            header, path = item.split(b"\t", 1)
            mode, _, oid = header.decode().split()
            paths[path.decode()] = (mode, oid)
    return paths


def needs_record(path, oid):
    name = PurePosixPath(path)
    if (path.startswith(("assets/", "samples/", "docs/media/", "output/"))
            or set(name.parts[:-1]) & {"songs", "scores", "music", "repertoire"}
            or path in CATALOGUES or path == "studio/score.py" or name.suffix.lower() in MEDIA):
        return True
    if name.suffix.lower() in {".py", ".js", ".json", ".ts", ".txt", ".yaml", ".yml"}:
        data = blob(oid)
        return bool(NOTE_DATA.search(data) or (b'"events"' in data and b'"pitch"' in data and name.suffix.lower() == ".json"))
    return False


def check_grant(grant, label, paths):
    if not isinstance(grant, dict) or grant.get("basis") not in ALLOWED:
        raise ValueError(f"{label}: missing or unsupported rights basis")
    if not isinstance(grant.get("reason"), str) or not grant["reason"].strip():
        raise ValueError(f"{label}: explain the basis for sharing and adapting this material")
    evidence = grant.get("evidence")
    if not isinstance(evidence, str):
        raise ValueError(f"{label}: missing evidence")
    if evidence.startswith("repo:"):
        if evidence[5:] not in paths:
            raise ValueError(f"{label}: evidence file does not exist in this revision")
    elif urlsplit(evidence).scheme != "https" or not urlsplit(evidence).hostname:
        raise ValueError(f"{label}: provide an HTTPS source or repo:path to evidence")


def catalogue_keys(path, oid):
    for stmt in ast.parse(blob(oid), path).body:
        if isinstance(stmt, ast.Assign) and any(isinstance(t, ast.Name) and t.id == CATALOGUES[path] for t in stmt.targets):
            if isinstance(stmt.value, ast.Dict):
                keys = [ast.literal_eval(k) for k in stmt.value.keys]
                if all(isinstance(k, str) for k in keys) and len(keys) == len(set(keys)):
                    return set(keys)
    raise ValueError(f"{path}: cannot verify catalogue IDs; update the rights checker")


def check(commit):
    paths = tree(commit)
    if REGISTER not in paths or paths[REGISTER][0] != "100644":
        raise ValueError(f"missing regular {REGISTER}")
    register = json.loads(blob(paths[REGISTER][1]), object_pairs_hook=unique_keys)
    works, files = register["works"], register["files"]
    if not isinstance(works, dict) or not isinstance(files, dict):
        raise ValueError("works and files must be objects")
    for key, work in works.items():
        if not all(isinstance(work.get(field), str) and work[field].strip() for field in ("title", "credit")):
            raise ValueError(f"{key}: supply a title and credit")
        for layer in ("composition", "edition"):
            check_grant(work.get(layer), f"{key}/{layer}", paths)
        if "recording" in work:
            check_grant(work["recording"], f"{key}/recording", paths)
    used = set()
    for path, (mode, oid) in paths.items():
        name = PurePosixPath(path.lower())
        if (set(name.parts) & {".data", ".runtime"} or name.name == "private-editions.json"
                or name.name.startswith("library.sqlite")):
            raise ValueError(f"{path!r}: local practice data cannot be published")
        if path == REGISTER:
            continue
        if path not in files and not needs_record(path, oid):
            continue
        if mode not in {"100644", "100755"}:
            raise ValueError(f"{path!r}: review the actual file, not a linked object")
        entry = files.get(path)
        if not isinstance(entry, dict) or entry.get("blob") != oid:
            raise ValueError(f"{path!r}: missing or stale rights record; review this version ({oid})")
        ids = entry.get("works")
        if not isinstance(ids, list) or not ids or len(ids) != len(set(ids)) or any(k not in works for k in ids):
            raise ValueError(f"{path!r}: name every covered work")
        if name.suffix in AUDIO and any("recording" not in works[k] for k in ids):
            raise ValueError(f"{path!r}: document performance and recording rights")
        if path == "studio/score.py" and "starter" not in ids:
            raise ValueError(f"{path}: missing record for the opening score")
        if path in CATALOGUES and catalogue_keys(path, oid) != set(ids):
            raise ValueError(f"{path}: work IDs must match the public catalogue entries")
        used.update(ids)
    if files.keys() - paths.keys() or works.keys() - used:
        raise ValueError("remove stale file or work records")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--base", help="check every commit introduced after this revision")
    args = parser.parse_args()
    head = git("rev-parse", "--verify", "--end-of-options", args.head + "^{commit}").decode().strip()
    commits = [head]
    if args.base:
        base = git("rev-parse", "--verify", "--end-of-options", args.base + "^{commit}").decode().strip()
        commits = git("rev-list", "--reverse", base + ".." + head).decode().splitlines() or [head]
    for commit in commits:
        try:
            check(commit)
        except (ValueError, KeyError, TypeError, AttributeError, SyntaxError) as error:
            sys.exit(f"Music rights check failed at {commit[:12]}: {error}")
    print(f"Music rights evidence checked in {len(commits)} revision(s). Maintainers verify the cited grants.")


if __name__ == "__main__":
    main()
