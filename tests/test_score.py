import unittest
from music21 import bar, meter, note, stream
from studio.score import normalize


class ScoreImport(unittest.TestCase):
    def test_repeat_and_rest_duration(self):
        part = stream.Part()
        m = stream.Measure(number=1)
        m.timeSignature = meter.TimeSignature("3/4")
        m.append(note.Note("D4", quarterLength=2))
        m.append(note.Rest(quarterLength=1))
        m.leftBarline = bar.Repeat(direction="start")
        m.rightBarline = bar.Repeat(direction="end")
        part.append(m)
        bars, _, notes = normalize(part)
        self.assertEqual(len(bars), 2)
        self.assertEqual(
            [(e["pitch"], e["ticks"]) for e in bars[0]["events"]],
            [(62, 192), (None, 96)],
        )
        self.assertTrue(any("Repeated" in s for s in notes))

    def test_bow_directions_and_string_slurs_survive_musicxml(self):
        from music21 import articulations, converter, instrument, spanner
        from music21.musicxml.m21ToXml import GeneralObjectExporter

        for instr in [instrument.Violin(), instrument.Piano()]:
            with self.subTest(instrument=instr.instrumentName):
                part = stream.Part()
                part.insert(0, instr)
                notes = [note.Note(p) for p in ("D4", "E4", "F#4", "G4")]
                notes[0].articulations.append(articulations.UpBow())
                m = stream.Measure(number=1)
                m.timeSignature = meter.TimeSignature("4/4")
                m.append(notes)
                part.append(m)
                part.insert(0, spanner.Slur(notes[0], notes[2]))
                source = converter.parseData(GeneralObjectExporter(part).parse(), format="musicxml")
                bars, _, _ = normalize(source.parts[0])
                events = bars[0]["events"]
                self.assertEqual(events[0]["sourceBow"], "up")
                if isinstance(instr, instrument.Violin):
                    self.assertEqual(events[1]["sourceJoin"], events[0]["id"])
                    self.assertEqual(events[2]["sourceJoin"], events[1]["id"])
                else:
                    self.assertFalse(any("sourceJoin" in e for e in events))

    def test_tie_and_overlapping_voice(self):
        from music21 import tie

        part = stream.Part()
        m = stream.Measure()
        m.timeSignature = meter.TimeSignature("2/4")
        n = note.Note("A4", quarterLength=1)
        n.tie = tie.Tie("start")
        m.insert(0, n)
        m.insert(0, note.Note("D4", quarterLength=2))
        m.insert(1, note.Note("A4"))
        part.append(m)
        bars, _, _ = normalize(part)
        events = bars[0]["events"]
        self.assertEqual([e["pitch"] for e in events], [69, 69])
        self.assertTrue(events[0]["tie"])
        self.assertTrue(events[0]["flag"])


class StarterEditions(unittest.TestCase):
    def test_public_catalogue_without_private_editions(self):
        from unittest.mock import patch
        from studio import starters

        with patch.object(starters, "PRIVATE", {}):
            slugs = {row["example"] for row in starters.catalogue()}
            self.assertIn("ode-to-joy", slugs)
            self.assertIn("little-bo-peep", slugs)
            self.assertTrue({"mario-theme", "botw-stables", "pokemon-tv-theme"}.isdisjoint(slugs))
            with self.assertRaises(KeyError):
                starters.load("mario-theme")

    def test_all_offline_editions_have_complete_playable_measures(self):
        from studio.starters import catalogue, load

        for item in catalogue():
            with self.subTest(title=item["title"]):
                score = load(item["example"])
                self.assertEqual(score["title"], item["title"])
                self.assertRegex(item["titleZh"], r"[\u3400-\u9fff]")
                self.assertEqual(score["titleZh"], item["titleZh"])
                for measure in score["bars"]:
                    a, b = map(int, measure["meter"].split("/"))
                    self.assertEqual(
                        sum(n["ticks"] for n in measure["events"]), 384 * a / b
                    )
                    self.assertTrue(
                        all(
                            n["pitch"] is None or 55 <= n["pitch"] <= 83
                            for n in measure["events"]
                        )
                    )
