import { bowPlan } from "./bowing.js";
import { renderCard } from "./practice-card.js";
import { songTitle } from "./title.js";
import { keyOptions, keyLabel, intervalFor, shiftedKey } from "./keys.js";
import {
  allEvents,
  choices,
  fingerLabel,
  pitchName,
  rebar,
  renderScore,
  repairTies,
  spellRhythm,
  suggest,
} from "./music.js";
import { play, pause, resume, stop, audition } from "./player.js";
const $ = (id) => document.getElementById(id);
const elem = (tag, text) => {
  const el = document.createElement(tag);
  if (text != null) el.append(text);
  return el;
};
const option = (value, text) => new Option(text, value);
const button = (text, action) => {
  const b = elem("button", text);
  b.type = "button";
  b.onclick = guard(action);
  return b;
};
const json = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
async function api(path, opts) {
  const r = await fetch("/api/" + path, opts);
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw Error(
      typeof e.detail === "string"
        ? e.detail
        : "Request failed. Check the input and try again.",
    );
  }
  return r.json();
}
function message(text) {
  ($("dialog").open ? $("dstatus") : $("feedback")).textContent = text;
}
function guard(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      message(e.message);
    }
  };
}
let score,
  identity = null,
  revision = 0,
  dirty = false,
  history = [],
  nodes = new Map(),
  selected,
  playbackState = "idle",
  playbackRequest = 0,
  lastLit,
  bows = new Map(),
  litStroke = [],
  dialogVersion = 0;
