"""Offline editions. Each bar uses scientific pitch names with optional beat lengths."""

import json
import os
from copy import deepcopy
from pathlib import Path
from fractions import Fraction
from unicodedata import combining, normalize

from music21.pitch import Pitch

from . import nursery
from .score import TPQ, event, example

# Optional, user-owned practice editions live alongside the local library.
_data_dir = Path(os.environ.get("VIOLIN_DATA", Path(__file__).resolve().parents[1] / ".data"))
_private_file = _data_dir / "private-editions.json"
PRIVATE = json.loads(_private_file.read_text()) if _private_file.is_file() else {}

# Preserve title translations for older saved arrangements as well as current pieces.
# Display names in Simplified Chinese. Search aliases can include other names
# for the same tune, transliterations and names in Traditional Chinese.
CHINESE_TITLES = {
    "Twinkle, Twinkle, Little Star": "小星星",
    "Four strings": "四根弦练习曲",
    "Warm Hands": "暖暖手",
    "Dance a Baby": "宝宝跳舞",
    "Tom, the Piper’s Son": "风笛手的儿子汤姆",
    "Over the Hills and Far Away": "翻山越岭去远方",
    "Girls and Boys Come Out to Play": "孩子们，出来玩吧",
    "Puss at Court": "小猫进宫",
    "My Pretty Maid": "漂亮的姑娘",
    "Natural History": "博物小调",
    "Pixel Parade": "像素游行",
    "New World Symphony · Largo": "《新世界交响曲》广板",
    "Row, Row, Row Your Boat": "划船歌",
    "Hot Cross Buns": "热十字面包",
    "Mary Had a Little Lamb": "玛丽有只小羊羔",
    "Frère Jacques": "两只老虎",
    "Ode to Joy": "欢乐颂",
    "London Bridge Is Falling Down": "伦敦桥要塌了",
    "Jingle Bells": "铃儿响叮当",
    "Baa, Baa, Black Sheep": "咩咩黑绵羊",
    "Little Bo-Peep": "小牧羊女",
    "Lavender’s Blue": "蓝色的薰衣草",
    "Three Blind Mice": "三只盲鼠",
    "Hickory Dickory Dock": "滴答钟",
    "Here We Go Round the Mulberry Bush": "我们绕着桑树转",
    "Jack and Jill": "杰克和吉尔",
    "Hush-a-by Baby": "宝宝摇篮曲",
    "Little Jack Horner": "小杰克·霍纳",
    "Oranges and Lemons": "橙子和柠檬",
    "Sing a Song of Sixpence": "六便士之歌",
    "Ding Dong Bell": "叮咚钟",
    **{e["row"]["title"]: e["row"]["titleZh"] for e in PRIVATE.values()},
}

# These are Stringbook arrangements; pitches below describe sound, never fingering.
TUNES = {
    "row-your-boat": (
        "Row, Row, Row Your Boat",
        "Traditional round · even-beat beginner version",
        "划船歌 划小船",
        "G",
        82,
        "G4 G4 G4:3/4 A4:1/4 B4 | B4:3/4 A4:1/4 B4:3/4 C5:1/4 D5:2 | "
        "G5:1/4 G5:1/4 G5:1/2 D5:1/4 D5:1/4 D5:1/2 B4:1/4 B4:1/4 B4:1/2 G4:1/4 G4:1/4 G4:1/2 | D5 C5 B4:1/2 A4:1/2 G4",
    ),
    "frere-jacques": (
        "Frère Jacques",
        "Traditional French round",
        "两只老虎 兩隻老虎 Brother John",
        "D",
        84,
        "D4 E4 F#4 D4 | D4 E4 F#4 D4 | F#4 G4 A4:2 | F#4 G4 A4:2 | "
        "A4:1/2 B4:1/2 A4:1/2 G4:1/2 F#4 D4 | A4:1/2 B4:1/2 A4:1/2 G4:1/2 F#4 D4 | D4 A3 D4:2 | D4 A3 D4:2",
    ),
    "jingle-bells": (
        "Jingle Bells",
        "James Lord Pierpont · refrain",
        "铃儿响叮当 鈴兒響叮噹",
        "G",
        90,
        "B4 B4 B4:2 | B4 B4 B4:2 | B4 D5 G4:3/2 A4:1/2 | B4:4 | "
        "C5 C5 C5:3/2 C5:1/2 | C5 B4 B4 B4:1/2 B4:1/2 | B4 A4 A4 B4 | A4:2 D5:2 | "
        "B4 B4 B4:2 | B4 B4 B4:2 | B4 D5 G4:3/2 A4:1/2 | B4:4 | "
        "C5 C5 C5:3/2 C5:1/2 | C5 B4 B4 B4:1/2 B4:1/2 | D5 D5 C5 A4 | G4:4",
    ),
}


def catalogue():
    rows = [
        (
            "starter",
            "Twinkle, Twinkle, Little Star",
            "Traditional",
            "Twinkle little star 小星星",
        ),
    ]
    rows.extend(
        (key, title, source, aliases)
        for key, (title, source, aliases, *_) in TUNES.items()
    )
    pieces = [
        dict(example=key, title=title, composer=source, aliases=aliases)
        for key, title, source, aliases in rows
    ]
    pieces.extend(
        dict(example=slug, title=edition.title, composer=nursery.CREDIT,
             aliases=edition.aliases, focus=edition.focus)
        for slug, edition in nursery.EDITIONS.items()
    )
    for piece in pieces:
        piece["titleZh"] = CHINESE_TITLES[piece["title"]]
        piece["section"] = "Beginner & folk"

    pieces.extend(entry["row"].copy() for entry in PRIVATE.values())

    def sort_key(row):
        title = normalize("NFKD", row["title"].casefold())
        return row["section"], "".join(char for char in title if not combining(char))

    return sorted(pieces, key=sort_key)


def load(piece):
    if piece == "mario-opening" and "mario-theme" in PRIVATE:
        piece = "mario-theme"  # Legacy bookmark on an existing installation.
    if piece in PRIVATE:
        return deepcopy(PRIVATE[piece]["score"])
    score = _load_score(piece)
    score["titleZh"] = CHINESE_TITLES[score["title"]]
    return score


def _load_score(piece):
    if piece in nursery.EDITIONS:
        return deepcopy(nursery.score(piece))
    if piece == "starter":
        return example()
    title, source, _, key, bpm, melody = TUNES[piece]
    return dict(
        title=title,
        key=key,
        source=f"{source} · Stringbook arrangement in {key.rstrip('m')} {'minor' if key.endswith('m') else 'major'}",
        part="Violin",
        kind="example",
        bpm=bpm,
        bars=_bars(melody, "4/4"),
        notices=[],
    )


def _bars(melody, meter):
    bars = []
    for measure in melody.split("|"):
        events = []
        for token in measure.split():
            pitch, _, beats = token.removesuffix("~").partition(":")
            ticks = Fraction(beats or "1") * TPQ
            events.append(
                event(None if pitch == "r" else Pitch(pitch).midi, int(ticks), tie=token.endswith("~"))
            )
        bars.append(dict(meter=meter, events=events))
    return bars
