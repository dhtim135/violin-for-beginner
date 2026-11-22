import test from "node:test";
import assert from "node:assert/strict";
import {
  choices,
  allEvents,
  rebar,
  suggest,
  repairTies,
} from "../web/music.js";
const line = (ps) => ({
  bars: [
    {
      meter: "4/4",
      events: ps.map((pitch, i) => ({
        id: String(i),
        pitch,
        ticks: 96,
        tie: false,
      })),
    },
  ],
});
test("all four strings, chromatic placements, overlap and limits", () => {
  for (const [p, s] of [
    [55, "G"],
    [62, "D"],
    [69, "A"],
    [76, "E"],
  ])
    assert.ok(choices(p).some((f) => f.string === s && !f.finger));
  assert.equal(choices(72)[0].placement, "low");
  assert.equal(choices(73)[0].placement, "high");
  assert.equal(choices(83)[0].finger, 4);
  assert.deepEqual(choices(84), []);
});
test("suggestions preserve an explicitly selected fourth finger", () => {
  const s = line([62, 69, null, 69, 90]);
  let n = s.bars[0].events[1];
  n.locked = true;
  n.fingering = choices(69)[0];
  suggest(s);
  assert.equal(n.fingering.string, "D");
  assert.equal(n.fingering.finger, 4);
  assert.equal(allEvents(s).at(-1).fingering, null);
});
test("rebarring a lengthened note preserves total duration and ties across the boundary", () => {
  const s = line([62, 64, 65, 67]);
  const edited = structuredClone(allEvents(s));
  edited[3].ticks = 192;
  rebar(s, edited);
  const notes = allEvents(s);
  assert.equal(s.bars.length, 2);
  assert.equal(
    notes.reduce((v, n) => v + n.ticks, 0),
    480,
  );
  assert.equal(notes[3].tie, true);
  assert.notEqual(notes[3].id, notes[4].id);
  notes[4].pitch++;
  repairTies(s);
  assert.equal(notes[3].tie, false);
});
test("five eighths display as tied standard durations without changing playback length", async () => {
  const { spellRhythm } = await import("../web/music.js");
  const s = line([69, 71]);
  s.notices = [];
  allEvents(s)[0].ticks = 240;
  spellRhythm(s);
  assert.deepEqual(
    allEvents(s).map((n) => [n.ticks, n.tie]),
    [
      [192, true],
      [48, false],
      [96, false],
    ],
  );
});

test("D to A stays playable and key signatures spell naturals, flats and sharps", async () => {
  const { intervalFor, abcPitch, signature } = await import("../web/keys.js");
  const s = line([62, 66, 69, 71]);
  s.key = "D";
  const d = intervalFor(s, "A");
  assert.equal((62 + d) % 12, 9);
  assert.ok(allEvents(s).every((n) => choices(n.pitch + d).length));
  const signs = signature("A"),
    acc = {};
  assert.equal(abcPitch(66, acc, signs), "F");
  assert.equal(abcPitch(65, acc, signs), "=F");
  assert.equal(abcPitch(66, acc, signs), "^F");
  assert.equal(abcPitch(70, {}, signature("F")), "B");
  assert.equal(abcPitch(65, {}, signature("F#")), "E");
});

test("a bow follows ties and explicit slurs, honours edits and restarts after rests", async () => {
  const { bowPlan } = await import("../web/bowing.js");
  const s = line([62, 62, 64, 66, null, 62, 62]);
  const notes = allEvents(s);
  notes[0].sourceBow = "up";
  notes[0].tie = true;
  notes[2].sourceJoin = notes[1].id;
  const plan = bowPlan(s);
  assert.deepEqual(plan.get("0").stroke.ids, ["0", "1", "2"]);
  assert.equal(plan.get("2").stroke.direction, "up");
  assert.equal(plan.get("3").stroke.direction, "down");
  assert.equal(plan.has("4"), false);
  assert.equal(plan.get("5").stroke.direction, "down");
  assert.equal(plan.get("6").stroke.direction, "up");
  notes[2].bowEdit = {};
  assert.deepEqual(bowPlan(s).get("0").stroke.ids, ["0", "1"]);
  notes[2].bowEdit = { joinFrom: notes[0].id };
  assert.deepEqual(bowPlan(s).get("2").stroke.ids, ["2"]);
});

test("a bow join survives a tied rhythm split and scale spellings follow the key", async () => {
  const { bowPlan } = await import("../web/bowing.js");
  const { scalePitches, writtenPitch } = await import("../web/keys.js");
  const { spellRhythm } = await import("../web/music.js");
  const s = line([66, 67]);
  s.notices = [];
  allEvents(s)[0].ticks = 240;
  allEvents(s)[1].bowEdit = { joinFrom: "0" };
  spellRhythm(s);
  assert.equal(bowPlan(s).get("0").stroke.ids.length, 3);
  assert.deepEqual(scalePitches("D", 62).map(p => writtenPitch(p, "D")),
    ["D", "E", "F♯", "G", "A", "B", "C♯", "D"]);
  assert.equal(writtenPitch(65, "F#"), "E♯");
});

test("mixed quarter and eighth triplets retain exact timing through repeated edits", async () => {
  const { spellRhythm } = await import("../web/music.js");
  const lengths = [32, 32, 32, 64, 64, 64, 64, 64, 32, 32];
  const s = line(lengths.map(() => 62));
  s.notices = [];
  allEvents(s).forEach((n, i) => n.ticks = lengths[i]);
  spellRhythm(s);
  spellRhythm(s);
  assert.deepEqual(allEvents(s).map(n => n.ticks), lengths);
  assert.deepEqual(s.notices, []);
});
