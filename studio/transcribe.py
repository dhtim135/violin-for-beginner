"""Select a predominant line on a metrical grid from overlapping detected notes."""

import subprocess
import numpy as np
import librosa
from basic_pitch.inference import predict
from .score import event

SLOTS_PER_BEAT = 4


def transcribe(source, folder, start, end, requested_bpm):
    length = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(source),
            ],
            timeout=20,
        )
    )
    end = length if end is None else min(length, end)
    if not 0 <= start < end or end - start > 180.1:
        raise ValueError("Choose an audio segment between 0 and 180 seconds long.")
    clip = folder / "clip.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-ss",
            str(start),
            "-i",
            str(source),
            "-t",
            str(end - start),
            "-ar",
            "22050",
            "-ac",
            "1",
            str(clip),
        ],
        check=True,
        timeout=90,
    )
    _, _, detected = predict(clip)
    notes = [
        (a, b, int(p), float(v))
        for a, b, p, v, *_ in detected
        if b > a and 36 <= p <= 103
    ]
    if not notes:
        raise ValueError(
            "No clear melody detected. Try a louder or more isolated passage."
        )
    if requested_bpm:
        bpm = requested_bpm
    else:
        y, sr = librosa.load(str(clip))
        estimate, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = round(float(np.asarray(estimate).reshape(-1)[0])) or 90
    _, spans = select_line(notes, bpm)
    bars = []
    count = 0
    for chosen, size in spans:
        while size:
            if count % (4 * SLOTS_PER_BEAT) == 0:
                bars.append(dict(meter="4/4", events=[]))
            take = min(size, 4 * SLOTS_PER_BEAT - count % (4 * SLOTS_PER_BEAT))
            bars[-1]["events"].append(
                event(
                    chosen[2] if chosen else None,
                    (96 // SLOTS_PER_BEAT) * take,
                    tie=bool(chosen and take < size),
                    flag="Check pitch and rhythm against recording" if chosen else "",
                )
            )
            count += take
            size -= take
    return (
        bars,
        bpm,
        [
            f"Suggested melody · {start:g}–{end:.1f} s. Sixteenth-note grid in 4/4, first detected attack on beat one. Check against the recording."
        ],
    )


def select_line(notes, bpm):
    step = 60 / bpm / SLOTS_PER_BEAT
    origin = min(n[0] for n in notes)
    slots = max(1, round((max(n[1] for n in notes) - origin) / step))
    spans = []
    last_pitch = None
    for i in range(slots):
        a = origin + i * step
        active = [n for n in notes if min(n[1], a + step) - max(n[0], a) > step * 0.25]

        def rank(n):
            overlap = (min(n[1], a + step) - max(n[0], a)) / step
            continuity = min(abs(n[2] - last_pitch), 16) if last_pitch else 0
            return overlap * 0.35 + n[3] + (n[2] - 60) * 0.017 - continuity * 0.014

        chosen = max(active, key=rank, default=None)
        last_pitch = chosen[2] if chosen else None
        if spans and spans[-1][0] == chosen:
            spans[-1][1] += 1
        else:
            spans.append([chosen, 1])
    return origin, spans
