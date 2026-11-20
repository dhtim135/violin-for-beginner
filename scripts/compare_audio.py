"""Reproduce the audio quality comparison using M0's five paired Bach10 recordings."""

import json
import io
import tempfile
from pathlib import Path
import numpy as np
import librosa
from scipy.io import loadmat
from basic_pitch.inference import predict, Model
from basic_pitch import ICASSP_2022_MODEL_PATH
from studio.transcribe import select_line, SLOTS_PER_BEAT
from urllib.request import urlopen

BASE = "https://raw.githubusercontent.com/flippy-fyp/Bach10_v1.1/2a53cdc6495bb82f03f943b77ca3b11ddf7f5a31"
CACHE = Path("experiments/m0/.work")
PIECES = [
    "01-AchGottundHerr",
    "02-AchLiebenChristen",
    "03-ChristederdubistTagundLicht",
    "04-ChristeDuBeistand",
    "05-DieNacht",
]


def main():
    model = Model(ICASSP_2022_MODEL_PATH)
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for piece in PIECES:
            prefix = f"{BASE}/{piece}/{piece}"
            with urlopen(prefix + "-GTNotes.mat", timeout=30) as resp:
                curves = loadmat(io.BytesIO(resp.read()))["GTNotes"][0, 0].ravel()
            ref = [
                (0.023 + (n[0, 0] - 1) * 0.01, round(np.median(n[1]))) for n in curves
            ]
            for suffix in ["-violin.wav", ".wav"]:
                path = CACHE / (piece + suffix)
                if not path.exists():
                    path = Path(tmp) / (piece + suffix)
                    with urlopen(prefix + suffix, timeout=30) as resp:
                        path.write_bytes(resp.read())
                _, _, pred = predict(path, model)
                notes = [
                    (a, b, int(p), float(v))
                    for a, b, p, v, *_ in pred
                    if b > a and 36 <= p <= 103
                ]
                y, sr = librosa.load(path)
                tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
                bpm = round(float(np.asarray(tempo).reshape(-1)[0])) or 90
                t, spans = select_line(notes, bpm)
                count = hits = 0
                used = set()
                for n, size in spans:
                    if n:
                        count += 1
                        candidates = [
                            (abs(t - onset), i)
                            for i, (onset, p) in enumerate(ref)
                            if i not in used and n[2] == p and abs(t - onset) <= 0.1
                        ]
                        if candidates:
                            used.add(min(candidates)[1])
                            hits += 1
                    t += size * 60 / bpm / SLOTS_PER_BEAT
                rows.append(
                    dict(
                        file=path.name,
                        bpm=bpm,
                        reference=len(ref),
                        suggested=count,
                        matched=hits,
                    )
                )
    print(json.dumps(rows, indent=2))
    Path(".runtime/audio-comparison.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
