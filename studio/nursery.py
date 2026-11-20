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
    "warm-hands": Edition("warmhands", "Warm Hands", "three notes 暖暖手 三个音", -5, 64, "Three pitches in four bars"),
    "dance-a-baby": Edition("danceababy", "Dance a Baby", "dance a baby diddy 宝宝跳舞", 4, 72, "Six notes in 6/8"),
    "tom-the-pipers-son": Edition("tom", "Tom, the Piper’s Son", "tom tom the piper's son 风笛手的儿子", 7, 66, "Short notes in 2/4"),
    "over-the-hills": Edition("overthehills", "Over the Hills and Far Away", "over the hills & far away 翻山越岭", 0, 72, "Dotted rhythms in G major"),
    "girls-and-boys": Edition("girls", "Girls and Boys Come Out to Play", "boys and girls come out to play 孩子们出来玩", 0, 76, "A lilting pulse in 6/8"),
    "puss-at-court": Edition("puss", "Puss at Court", "pussy cat where have you been 小猫进宫", -5, 72, "Lower-string melody in D major"),
    "my-pretty-maid": Edition("myprettymaid", "My Pretty Maid", "where are you going to 漂亮的姑娘", 0, 68, "Six pitches with dotted rhythms"),
    "natural-history": Edition("natural", "Natural History", "what are little boys made of 博物小调", -5, 76, "Moving between the lower strings"),
    "baa-baa-black-sheep": Edition("baabaa", "Baa, Baa, Black Sheep", "baa baa black sheep 黑绵羊", -9, 70, "Open G and D strings"),
    "little-bo-peep": Edition("bopeep", "Little Bo-Peep", "bo peep 小牧羊女", 4, 76, "Five notes on A and E"),
    "lavenders-blue": Edition("lavender", "Lavender’s Blue", "lavender's blue lavenders blue 薰衣草", -12, 60, "Low strings in 3/8"),
    "three-blind-mice": Edition("threeblindmice", "Three Blind Mice", "三只盲鼠 三隻盲鼠", 7, 76, "Descending notes and ties"),
    "hickory-dickory-dock": Edition("dickory", "Hickory Dickory Dock", "dickory dock 滴答钟 滴答鐘", 0, 76, "Tied notes in 6/8"),
    "mulberry-bush": Edition("mulberry", "Here We Go Round the Mulberry Bush", "桑树丛 桑樹叢", -2, 80, "Repeated notes in 6/8"),
    "jack-and-jill": Edition("jackandjill", "Jack and Jill", "杰克和吉尔 傑克和吉爾", 2, 76, "Crossing strings in 6/8"),
    "hush-a-by-baby": Edition("hushaby", "Hush-a-by Baby", "hush a bye baby 摇篮曲 搖籃曲", -5, 64, "Dotted lullaby rhythm"),
    "little-jack-horner": Edition("jackhorner", "Little Jack Horner", "小杰克 小傑克", 5, 72, "Holding notes through ties"),
    "oranges-and-lemons": Edition("oranges", "Oranges and Lemons", "oranges & lemons 橙子和柠檬", 0, 80, "A steady three-beat pulse"),
    "sing-a-song-of-sixpence": Edition("sixpence", "Sing a Song of Sixpence", "song of sixpence 六便士", 2, 76, "Pairs of eighth notes"),
    "ding-dong-bell": Edition("dingdong", "Ding Dong Bell", "叮咚钟 叮咚鐘", 0, 72, "Eighth-note triplets"),
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
