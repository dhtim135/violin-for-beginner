"""Evaluate a simple upper-voice suggestion against Bach10's violin annotations."""

import io
import json
from time import monotonic

import numpy as np
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import Model, predict
from scipy.io import loadmat

from fixtures import WORK
from search import fetch

BASE = "https://raw.githubusercontent.com/flippy-fyp/Bach10_v1.1/2a53cdc6495bb82f03f943b77ca3b11ddf7f5a31"
PIECES = [
    "01-AchGottundHerr",
    "02-AchLiebenChristen",
    "03-ChristederdubistTagundLicht",
    "04-ChristeDuBeistand",
    "05-DieNacht",
]


def evaluate(notes, ref):
    # Retain the upper note of attacks that are within 60 ms of the first attack.
    groups = []
    for onset, end, pitch, *_ in sorted(notes):
        if not groups or onset - groups[-1][0][0] > 0.06:
            groups.append([])
        groups[-1].append((onset, end, pitch))
    suggestion = [max(g, key=lambda n: n[2]) for g in groups]
    used = set()
    hits = 0
    duration_hits = 0
    for onset, end, pitch in suggestion:
        candidates = [
            (abs(onset - start), i)
            for i, (start, stop, p) in enumerate(ref)
            if i not in used and p == pitch and abs(onset - start) <= 0.1
        ]
        if candidates:
            _, i = min(candidates)
            used.add(i)
            hits += 1
            duration_hits += int(abs(end - ref[i][1]) <= 0.15)
    return {
        "expected": len(ref),
        "suggested": len(suggestion),
        "pitch_onset_hits": hits,
        "offset_also_correct": duration_hits,
    }


def main():
    model = Model(ICASSP_2022_MODEL_PATH)
    rows = []
    for piece in PIECES:
        prefix = f"{BASE}/{piece}/{piece}"
        curves = loadmat(io.BytesIO(fetch(prefix + "-GTNotes.mat")))["GTNotes"][
            0, 0
        ].ravel()
        ref = [
            (
                0.023 + (n[0, 0] - 1) * 0.01,
                0.023 + (n[0, -1] - 1) * 0.01,
                round(np.median(n[1])),
            )
            for n in curves
        ]
        for suffix in ["-violin.wav", ".wav"]:
            path = WORK / (piece + suffix)
            if not path.exists():
                path.write_bytes(fetch(prefix + suffix))
            start = monotonic()
            _, _, notes = predict(path, model)
            rows.append(
                dict(
                    input=path.name,
                    seconds=round(monotonic() - start, 2),
                    **evaluate(notes, ref),
                )
            )
            print(rows[-1], flush=True)
            (WORK / "recording-results.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
