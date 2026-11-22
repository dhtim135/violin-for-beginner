import { abcPitch, signature } from "./keys.js";
// Stored pitch is MIDI. Labels are first-position string/finger placements.
export const strings = [
  ["G", 55],
  ["D", 62],
  ["A", 69],
  ["E", 76],
];
const steps = [
  [0, ""],
  [1, "low"],
  [1, ""],
  [2, "low"],
  [2, "high"],
  [3, ""],
  [3, "high"],
  [4, ""],
];
export const allEvents = (score) => score.bars.flatMap((b) => b.events);
export function choices(pitch) {
  if (pitch == null) return [];
  return strings.flatMap(([string, base], index) => {
    const shape = steps[pitch - base];
    return shape
      ? [{ string, index, finger: shape[0], placement: shape[1], position: 1 }]
      : [];
  });
}
export function fingerLabel(f) {
  return f
    ? f.string + (f.finger || "") + (f.placement ? " " + f.placement : "")
    : "Check range";
}
export function suggest(score) {
  // Rank entire paths. User choices restrict the candidate set at that note.
  let paths = [],
    layers = [];
  function flush() {
    if (paths.length) {
      let i = paths.reduce(
        (best, p, j) => (p.cost < paths[best].cost ? j : best),
        0,
      );
      for (let k = layers.length - 1; k >= 0; k--) {
        const [event, options] = layers[k],
          selection = options[i];
        event.fingering = selection.f;
        i = selection.prev;
      }
    }
    paths = [];
    layers = [];
  }
  for (const n of allEvents(score)) {
    if (n.pitch === null) {
      n.fingering = null;
      continue;
    }
    let opts = choices(n.pitch);
    if (n.locked) opts = opts.filter((f) => f.string === n.fingering?.string);
    if (!opts.length) {
      flush();
      n.fingering = null;
      continue;
    }
    paths = opts.map((f) => {
      const own = f.finger === 4 ? 1.15 : f.finger === 0 ? 0 : 0.12;
      if (!paths.length) return { f, cost: own, prev: 0 };
      let cost = Infinity,
        prev = 0;
      paths.forEach((p, i) => {
        const total =
          p.cost +
          own +
          Math.abs(f.index - p.f.index) * 0.68 +
          Math.abs(f.finger - p.f.finger) * 0.05;
        if (total < cost) {
          cost = total;
          prev = i;
        }
      });
      return { f, cost, prev };
    });
    layers.push([n, paths]);
  }
  flush();
}
export function pitchName(p) {
  return p === null
    ? "Rest"
    : ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][
        p % 12
      ] +
        (Math.floor(p / 12) - 1);
}
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}
// Group eighth/quarter triplet values back to whole beats, including a
// quarter-triplet group ending in two eighths. ABC needs the written count.
function tripletGroups(events) {
  const members = new Map();
  let offset = 0;
  for (let i = 0; i < events.length; i++) {
    if (offset % 96 === 0 && !members.has(i)) {
      let ticks = 0;
      for (let end = i; end < events.length; end++) {
        const length = events[end].ticks;
        if (length !== 32 && length !== 64) break;
        ticks += length;
        if (ticks % 96 === 0) {
          for (let j = i; j <= end; j++) members.set(j, j === i ? end - i + 1 : 0);
          break;
        }
        if (ticks >= 192) break;
      }
    }
    offset += events[i].ticks;
  }
  return members;
}
function scoreAbc(score, bows) {
  const signatureForScore = signature(score.key);
  let meter = score.bars[0].meter;
  let music = "";
  const labels = [];
  for (const bar of score.bars) {
    if (bar.meter !== meter) {
      meter = bar.meter;
      music += "[M:" + meter + "]";
    }
    const [beats, unit] = meter.split("/").map(Number);
    const compound = beats > 3 && beats % 3 === 0 && unit === 8;
    const beatTicks = (384 / unit) * (compound ? 3 : 1);
    const accidentals = {};
    const triplets = tripletGroups(bar.events);
    let elapsed = 0;
    let previousBeat = -1;
    for (const [i, note] of bar.events.entries()) {
      const beat = Math.floor(elapsed / beatTicks);
      if (beat !== previousBeat) music += " ";
      previousBeat = beat;
      if (triplets.get(i)) music += "(3:2:" + triplets.get(i);
      const ticks = triplets.has(i) ? note.ticks * 1.5 : note.ticks;
      const g = gcd(ticks, 96);
      const stroke = bows?.get(note.id)?.stroke;
      if (stroke?.ids[0] === note.id) {
        if (stroke.slurred) music += "(";
        music += "!" + stroke.direction + "bow!";
      }
      music += abcPitch(note.pitch, accidentals, signatureForScore);
      if (ticks !== 96) music += ticks / g + (g === 96 ? "" : "/" + 96 / g);
      if (note.tie) music += "-";
      if (stroke?.slurred && stroke.ids.at(-1) === note.id) music += ")";
      elapsed += note.ticks;

      // ABC's lyric row measures each label and reserves space under its note.
      // It automatically skips rests and remains on one baseline per system.
      if (note.pitch !== null)
        labels.push(
          note.fingering
            ? fingerLabel(note.fingering).replace(" low", "↓").replace(" high", "↑")
            : "Range?",
        );
    }
    music += " |";
  }
  return [
    "X:1",
    "M:" + score.bars[0].meter,
    "L:1/4",
    "K:" + (score.key || "C"),
    music + "]",
    "w:" + labels.join(" "),
  ].join("\n");
}