function setPlaybackState(state) {
  playbackState = state;
  $("play").textContent = { idle: "▶ Play", playing: "Ⅱ Pause", paused: "▶ Resume" }[state];
  $("resetPlayback").disabled = state === "idle" && ($("loop").checked || +$("startBar").value === 1);
}
function halt() {
  playbackRequest++;
  stop();
  setPlaybackState("idle");
  $("play").removeAttribute("aria-busy");
  lightNote(null);
}
function lightNote(id) {
  lastLit?.classList.remove("playing");
  for (const node of litStroke) node.classList.remove("bow-playing");
  litStroke = [];
  if ($("showBows").checked) {
    for (const member of bows.get(id)?.stroke.ids || []) {
      const node = nodes.get(member);
      if (node) {
        node.classList.add("bow-playing");
        litStroke.push(node);
      }
    }
  }
  lastLit = nodes.get(id);
  lastLit?.classList.add("playing");
}
function drawStaff() {
  const playing = lastLit?.dataset.note;
  const focused = document.activeElement?.dataset.note;
  nodes = renderScore(score, $("notation"), select, 1.45, $("showBows").checked ? bows : null);
  lightNote(playing);
  nodes.get(selected)?.classList.add("selected");
  if (focused) nodes.get(focused)?.focus({ preventScroll: true });
}
function cardBar() {
  return Math.max(1, Math.min(score.bars.length, Math.trunc(+$("cardBar").value) || 1));
}
function drawCard() {
  if ($("practice").open) renderCard($("cardContent"), score, bows, cardBar() - 1, $("fullScale").checked);
}
$("practice").ontoggle = drawCard;
$("fullScale").onchange = drawCard;
$("cardBar").onchange = () => { $("cardBar").value = cardBar(); drawCard(); };
$("showBows").onchange = () => draw();
function accept(data, id = null, rev = 0, initial = false) {
  halt();
  score = data;
  // Earlier local saves carried the starter key in their source description.
  if (!("key" in score) && score.kind === "example") {
    score.key =
      score.source.match(/in ([DG]) major/)?.[1] ||
      (score.title === "Four strings" ? "G" : null);
    for (const notice of score.notices) {
      const shift = notice.match(/^Transposed ([+-]?\d+) semitones/);
      if (shift && score.key)
        score.key = shiftedKey(score.key, Number(shift[1]));
    }
  }
  inspector(false);
  identity = id;
  revision = rev;
  dirty = !id && data.kind !== "example";
  history = [];
  selected = null;
  spellRhythm(score);
  suggest(score);
  if (!initial) {
    $("dialog").close();
    $("pieces").open = false;
    $("keys").open = false;
  }
  $("cardBar").value = 1;
  $("startBar").value = 1;
  setPlaybackState("idle");
  $("first").value = 1;
  $("last").value = score.bars.length;
  $("feedback").textContent = "";
  draw();
  $("details").open = score.kind !== "example";
}
function draw() {
  $("title").replaceChildren(songTitle(score));
  $("key").textContent = "Key · " + keyLabel(score.key);
  showKeys();
  $("subtitle").textContent =
    (score.keyShift ? "Source: " : "") + score.source + " · " + score.part;
  $("barcount").textContent = score.bars.length + " bars";
  $("tempo").textContent = "♩ " + score.bpm + " BPM";
  $("undo").disabled = !history.length;
  $("save").textContent = identity && !dirty ? "Saved ✓" : "Save score";
  $("startBar").max = $("first").max = $("last").max = score.bars.length;
  if (+$("startBar").value > score.bars.length) $("startBar").value = score.bars.length;
  $("last").value = Math.min(
    score.bars.length,
    Number($("last").value) || score.bars.length,
  );
  $("first").value = Math.min(+$("first").value, +$("last").value);
  bows = bowPlan(score);
  $("bowGuide").hidden = !$("showBows").checked;
  $("cardBar").max = score.bars.length;
  $("cardBar").value = cardBar();
  $("fullScale").disabled = !score.key;
  drawStaff();
  drawCard();
  showEditor();
  metadata();
}
function metadata() {
  const m = $("metadata");
  m.replaceChildren(elem("p", score.source + " · " + score.part));
  for (const n of score.notices) m.append(elem("p", n));
  const pitches = allEvents(score)
    .map((n) => n.pitch)
    .filter((p) => p !== null);
  const outside = pitches.filter((p) => !choices(p).length).length;
  if (outside) {
    m.append(elem("p", outside + " notes are outside first position."));
    const shifts = Array.from({ length: 49 }, (_, i) => i - 24).filter(
      (d) => d && pitches.every((p) => p + d >= 0 && p + d <= 127),
    );
    const ranked = shifts
      .map((d) => ({
        d,
        miss: pitches.filter((p) => !choices(p + d).length).length,
      }))
      .sort(
        (a, b) =>
          a.miss - b.miss ||
          (a.d % 12 !== 0) - (b.d % 12 !== 0) ||
          Math.abs(a.d) - Math.abs(b.d),
      );
    if (ranked[0]?.miss < outside) {
      const { d, miss } = ranked[0];
      m.append(
        button(
          "Transpose " +
            (d > 0 ? "+" : "") +
            d +
            " semitones (" +
            miss +
            " out of range)",
          () => {
            transpose(d, shiftedKey(score.key, d));
            message("Transposed · Undo restores your previous fingerings.");
          },
        ),
      );
    }
  }
  if (score.fullEdition) {
    const link = elem("a", "Full violin edition at Sheet Music Plus ↗");
    link.href = score.fullEdition;
    link.target = "_blank";
    link.rel = "noopener";
    m.append(link);
  }
  if (score.url || score.asset) {
    const a = elem("a", "Open original source ↗");
    a.target = "_blank";
    a.rel = "noopener";
    a.href = score.url || "/api/source/" + score.asset;
    m.append(a);
  }
  if (score.recordingUrl?.startsWith("https://")) {
    const a = elem("a", "Listen to the reference recording ↗");
    a.target = "_blank";
    a.rel = "noopener";
    a.href = score.recordingUrl;
    m.append(a);
  }
  if (score.parts?.length > 1)
    m.append(
      button("Choose another part", () => {
        if (discard()) partPicker(score);
      }),
    );
  if (score.kind === "audio") {
    const a = elem("audio");
    a.src = "/api/clip/" + score.asset;
    a.controls = true;
    m.append(a);
  }
}
function inspector(open) {
  $("inspector").hidden = !open;
  $("workspace").classList.toggle("with-tools", open);
  $("tools").setAttribute("aria-expanded", String(open));
}
function closeTools() {
  inspector(false);
  (nodes.get(selected) || $("tools")).focus({ preventScroll: true });
}
$("closeTools").onclick = closeTools;
$("tools").onclick = () => inspector($("inspector").hidden);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || $("dialog").open) return;
  const picker = [$("pieces"), $("keys")].find(panel => panel.open);
  if (picker) {
    picker.open = false;
    picker.querySelector("summary").focus();
  } else if (!$("inspector").hidden) {
    closeTools();
  } else return;
  event.preventDefault();
});
function transpose(d, key) {
  halt();
  history.push(structuredClone(score));
  for (const n of allEvents(score)) {
    if (n.pitch === null) continue;
    n.pitch += d;
    if (n.locked) {
      const choice = choices(n.pitch).find(
        (f) => f.string === n.fingering?.string,
      );
      n.locked = Boolean(choice);
      n.fingering = choice || null;
    }
  }
  score.key = key;
  score.keyShift = (score.keyShift || 0) + d;
  score.notices.push(
    "Transposed " +
      (d > 0 ? "+" : "") +
      d +
      " semitones" +
      (key ? " to " + keyLabel(key) : "") +
      ".",
  );
  dirty = true;
  suggest(score);
  draw();
}
function showKeys() {
  const panel = $("keyPanel");
  if (!score) return;
  panel.replaceChildren(
    elem("h3", score.key ? "Play in a new key" : "Identify the source key"),
  );
  const options = score.key
    ? keyOptions(score.key.endsWith("m") ? "minor" : "major")
    : [...keyOptions(), ...keyOptions("minor")];
  if (!score.key)
    panel.append(
      elem(
        "p",
        "Choose the melody’s original key first. Then choose the key you want to play in.",
      ),
    );
  const grid = elem("div");
  grid.className = "keyGrid";
  panel.append(grid);
  for (const target of options) {
    const choice = button(keyLabel(target), () => {
      $("keys").open = false;
      $("key").focus();
      if (score.key === target) return;
      if (!score.key) {
        history.push(structuredClone(score));
        score.key = target;
        score.notices.push(
          "Source key identified by user as " + keyLabel(target) + ".",
        );
        dirty = true;
        draw();
        message("Source key set. Choose a different key to transpose.");
      } else changeKey(target);
    });
    choice.setAttribute("aria-pressed", String(target === score.key));
    grid.append(choice);
  }
}
function changeKey(target) {
  const d = intervalFor(score, target);
  if (d === undefined) {
    draw();
    throw Error("The new key exceeds the supported pitch range.");
  }
  transpose(d, target);
  const outside = allEvents(score).filter(
    (n) => n.pitch !== null && !n.fingering,
  ).length;
  message(
    "Transposed to " +
      keyLabel(target) +
      (outside ? " · " + outside + " notes outside first position." : "."),
  );
}
function select(id) {
  selected = id;
  inspector(true);
  showEditor();
}
function current() {
  return allEvents(score).find((n) => n.id === selected);
}
function fillFingers(pitch) {
  const n = current(),
    opts = choices(pitch);
  $("finger").replaceChildren(
    option(
      "auto",
      opts.length
        ? "Suggested fingering"
        : pitch === null
          ? "Rest"
          : "Outside first position",
    ),
    ...opts.map((f) => option(f.string, fingerLabel(f))),
  );
  if (n?.locked && n.pitch === pitch)
    $("finger").value = n.fingering?.string || "auto";
}
function showEditor() {
  for (const el of nodes.values()) el.classList.remove("selected");
  const n = current();
  $("edit").hidden = !n;
  document
    .querySelectorAll(".strings span")
    .forEach((el) =>
      el.classList.toggle("chosen", el.textContent === n?.fingering?.string),
    );
  if (!n) {
    $("selection").textContent = "Select a note to edit.";
    return;
  }
  nodes.get(n.id)?.classList.add("selected");
  $("selection").textContent =
    (n.pitch === null
      ? "Rest"
      : pitchName(n.pitch) + " · " + fingerLabel(n.fingering)) +
    (n.flag ? " · " + n.flag : "");
  $("pitch").replaceChildren(
    option("rest", "Rest"),
    ...Array.from({ length: 128 }, (_, i) => option(i, pitchName(i))),
  );
  $("pitch").value = n.pitch ?? "rest";
  const durations = [
    [24, "Sixteenth"],
    [48, "Eighth"],
    [72, "Dotted eighth"],
    [96, "Quarter"],
    [144, "Dotted quarter"],
    [192, "Half"],
    [288, "Dotted half"],
    [384, "Whole"],
  ];
  if (n.ticks === 32) durations.push([32, "Triplet eighth"]);
  if (!durations.some((d) => d[0] === n.ticks))
    durations.push([n.ticks, (n.ticks / 96).toFixed(2) + " beats"]);
  $("duration").replaceChildren(...durations.map(([v, t]) => option(v, t)));
  $("duration").value = n.ticks;
  fillFingers(n.pitch);
  $("hear").disabled = n.pitch === null;
  const events = allEvents(score);
  const index = events.indexOf(n);
  $("merge").disabled = index === events.length - 1;
  const prev = events[index - 1], next = events[index + 1], bow = bows.get(n.id);
  $("bowTools").hidden = !$("showBows").checked || !bow;
  if (bow) {
    $("bowInfo").textContent = bow.origin + " · " + (bow.stroke.ids[0] === n.id ? "Start " : "Continue ") + bow.stroke.direction + " bow";
    $("bowMode").value = n.bowEdit?.direction || (n.bowEdit?.joinFrom ? "join" : n.bowEdit ? "separate" : "");
    $("bowMode").disabled = bow.tied;
    $("bowMode").querySelector('[value="join"]').disabled = !prev || prev.pitch === null;
    $("joinBow").disabled = !next || next.pitch === null || n.tie || bows.get(next.id)?.stroke === bow.stroke;
  }
}
function changeBow(note, value, prev) {
  halt();
  history.push(structuredClone(score));
  if (history.length > 20) history.shift();
  if (!value) delete note.bowEdit;
  else if (value === "join") note.bowEdit = { joinFrom: prev.id };
  else note.bowEdit = value === "separate" ? {} : { direction: value };
  dirty = true;
  draw();
  message("Bowing edited · save to keep your changes.");
}
$("bowMode").onchange = () => {
  const notes = allEvents(score), n = current();
  changeBow(n, $("bowMode").value, notes[notes.indexOf(n) - 1]);
};
$("joinBow").onclick = () => {
  const notes = allEvents(score), n = current();
  changeBow(notes[notes.indexOf(n) + 1], "join", n);
};
const newPitch = () => ($("pitch").value === "rest" ? null : +$("pitch").value);
$("pitch").onchange = () => fillFingers(newPitch());
function edit(operation) {
  const before = structuredClone(score);
  halt();
  const events = structuredClone(allEvents(score)),
    index = events.findIndex((n) => n.id === selected);
  if (index < 0) return;
  const n = events[index];
  if (operation === "merge") {
    if (index + 1 >= events.length) return;
    const next = events.splice(index + 1, 1)[0];
    n.ticks += next.ticks;
    n.tie = false;
    n.flag = "";
  }
  if (operation === "remove") {
    if (events.length === 1) {
      message("Keep at least one note or rest.");
      return;
    }
    events.splice(index, 1);
    selected = events[Math.min(index, events.length - 1)].id;
  }
  if (operation === "insert") {
    const copy = { ...n, id: crypto.randomUUID(), flag: "", tie: false };
    for (const key of ["bowEdit", "sourceBow", "sourceJoin", "attackId"]) delete copy[key];
    events.splice(index + 1, 0, copy);
    selected = copy.id;
  }
  if (operation === "apply") {
    const p = newPitch(),
      str = $("finger").value;
    if (n.pitch !== p) {
      n.tie = false;
      if (index) events[index - 1].tie = false;
    }
    Object.assign(n, {
      pitch: p,
      ticks: +$("duration").value,
      flag: "",
      locked: str !== "auto",
      fingering: choices(p).find((f) => f.string === str) || null,
    });
  }
  if (operation === "apply" && events[index].ticks === current().ticks) {
    const originals = allEvents(score);
    originals.forEach((x, i) => Object.assign(x, events[i]));
    repairTies(score);
  } else rebar(score, events);
  history.push(before);
  if (history.length > 20) history.shift();
  spellRhythm(score);
  dirty = true;
  suggest(score);
  draw();
  message("Edited · save to keep your changes.");
}
$("edit").onsubmit = (e) => {
  e.preventDefault();
  edit("apply");
};
$("merge").onclick = () => edit("merge");
$("hear").onclick = guard(async () => {
  halt();
  await audition(current().pitch);
});
$("insert").onclick = () => edit("insert");
$("remove").onclick = () => edit("remove");
$("undo").onclick = () => {
  if (history.length) {
    halt();
    score = history.pop();
    dirty = true;
    draw();
    message("Edit undone.");
  }
};
$("loop").onchange = () => {
  halt();
  $("range").hidden = !$("loop").checked;
  $("startBarLabel").hidden = $("loop").checked;
};
for (const k of ["speed", "first", "last", "count", "startBar"]) $(k).onchange = halt;
$("resetPlayback").onclick = () => {
  $("startBar").value = 1;
  halt();
  $("play").focus();
};
async function transport(fromId = null) {
  if ($("play").hasAttribute("aria-busy")) return;
  const loop = $("loop").checked,
    first = loop ? +$("first").value - 1 : +$("startBar").value - 1,
    last = loop ? +$("last").value - 1 : score.bars.length - 1;
  if (
    first < 0 ||
    last < first ||
    last >= score.bars.length ||
    !Number.isInteger(first) ||
    !Number.isInteger(last)
  )
    throw Error(loop ? "Set a valid first and last bar." : "Choose a start bar from 1 to " + score.bars.length + ".");
  if (fromId !== null) {
    if (!score.bars.slice(first, last + 1).some(bar => bar.events.some(n => n.id === fromId)))
      throw Error("Choose a note inside the loop or turn Loop bars off.");
    halt();
  }
  const request = ++playbackRequest;
  $("play").setAttribute("aria-busy", "true");
  try {
    if (playbackState === "playing") {
      await pause();
      if (request === playbackRequest) setPlaybackState("paused");
      return;
    }
    if (playbackState === "paused") {
      await resume();
      if (request === playbackRequest) setPlaybackState("playing");
      return;
    }
    setPlaybackState("playing");
    await play(
      score,
      {
        fromId,
        speed: +$("speed").value,
        count: $("count").checked,
        loop,
        first,
        last,
      },
      (id) => {
        lightNote(id);
        if (
          !$("pieces").open && lastLit &&
          (lastLit.getBoundingClientRect().bottom > innerHeight ||
            lastLit.getBoundingClientRect().top < 0)
        )
          lastLit.scrollIntoView({ block: "center" });
      },
      halt,
    );
  } catch (e) {
    if (request === playbackRequest) halt();
    throw e;
  } finally {
    if (request === playbackRequest) $("play").removeAttribute("aria-busy");
  }
}
$("play").onclick = guard(() => transport());
$("fromNote").onclick = guard(() => {
  if (!$("loop").checked)
    $("startBar").value = score.bars.findIndex(bar => bar.events.some(n => n.id === selected)) + 1;
  return transport(selected);
});
$("save").onclick = guard(async () => {
  const doc = score,
    encoded = JSON.stringify(doc);
  $("save").disabled = true;
  try {
    const res = await api(
      "library",
      json({ id: identity, revision, score: doc }),
    );
    if (doc === score) {
      identity = res.id;
      revision = res.revision;
      dirty = JSON.stringify(score) !== encoded;
      $("save").textContent = dirty ? "Save score" : "Saved ✓";
      message("Saved in My scores · revision " + revision);
    }
  } finally {
    $("save").disabled = false;
  }
});
$("export").onclick = guard(async () => {
  $("export").disabled = true;
  message("Preparing PDF…");
  try {
    const title = score.title;
    const r = await fetch("/api/pdf", json({ ...score, printOptions: { bows: $("showBows").checked, card: $("printCard").checked, bar: cardBar(), scale: $("fullScale").checked } }));
    if (!r.ok) throw Error((await r.json()).detail);
    const url = URL.createObjectURL(await r.blob()),
      a = elem("a");
    a.href = url;
    a.download = title + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    message("Annotated PDF downloaded.");
  } finally {
    $("export").disabled = false;
  }
});
function modal(title) {
  halt();
  dialogVersion++;
  $("dialogtitle").textContent = title;
  $("content").replaceChildren();
  $("dstatus").textContent = "";
  if (!$("dialog").open) $("dialog").showModal();
}
$("close").onclick = () => $("dialog").close();
$("dialog").addEventListener("close", () => dialogVersion++);
const discard = () =>
  !dirty || confirm("Leave this score and discard unsaved edits?");
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
$("library").onclick = guard(async () => {
  modal("My scores");
  const v = dialogVersion,
    rows = await api("library");
  if (v !== dialogVersion) return;
  if (!rows.length)
    $("content").append(elem("p", "Save a score to find it here next time."));
  for (const row of rows) {
    const b = button(songTitle(row), async () => {
      if (discard()) {
        const r = await api("library/" + row.id);
        accept(r.score, r.id, r.revision);
      }
    });
    b.className = "sourceitem";
    b.append(
      elem("small", "Revision " + row.revision + " · " + row.updated + " UTC"),
    );
    $("content").append(b);
  }
  $("content").append(
    button("Browse starter pieces", () => {
      $("dialog").close();
      $("pieces").open = true;
      $("switchPiece").focus();
    }),
  );
});
let pieceRequest = 0;
let libraryRequest = 0;
async function openPiece(path, title, savedId = null) {
  if (!discard()) return;
  const request = ++pieceRequest;
  const status = $("openingPiece");
  status.hidden = false;
  status.textContent = "Opening " + title + "…";
  try {
    const loaded = await api(path, { signal: AbortSignal.timeout(10000) });
    if (request !== pieceRequest || !$("pieces").open) return;
    accept(savedId ? loaded.score : loaded, savedId, loaded.revision || 0);
    $("switchPiece").focus();
  } catch (error) {
    if (request === pieceRequest)
      status.textContent = "Could not open " + title + ". " + error.message;
  }
}
$("starterChoices").onsubmit = (event) => {
  event.preventDefault();
  const entry = event.submitter;
  if (entry)
    openPiece(
      "example?piece=" + encodeURIComponent(entry.value),
      entry.firstChild.textContent,
    );
};
async function showSavedChoices() {
  const request = ++libraryRequest;
  const group = $("savedChoices");
  group.replaceChildren(elem("p", "Checking saved scores…"));
  try {
    const rows = await api("library", { signal: AbortSignal.timeout(8000) });
    if (request !== libraryRequest || !$("pieces").open) return;
    group.replaceChildren();
    if (!rows.length) return;
    group.append(elem("h3", "Saved scores"));
    for (const row of rows) {
      const entry = button(songTitle(row), () =>
        openPiece("library/" + row.id, row.title, row.id),
      );
      entry.className = "sourceitem";
      entry.append(elem("small", "Saved revision " + row.revision));
      group.append(entry);
    }
  } catch {
    if (request === libraryRequest && $("pieces").open)
      group.replaceChildren(
        elem("p", "Saved scores could not load."),
        button("Retry saved scores", showSavedChoices),
      );
  }
}
for (const [id, other] of [["pieces", "keys"], ["keys", "pieces"]]) {
  const picker = $(id);
  picker.ontoggle = () => {
    if (id === "pieces" && !picker.open) {
      pieceRequest++;
      libraryRequest++;
      $("openingPiece").hidden = true;
    }
    if (!picker.open) return;
    $(other).open = false;
    if (id === "pieces") showSavedChoices();
    else halt();
  };

}
document.addEventListener("pointerdown", (e) => {
  for (const id of ["pieces", "keys"])
    if (!$(id).contains(e.target)) $(id).open = false;
});
function labeled(parent, text, input) {
  const l = elem("label", text);
  l.className = "field";
  l.append(input);
  parent.append(l);
  return input;
}
function numberInput(label, parent, value, min, max) {
  const input = elem("input");
  input.type = "number";
  input.value = value;
  input.min = min;
  input.max = max;
  input.step = "any";
  return labeled(parent, label, input);
}
async function job(request, version) {
  message("Queued for conversion…");
  const { job: id } = await request;
  while (version === dialogVersion && $("dialog").open) {
    const data = await api("jobs/" + id);
    if (version !== dialogVersion) return;
    if (data.status === "error") throw Error(data.result);
    if (data.status === "ready") {
      const r = data.result;
      if (r.parts) partPicker(r);
      else accept(r);
      return;
    }
    message(
      data.status === "waiting"
        ? "Waiting for the local converter…"
        : "Converting your music…",
    );
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
}
function partPicker(result) {
  modal("Choose the melody part");
  const box = $("content"),
    v = dialogVersion;
  box.append(elem("p", result.title + " · " + result.source));
  const s = elem("select");
  result.parts.forEach((p, i) => s.add(option(i, p)));
  s.value = result.partIndex ?? 0;
  labeled(box, "Score part", s);
  box.append(
    button("Open annotated score", async () => {
      message("Preparing notes…");
      const r = await api("part/" + result.asset + "/" + s.value);
      if (v === dialogVersion) accept(r);
    }),
  );
}
function importTab(kind) {
  modal("Import music");
  const box = $("content"),
    v = dialogVersion;
  const tabs = elem("div");
  tabs.className = "tabs";
  box.append(tabs);
  for (const k of ["Search", "Image", "PDF", "Audio"]) {
    const b = button(k, () => importTab(k));
    b.classList.toggle("active", kind === k);
    tabs.append(b);
  }
  if (kind === "Search") {
    box.append(
      elem(
        "p",
        "Search starter scores and the OpenScore Lieder catalogue. Try “Twinkle” or “Die Forelle”.",
      ),
    );
    const row = elem("form");
    row.className = "searchrow";
    const q = elem("input");
    q.placeholder = "Title or composer";
    q.setAttribute("aria-label", "Title or composer");
    const submit = elem("button", "Search");
    row.append(q, submit);
    box.append(row);
    const results = elem("div");
    box.append(results);
    row.onsubmit = guard(async (e) => {
      e.preventDefault();
      results.replaceChildren();
      const matches = await api("search?q=" + encodeURIComponent(q.value));
      if (v !== dialogVersion) return;
      message(
        matches.length
          ? "Choose an edition."
          : "No available score for this search. Try another title or upload your music.",
      );
      for (const m of matches) {
        const b = button(songTitle(m), async () => {
          if (discard()) {
            if (m.example) {
              accept(await api("example?piece=" + m.example));
              return;
            }
            results.replaceChildren();
            await job(api("edition/" + m.id, { method: "POST" }), v);
          }
        });
        b.className = "sourceitem";
        b.append(
          elem(
            "small",
            m.composer +
              (m.example ? " · Starter score" : " · OpenScore Lieder"),
          ),
        );
        results.append(b);
      }
    });
    q.focus();
    return;
  }
  const form = elem("form");
  box.append(form);
  const file = elem("input");
  file.type = "file";
  file.required = true;
  file.accept = {
    Image: ".jpg,.jpeg,.png",
    PDF: ".pdf",
    Audio: ".mp3,.wav,.m4a,.flac,.aac,.ogg",
  }[kind];
  labeled(
    form,
    kind === "Image" ? "Photograph or scan of printed music" : kind + " file",
    file,
  );
  const pages = elem("input");
  let start, end, bpm;
  if (kind === "PDF") {
    pages.placeholder = "All pages, or 1-3, 5";
    labeled(form, "Pages to read (up to 12)", pages);
  }
  if (kind === "Audio") {
    form.append(
      elem(
        "p",
        "Choose up to 3 minutes. A clear solo melody gives the most useful draft.",
      ),
    );
    start = numberInput("Start (seconds)", form, 0, 0, 99999);
    end = numberInput(
      "End (seconds, blank for end of file)",
      form,
      "",
      0,
      99999,
    );
    bpm = numberInput("Tempo in BPM (blank to estimate)", form, "", 30, 240);
    bpm.step = "1";
  }
  const submit = elem("button", "Generate suggested score");
  submit.className = "primary";
  form.append(submit);
  form.onsubmit = guard(async (e) => {
    e.preventDefault();
    if (!discard()) return;
    const data = new FormData();
    data.set("file", file.files[0]);
    if (pages.value) data.set("pages", pages.value);
    for (const [key, field] of [
      ["start", start],
      ["end", end],
      ["bpm", bpm],
    ])
      if (field?.value) data.set(key, field.value);
    submit.disabled = true;
    try {
      await job(api("upload", { method: "POST", body: data }), v);
    } finally {
      submit.disabled = false;
    }
  });
}
$("import").onclick = () => importTab("Search");
let width = 0,
  resizeTimer;
new ResizeObserver((entries) => {
  const w = entries[0].contentRect.width;
  if (Math.abs(w - width) > 3) {
    width = w;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (score) {
        drawStaff();
      }
    }, 120);
  }
}).observe($("notation"));
const initial = JSON.parse($("initialScore").textContent);
accept(initial.score, null, 0, true);
if (initial.key !== score.key) changeKey(initial.key);
if ($("pieces").open) showSavedChoices();
