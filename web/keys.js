// Circle-of-fifths spelling keeps accidentals, scales and signature in agreement.
const major = [
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
];
const minor = [
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
];
const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function keyOptions(mode = "major") {
  return (mode === "minor" ? minor : major).map(
    (tonic) => tonic + (mode === "minor" ? "m" : ""),
  );
}
export function keyLabel(key) {
  return key
    ? key.replace(/m$/, "").replace("#", "♯").replace("b", "♭") +
        (key.endsWith("m") ? " minor" : " major")
    : "Unknown key";
}
function pc(key) {
  return (
    (12 +
      natural[key[0]] +
      (key.includes("#") ? 1 : key.includes("b") ? -1 : 0)) %
    12
  );
}
export function shiftedKey(key, semitones) {
  if (!key) return null;
  const targets = keyOptions(key.endsWith("m") ? "minor" : "major");
  return targets.find((k) => pc(k) === (pc(key) + semitones + 120) % 12);
}
export function signature(key) {
  const index = keyOptions(key?.endsWith("m") ? "minor" : "major").indexOf(key);
  const fifths = index === -1 ? 0 : index - 6;
  return Object.fromEntries(
    [...(fifths < 0 ? "BEADGCF" : "FCGDAEB").slice(0, Math.abs(fifths))].map(
      (letter) => [letter, Math.sign(fifths)],
    ),
  );
}
export function abcPitch(p, accidentals, keySignature) {
  if (p === null) return "z";
  // Prefer diatonic spellings, then chromatic spellings consistent with the key.
  const flat = Object.values(keySignature).includes(-1);
  const variants = [];
  for (const [letter, base] of Object.entries(natural)) {
    const alter = ((p - base + 121) % 12) - 1;
    if (Math.abs(alter) > 1) continue;
    const cost =
      (alter === (keySignature[letter] || 0) ? 0 : 3) +
      Math.abs(alter) +
      (alter === (flat ? 1 : -1) ? 0.5 : 0);
    variants.push({ letter, alter, base, cost });
  }
  const { letter, alter, base } = variants.sort((a, b) => a.cost - b.cost)[0];
  const octave = (p - base - alter) / 12 - 1,
    id = letter + octave;
  const before = accidentals[id] ?? keySignature[letter] ?? 0;
  accidentals[id] = alter;
  return (
    (before === alter ? "" : alter < 0 ? "_" : alter > 0 ? "^" : "=") +
    (octave >= 5
      ? letter.toLowerCase() + "'".repeat(octave - 5)
      : letter + ",".repeat(4 - octave))
  );
}
export function intervalFor(score, target) {
  const pitches = score.bars
    .flatMap((b) => b.events)
    .map((n) => n.pitch)
    .filter((p) => p !== null);
  const diff = pc(target) - pc(score.key);
  const moves = [diff - 12, diff, diff + 12].filter((d) =>
    pitches.every((p) => p + d >= 0 && p + d <= 127),
  );
  const missed = (d) => pitches.filter((p) => p + d < 55 || p + d > 83).length;
  return moves.sort(
    (a, b) =>
      missed(a) - missed(b) ||
      Math.abs(a + (score.keyShift || 0)) -
        Math.abs(b + (score.keyShift || 0)) ||
      Math.abs(a) - Math.abs(b),
  )[0];
}
