import { renderHands } from "./violin.js";
import { allEvents, strings, suggest, shortFinger } from "./music.js";
import { keyLabel, scalePitches, writtenPitch } from "./keys.js";

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
const commonBeats = new Map([[12, "⅛"], [24, "¼"], [32, "⅓"], [48, "½"], [72, "¾"], [96, "1"], [144, "1½"]]);
function beats(ticks) {
  return commonBeats.get(ticks) || String(Number((ticks / 96).toFixed(2)));
}
function board(events, key) {
  const table = element("table", null, "fingerboard");
  table.setAttribute("aria-label", "First-position fingerboard, semitone spacing");
  const header = table.createTHead().insertRow();
  for (const label of ["String", "Open", "1↓", "1", "2↓", "2↑", "3", "3↑", "4"])
    header.append(element("th", label));
  const body = table.createTBody();
  for (const [string, base] of strings) {
    const row = body.insertRow();
    row.append(element("th", string));
    const used = new Set(events.filter(n => n.fingering?.string === string).map(n => n.pitch));
    for (let step = 0; step < 8; step++) {
      const cell = row.insertCell();
      if (used.has(base + step)) {
        const marker = element("span", writtenPitch(base + step, key));
        marker.title = shortFinger(events.find(n => n.pitch === base + step && n.fingering?.string === string).fingering);
        marker.dataset.fingering = marker.title;
        cell.append(marker);
      }
    }
  }
  return table;
}

export function renderCard(root, score, bows, barIndex = 0, scale = false, noteId = null, onPreview = null) {
  const notes = allEvents(score).filter(n => n.pitch !== null);
  const bar = score.bars[barIndex];
  const overview = element("div", null, "card-hands");
  const note = bar.events.find(n => n.id === noteId) || bar.events[0];
  root.replaceChildren(element("h3", "On the violin · Bar " + (barIndex + 1)), overview,
    element("h3", "Left hand · Notes in this piece"));
  root.append(element("p", "Read across each string from open to fourth finger. Each column moves one semitone higher.", "card-caption"), board(notes, score.key));
  if (notes.some(n => !n.fingering))
    root.append(element("p", "Notes marked Range? on the staff need a fingering before they appear here."));
  if (scale && score.key) {
    const lowest = notes.reduce((min, n) => Math.min(min, n.pitch), 83);
    const events = scalePitches(score.key, lowest).map(pitch => ({ pitch }));
    suggest({ bars: [{ events }] });
    root.append(element("h3", keyLabel(score.key) + (score.key.endsWith("m") ? " · Natural minor scale" : " · One-octave scale")),
      element("p", events.map(n => writtenPitch(n.pitch, score.key) + " (" + shortFinger(n.fingering) + ")").join("  ·  "), "scale-line"));
  }
  root.append(element("h3", "Right hand · Bar " + (barIndex + 1)),
    element("p", "Down bow travels from frog to tip. Up bow travels from tip to frog. Each group shares a stroke. Durations are in quarter-note beats.", "card-caption"));
  const strip = element("div", null, "bow-strip");
  let group, previousStroke;
  for (const n of score.bars[barIndex].events) {
    const entry = bows.get(n.id);
    const stroke = entry?.stroke;
    if (!stroke || previousStroke !== stroke) {
      const continued = stroke && stroke.ids[0] !== n.id;
      group = element("div", null, "bow-group");
      if (stroke) group.dataset.direction = stroke.direction;
      group.append(element("strong", !stroke ? "Rest" : (continued ? "Continue " : "") +
        (stroke.direction === "up" ? "∨ Up bow" : "⊓ Down bow")));
      strip.append(group);
    }
    const note = element(onPreview ? "button" : "span", n.pitch === null ? "Rest" : writtenPitch(n.pitch, score.key) + " · " + shortFinger(n.fingering));
    if (onPreview) {
      note.type = "button";
      note.dataset.previewNote = n.id;
      note.onclick = () => onPreview(n);
    }
    note.append(element("small", beats(n.ticks) + (entry?.tied ? " · hold" : "")));
    note.style.flexGrow = String(n.ticks / 96);
    group.append(note);
    previousStroke = stroke;
  }
  root.append(strip);
  if (note) updateCardNote(root, note, bows, score.key);
}

export function updateCardNote(root, note, bows, key) {
  const host = root.querySelector(".card-hands");
  if (!host || host.dataset.handNote === note.id) return;
  renderHands(host, note, bows.get(note.id), key);
  for (const button of root.querySelectorAll("[data-preview-note]"))
    button.setAttribute("aria-pressed", String(button.dataset.previewNote === note.id));
  for (const dot of root.querySelectorAll("[data-fingering]"))
    dot.classList.toggle("current-finger", dot.dataset.fingering === shortFinger(note.fingering));
}
