"""Turn a source part into a single, editable violin line. Durations are quarter-note ticks."""

from uuid import uuid4
from music21 import articulations, chord, converter, instrument, note, repeat, spanner, stream

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
    line = []
    source_indices = {}
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
                        obj,
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
        notes = []
        for sound, ticks, ambiguous in spans:
            item = event(
                sound[2] if sound else None, ticks,
                tie=bool(sound and sound[3]),
                flag="Check overlapping voices" if ambiguous else "",
            )
            if sound:
                obj = sound[4]
                source_indices[id(obj)] = len(line)
                for mark in obj.articulations:
                    if isinstance(mark, (articulations.UpBow, articulations.DownBow)):
                        item["sourceBow"] = "up" if isinstance(mark, articulations.UpBow) else "down"
            line.append(item)
            notes.append(item)
        bars.append(dict(meter=meter, events=notes))
    if not any(n["pitch"] is not None for b in bars for n in b["events"]):
        raise ValueError(
            "This part contains no readable pitched notes. Try another part."
        )
    # On a bowed string part a simple slur suggests one stroke. Vocal and
    # keyboard phrase marks have a different meaning in a violin arrangement.
    bowed_strings = (instrument.Violin, instrument.Viola, instrument.Violoncello, instrument.Contrabass)
    if isinstance(part.getInstrument(returnDefault=False), bowed_strings):
        for slur in part.recurse().getElementsByClass(spanner.Slur):
            start = source_indices.get(id(slur.getFirst()))
            end = source_indices.get(id(slur.getLast()))
            if start is None or end is None or start >= end:
                continue
            section = line[start:end + 1]
            if any(item["pitch"] is None or item["flag"] for item in section):
                notices.add("Check source slurs across rests or overlapping voices.")
                continue
            for prev, item in zip(section, section[1:]):
                item["sourceJoin"] = prev["id"]
    marks = part.metronomeMarkBoundaries()
    tempo = marks[0][2].getQuarterBPM() if marks else 90
    if len(marks) > 1:
        notices.add("Using one demonstration tempo throughout.")
    return bars, round(tempo or 90), sorted(notices)