export function renderScore(score, root, select, scale = 1, bows = null) {
  root.replaceChildren();
  const nodes = new Map();
  if (!score.bars.length) return nodes;
  const staffWidth = Math.max(195, root.clientWidth / scale - 20);
  const [visual] = ABCJS.renderAbc(root, scoreAbc(score, bows), {
    responsive: "resize",
    staffwidth: staffWidth,
    wrap: { minSpacing: 1.12 },
    oneSvgPerLine: true,
    expandToWidest: true,
    paddingtop: 5,
    paddingbottom: 5,
    paddingleft: 8,
    paddingright: 12,
    minPadding: 4,
    add_classes: true,
    format: { vocalfont: "Helvetica 12", stretchlast: "true" },
  });
  // The responsive renderer leaves an inline-block around the entire tune.
  // Let the browser paginate the individual systems inside it.
  root.style.display = "block";
  root.style.overflow = "visible";
  let firstBar = 1;
  for (const svg of root.querySelectorAll("svg")) {
    const ink = svg.querySelector(":scope > g").getBBox();
    const view = svg.viewBox.baseVal;
    svg.setAttribute(
      "viewBox",
      [view.x, ink.y - 4, view.width, ink.height + 8].join(" "),
    );
    const count = svg.querySelectorAll(".abcjs-bar").length;
    const lastBar = firstBar + count - 1;
    const staff = svg.parentElement;
    staff.classList.add("staff");
    const caption = document.createElement("span");
    caption.className = "bar-range";
    caption.textContent = count === 1 ? "Bar " + firstBar : "Bars " + firstBar + "–" + lastBar;
    staff.prepend(caption);
    firstBar = lastBar + 1;
  }
  const events = allEvents(score);
  const glyphs = visual.getSelectableArray()
    .filter((entry) => entry.absEl.abcelem.el_type === "note");
  glyphs.forEach(({ svgEl }, j) => {
    const n = events[j];
    const label = svgEl.querySelector(".abcjs-lyric");
    if (label) {
      // ABCJS anchors a lyric at the left edge of the notehead.
      const head = svgEl.querySelector(".abcjs-notehead").getBBox();
      label.setAttribute("transform", "translate(" + head.width / 2 + " 0)");
    }
    nodes.set(n.id, svgEl);
    svgEl.dataset.note = n.id;
    const bow = bows?.get(n.id);
    if (bow) svgEl.dataset.stroke = bow.stroke.ids[0];
    svgEl.setAttribute("tabindex", "0");
    svgEl.setAttribute("role", "button");
    svgEl.setAttribute(
      "aria-label",
      pitchName(n.pitch) +
        " · " +
        (n.pitch == null ? "Rest" : fingerLabel(n.fingering)) +
        (bow ? " · " + bow.stroke.direction + " bow · " + bow.origin : ""),
    );
    svgEl.onclick = () => select(n.id);
    svgEl.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        select(n.id);
      }
    };
    if (n.flag || (!n.fingering && n.pitch !== null))
      svgEl.classList.add("review");
  });
  return nodes;
}
export function repairTies(score) {
  const notes = allEvents(score);
  notes.forEach((n, i) => {
    if (n.pitch === null || n.pitch !== notes[i + 1]?.pitch) n.tie = false;
  });
}
export function rebar(score, events) {
  const old = score.bars;
  const layout = old.map((b) => ({
    meter: b.meter,
    capacity: b.events.reduce((s, n) => s + n.ticks, 0),
  }));
  const out = [];
  let left = 0;
  for (const n of events) {
    let remaining = n.ticks;
    while (remaining > 0) {
      if (left === 0) {
        const bar = layout[out.length] || layout.at(-1);
        const [a, d] = bar.meter.split("/").map(Number);
        left =
          out.length < layout.length ? bar.capacity : Math.round((384 * a) / d);
        if (left <= 0) left = 384;
        out.push({ meter: bar.meter, events: [] });
      }
      const take = Math.min(left, remaining);
      out.at(-1).events.push({
        ...n,
        ...(remaining === n.ticks ? {} : { attackId: n.attackId || n.id, bowEdit: null, sourceBow: null, sourceJoin: null }),
        id: remaining === n.ticks ? n.id : crypto.randomUUID(),
        ticks: take,
        tie: n.pitch !== null && (remaining > take || n.tie),
      });
      left -= take;
      remaining -= take;
    }
  }
  score.bars = out;
  repairTies(score);
}

// Preserve beat-aligned eighth triplets and binary values through 32nds. Split long or
// composite values across tied glyphs and keep the playback events identical.
export function spellRhythm(score) {
  const values = [576, 384, 288, 192, 144, 96, 72, 48, 36, 24, 12];
  let quantized = false;
  for (const bar of score.bars) {
    let cursor = 0,
      written = 0;
    const triplets = tripletGroups(bar.events);
    bar.events = bar.events.flatMap((n, index) => {
      cursor += n.ticks;
      if (triplets.has(index) && written === cursor - n.ticks) {
        written += n.ticks;
        return [n];
      }
      const length = Math.max(12, Math.round(cursor / 12) * 12 - written);
      written += length;
      if (length !== n.ticks) quantized = true;
      let left = length;
      const pieces = [];
      while (left) {
        const ticks = values.find((v) => v <= left);
        left -= ticks;
        pieces.push({
          ...n,
          ...(pieces.length ? { attackId: n.attackId || n.id, bowEdit: null, sourceBow: null, sourceJoin: null } : {}),
          id: pieces.length ? crypto.randomUUID() : n.id,
          ticks,
          tie: n.pitch !== null && (left > 0 || n.tie),
        });
      }
      return pieces;
    });
  }
  const note =
    "Fine timing simplified to a 32nd-note grid for the beginner arrangement.";
  if (quantized && !score.notices.includes(note)) score.notices.push(note);
  repairTies(score);
}
