"""Turn a source part into a single, editable violin line. Durations are quarter-note ticks."""

from uuid import uuid4
from music21 import chord, converter, note, stream, repeat

TPQ = 96


def event(pitch, ticks, *, tie=False, flag=""):
    return dict(
        id=uuid4().hex, pitch=pitch, ticks=ticks, tie=tie, flag=flag, fingering=None
    )


def example():
    # Public-domain Twinkle melody in D major, in quarter notes.
    phrases = [
        [62, 62, 69, 69],
        [71, 71, 69],
        [67, 67, 66, 66],
        [64, 64, 62],
        [69, 69, 67, 67],
        [66, 66, 64],
        [69, 69, 67, 67],
        [66, 66, 64],
        [62, 62, 69, 69],
        [71, 71, 69],
        [67, 67, 66, 66],
        [64, 64, 62],
    ]
    bars = [
        dict(
            meter="4/4",
            events=[
                event(p, 192 if len(ps) == 3 and i == 2 else 96)
                for i, p in enumerate(ps)
            ],
        )
        for ps in phrases
    ]
    return dict(
        title="Twinkle, Twinkle, Little Star",
        key="D",
        source="Traditional · beginner arrangement in D major",
        bpm=88,
        bars=bars,
        notices=[],
        part="Violin",
        kind="example",
    )


def read_parts(path):
    score = converter.parse(str(path), forceSource=True)
    score = score.toSoundingPitch()
    return list(score.parts) or [score]


def normalize(part):
    notices = set()
    try:
        if part.recurse().getElementsByClass(repeat.RepeatExpression) or any(
            getattr(m.leftBarline, "direction", None)
            or getattr(m.rightBarline, "direction", None)
            for m in part.getElementsByClass(stream.Measure)
        ):
            part = part.expandRepeats()
            notices.add("Repeated sections are written out.")
    except Exception:
        notices.add("Repeat navigation needs review. Measures appear in source order.")
    bars = []
    meter = "4/4"
    for m in part.getElementsByClass(stream.Measure):
        if m.timeSignature:
            meter = m.timeSignature.ratioString
        sounds = []
        for obj in m.flatten().notes:
            if obj.duration.isGrace:
                notices.add("Grace notes omitted from the suggested line.")
                continue
            if not isinstance(obj, (note.Note, chord.Chord)):
                continue
            p = max(obj.pitches, key=lambda p: p.midi)
            begin = round(float(obj.offset) * TPQ)
            end = begin + round(float(obj.quarterLength) * TPQ)
            if end > begin:
                sounds.append(
                    (
                        begin,
                        end,
                        int(p.midi),
                        getattr(obj.tie, "type", "") in ("start", "continue"),
                    )
                )
        length = round(float(m.highestTime) * TPQ) or round(
            float(m.barDuration.quarterLength) * TPQ
        )
        if length <= 0:
            continue
        boundaries = sorted({0, length, *[v for item in sounds for v in item[:2]]})
        spans = []
        for a, b in zip(boundaries, boundaries[1:]):
            active = [s for s in sounds if s[0] <= a < s[1]]
            selected = max(active, key=lambda s: (s[2], s[0]), default=None)
            ambiguous = len(active) > 1
            if ambiguous:
                notices.add("Overlapping voices reduced to the upper sounding note.")
            if spans and spans[-1][0] == selected:
                spans[-1][1] += b - a
                spans[-1][2] |= ambiguous
            else:
                spans.append([selected, b - a, ambiguous])
        notes = [
            event(
                s[2] if s else None,
                ticks,
                tie=bool(s and s[3]),
                flag="Check overlapping voices" if amb else "",
            )
            for s, ticks, amb in spans
        ]
        bars.append(dict(meter=meter, events=notes))
    if not any(n["pitch"] is not None for b in bars for n in b["events"]):
        raise ValueError(
            "This part contains no readable pitched notes. Try another part."
        )
    marks = part.metronomeMarkBoundaries()
    tempo = marks[0][2].getQuarterBPM() if marks else 90
    if len(marks) > 1:
        notices.add("Using one demonstration tempo throughout.")
    return bars, round(tempo or 90), sorted(notices)


def four_strings():
    bars = [[55, 62, 69, 76], [78, 81, 83], [71, 72, 73, 74], [74, 72, 71]]
    return dict(
        title="Four strings",
        key="G",
        source="Stringbook · original first-position study",
        part="Violin",
        kind="example",
        bpm=76,
        notices=[],
        bars=[
            dict(
                meter="4/4",
                events=[
                    event(p, 192 if len(ps) == 3 and i == 2 else 96)
                    for i, p in enumerate(ps)
                ],
            )
            for ps in bars
        ],
    )
