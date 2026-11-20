"""Measure melody recovery on phrases synthesized at known tempo and starting beat."""

import json
from subprocess import run
from time import monotonic

import numpy as np
import soundfile as sf
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import Model, predict

from fixtures import PHRASES, WORK, midi

RATE = 22050
UNIT = 0.30
SAMPLES = {
    "G3": 55,
    "A3": 57,
    "C4": 60,
    "E4": 64,
    "G4": 67,
    "A4": 69,
    "C5": 72,
    "E5": 76,
    "G5": 79,
    "A5": 81,
}
SOURCE = "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/622c2f1c32c8cfce4158ddc3eb26e518ddef37e5/samples/violin"


def load_samples():
    samples = {}
    for name, pitch in SAMPLES.items():
        path = WORK / f"{name}.mp3"
        if not path.exists():
            run(
                ["curl", "-fsSL", "--retry", "2", f"{SOURCE}/{name}.mp3", "-o", path],
                check=True,
            )
        signal = run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                path,
                "-ar",
                str(RATE),
                "-ac",
                "1",
                "-f",
                "f32le",
                "-",
            ],
            capture_output=True,
            check=True,
        )
        samples[pitch] = np.frombuffer(signal.stdout, dtype="float32")
    return samples


def make_clip(events, samples, accompanied):
    ref = []
    chunks = [np.zeros(round(UNIT * RATE))]
    beat = 1
    for note, duration in events:
        count = round(duration * UNIT * RATE)
        signal = np.zeros(count)
        if note != "rest":
            pitch = midi(note)
            nearest = min(samples, key=lambda p: abs(p - pitch))
            idx = np.arange(count) * 2 ** ((pitch - nearest) / 12)
            signal = np.interp(
                idx, np.arange(len(samples[nearest])), samples[nearest], right=0
            )
            signal /= max(np.max(np.abs(signal)), 0.01)
            # Separate adjacent attacks with a short release.
            release = round(0.04 * RATE)
            signal[-release:] *= np.linspace(1, 0, release)
            ref.append((beat, pitch, duration))
        if accompanied:
            t = (np.arange(count) + round(beat * UNIT * RATE)) / RATE
            signal += sum(
                0.23 * np.sin(2 * np.pi * f * t) for f in [146.83, 220, 293.66]
            )
        chunks.append(signal)
        beat += duration
    return np.concatenate([*chunks, np.zeros(RATE // 2)]) * 0.45, ref


def run_benchmark():
    samples = load_samples()
    model = Model(ICASSP_2022_MODEL_PATH)
    rows = []
    for title, events in PHRASES.items():
        for accompanied in [False, True]:
            audio, expected = make_clip(events, samples, accompanied)
            path = WORK / (title + ("-mix" if accompanied else "-solo") + ".wav")
            sf.write(path, audio, RATE)
            start = monotonic()
            _, _, notes = predict(path, model)
            # Known beat grid baseline. Highest pitch at each detected attack.
            by_beat = {}
            for onset, end, pitch, *_ in notes:
                beat = round(onset / UNIT)
                duration = max(1, round(end / UNIT) - beat)
                if beat not in by_beat or pitch > by_beat[beat][0]:
                    by_beat[beat] = (int(pitch), duration)
            actual = {(beat, *value) for beat, value in by_beat.items()}
            hits = sum(
                (beat, pitch) in {(b, p) for b, p, d in actual}
                for beat, pitch, d in expected
            )
            rows.append(
                {
                    "input": path.name,
                    "expected": len(expected),
                    "suggested": len(actual),
                    "pitch_onset_hits": hits,
                    "duration_also_correct": len(actual.intersection(expected)),
                    "seconds": round(monotonic() - start, 2),
                }
            )
            print(rows[-1], flush=True)
            (WORK / "audio-results.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    run_benchmark()
