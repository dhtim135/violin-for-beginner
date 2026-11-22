"""First-position violin editions from the digitized score of The Baby’s Opera."""

from functools import lru_cache
from pathlib import Path
from typing import NamedTuple
from zipfile import ZipFile

from music21 import converter, key as music_key

from .score import normalize


class Edition(NamedTuple):
    file: str
    title: str
    aliases: str
    shift: int  # Semitones from the printed upper staff to this violin edition.
    bpm: int  # Quarter notes per minute.
    focus: str


CREDIT = "Traditional · The Baby’s Opera"
SOURCE = (
    "https://github.com/GITenberg/The-Baby-s-Opera_25418/blob/"
    "ea0fe889d45029211d5d6d6f1b280e4766f54c80/25418-h/music/"
)
ARCHIVE = Path(__file__).resolve().parents[1] / "assets/babys-opera.zip"
EDITIONS = {
    "baa-baa-black-sheep": Edition("baabaa", "Baa, Baa, Black Sheep", "baa baa black sheep 黑绵羊", -9, 70, "Open G and D strings"),
    "mulberry-bush": Edition("mulberry", "Here We Go Round the Mulberry Bush", "桑树丛 桑樹叢", -2, 80, "Repeated notes in 6/8"),
    "hush-a-by-baby": Edition("hushaby", "Hush-a-by Baby", "hush a bye baby 摇篮曲 搖籃曲", -5, 64, "Dotted lullaby rhythm"),
}


@lru_cache(maxsize=len(EDITIONS))
def score(piece):
    edition = EDITIONS[piece]
    with ZipFile(ARCHIVE) as archive:
        xml = archive.read(edition.file + ".xml")
    source = converter.parseData(xml, format="musicxml")
    melody = source.parts[0]  # Upper staff of the original piano setting.
    key = melody.recurse().getElementsByClass(music_key.Key).first()
    arranged = melody.transpose(edition.shift)
    tonic = key.tonic.transpose(edition.shift).name.replace("-", "b")
    key_name = tonic + ("m" if key.mode == "minor" else "")
    bars, _, notices = normalize(arranged)
    notices.insert(0, "Upper-staff melody from the published piano setting. Accompaniment omitted.")
    if edition.shift:
        notices.append(f"Moved {edition.shift:+d} semitones from the printed {key.tonic.name} {key.mode} setting.")
    return dict(
        title=edition.title, source=f"{CREDIT} · violin arrangement in {tonic} {key.mode}",
        kind="example", part="Violin", key=key_name, bpm=edition.bpm,
        bars=bars, notices=notices, url=SOURCE + edition.file + ".pdf",
    )
