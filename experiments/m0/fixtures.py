"""Original two-bar phrases. Durations are eighth-note units in 4/4."""

import xml.etree.ElementTree as ET
from pathlib import Path

WORK = Path(__file__).resolve().parent / ".work"
PHRASES = {
    "crossings": [
        ("G3", 2),
        ("D4", 2),
        ("A4", 2),
        ("E5", 2),
        ("F#5", 2),
        ("A5", 2),
        ("B5", 4),
    ],
    "placement": [
        ("B4", 2),
        ("C5", 2),
        ("C#5", 2),
        ("D5", 2),
        ("D5", 2),
        ("C5", 2),
        ("B4", 4),
    ],
    "rhythm": [
        ("D4", 3),
        ("E4", 1),
        ("rest", 2),
        ("G4", 2),
        ("A4", 1),
        ("B4", 1),
        ("A4", 2),
        ("D4", 4),
    ],
    "low": [
        ("G3", 4),
        ("A3", 2),
        ("B3", 2),
        ("C4", 2),
        ("B3", 2),
        ("A3", 2),
        ("G3", 2),
    ],
}
# Hand-authored reference labels for testing layout, not a fingering algorithm.
LABELS = dict(
    zip(
        [
            "G3",
            "A3",
            "B3",
            "C4",
            "D4",
            "E4",
            "G4",
            "A4",
            "B4",
            "C5",
            "C#5",
            "D5",
            "E5",
            "F#5",
            "A5",
            "B5",
        ],
        [
            "G",
            "G1",
            "G2(high)",
            "G3",
            "D",
            "D1",
            "D3",
            "A",
            "A1",
            "A2(low)",
            "A2(high)",
            "A3",
            "E",
            "E1",
            "E3",
            "E4",
        ],
    )
)


def midi(pitch):
    return (
        12 * (int(pitch[-1]) + 1)
        + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[pitch[0]]
        + ("#" in pitch)
    )


def write_score(title, events, annotated):
    root = ET.fromstring(
        '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list><part id="P1"/></score-partwise>'
    )
    elapsed = 0
    for pitch, duration in events:
        if elapsed % 8 == 0:
            measure = ET.SubElement(
                root.find("part"), "measure", number=str(1 + elapsed // 8)
            )
            if not elapsed:
                measure.append(
                    ET.fromstring(
                        "<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>"
                    )
                )
        note = ET.SubElement(measure, "note")
        if pitch == "rest":
            ET.SubElement(note, "rest")
        else:
            p = ET.SubElement(note, "pitch")
            ET.SubElement(p, "step").text = pitch[0]
            if "#" in pitch:
                ET.SubElement(p, "alter").text = "1"
            ET.SubElement(p, "octave").text = pitch[-1]
        ET.SubElement(note, "duration").text = str(duration)
        ET.SubElement(note, "type").text = {
            1: "eighth",
            2: "quarter",
            3: "quarter",
            4: "half",
        }[duration]
        if duration == 3:
            ET.SubElement(note, "dot")
        if pitch != "rest" and annotated:
            ET.SubElement(ET.SubElement(note, "lyric"), "text").text = LABELS[pitch]
        elapsed += duration
    ET.ElementTree(root).write(WORK / f"{title}.musicxml", encoding="utf-8")


if __name__ == "__main__":
    WORK.mkdir(exist_ok=True)
    for title, events in PHRASES.items():
        write_score(title, events, False)
    write_score("annotated", PHRASES["crossings"] + PHRASES["placement"], True)
