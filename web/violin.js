import { strings, shortFinger } from "./music.js";
import { writtenPitch } from "./keys.js";

// Front view with the scroll up. The bridge fans the strings out from the nut.
// All moving marks share the same string coordinates as the instrument.
const nut = 60, bridge = 227, center = 118;
function stringX(index, y) {
  const spacing = 3.3 + (y - nut) / (bridge - nut) * (8.3 - 3.3);
  return center + (index - 1.5) * spacing;
}
let template;
function handsTemplate() {
  if (template) return template;
  template = document.createElement("template");
  template.innerHTML = `
    <figure class="hands-guide">
      <svg viewBox="0 0 240 328" role="img" aria-label="Violin seen from the front with scroll up">
        <g stroke="#65412b" stroke-width="1.8" stroke-linejoin="round">
          <path fill="#c88b50" d="M109 142 C92 135 72 142 66 163 Q61 181 62 186 L59 192 Q70 188 75 194 Q83 209 60 219 L64 222 C42 246 46 279 66 295 Q83 309 111 310 Q118 316 125 310 C152 311 176 299 184 278 Q195 249 172 222 L176 219 Q153 209 161 194 Q166 188 177 192 L174 186 Q175 178 170 162 C163 143 146 135 127 142Z"/>
          <path fill="none" stroke="#a36c41" d="M105 145 Q75 137 68 166 M131 145 Q160 137 168 166 M58 241 Q43 293 104 305 M178 241 Q193 293 132 305"/>
          <path fill="#ba834f" d="M111 146 L113 42 Q105 32 110 23 Q118 14 126 24 Q132 33 123 43 L126 146Z"/>
          <g fill="#503a30"><path d="M111 41l-11 -2v-4l12 2m11 8 13 -2v-4l-13 2m-12 8-10 1v4l10 -1m12 1 12 1v4l-12 -1"/></g>
          <path fill="#c89764" d="M111 27c0-11 18-12 18 0 0 9-13 11-14 3 0-6 8-7 8-2"/>
          <path fill="#393e36" d="M111 60h14l6 138h-26Z"/>
          <path fill="#e7c58a" d="M100 232l2-9q16-5 32 0l2 9-7-1-1-3h-20l-1 3Z"/>
          <path fill="#424239" d="M103 255q15 3 30 0l-10 45h-10Z"/>
          <path fill="#524a3a" d="M66 276q14-12 36-3 11 9 6 19-16 13-38-2Z"/>
        </g>
        <g fill="none" stroke="#633e2b" stroke-width="2.8" stroke-linecap="round">
          <path d="M91 197q5-5 5 1c0 9-9 13-9 27q0 8-5 4m4-12h9"/>
          <path d="M145 197q-5-5-5 1c0 9 9 13 9 27q0 8 5 4m-4-12h-9"/>
        </g>
        ${strings.map((_, i) => `<path data-wire="${i}" fill="none" stroke="#dbd6ba" stroke-width="1.25" d="M${stringX(i,nut)} ${nut} L${stringX(i,bridge)} ${bridge} L${center+(i-1.5)*6} 259"/>`).join("")}
        <path stroke="#e6d9b9" stroke-width="2" d="M110 60h16"/>
        <g class="bow-picture">
          <path d="M9 211q73-6 204-4" fill="none" stroke="#64452e" stroke-width="2.6"/>
          <path d="M10 211v5h198v-6" fill="none" stroke="#ae9566" stroke-width="2"/>
          <path d="M198 205h17v9h-18Z" fill="#403c32"/>
          <circle class="bow-contact" cy="216" r="3.8" fill="#923b13" stroke="white"/>
          <path class="bow-arrow" d="M-19 0h38m-6-5 6 5-6 5" fill="none" stroke="#923b13" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g class="finger-guide">
          <path class="finger-leader" fill="none" stroke="#17644b" stroke-width="1.6"/>
          <text class="finger-tag" x="63" text-anchor="end" fill="#17543f" font-family="sans-serif" font-size="19" font-weight="bold"></text>
          <circle class="finger-spot" r="5.5" stroke-width="2.5"/>
        </g>
      </svg>
      <figcaption>
        <div class="hands-note"></div>
        <div><b>Left hand · 左手</b><span class="left-cue"></span></div>
        <div><b>Right hand · 右手</b><span class="right-cue"></span></div>
      </figcaption>
    </figure>`;
  return template;
}

export function renderHands(host, note, bow, key) {
  if (!host.firstElementChild) host.append(handsTemplate().content.cloneNode(true));
  const get = selector => host.querySelector(selector);
  const f = note.fingering;
  const wireIndex = strings.findIndex(([name]) => name === f?.string);
  const playable = note.pitch !== null && wireIndex >= 0;
  const rest = note.pitch === null;
  let left = rest ? "Rest" : "Check finger position";
  if (playable) {
    const finger = ["open string", "first finger", "second finger", "third finger", "fourth finger"][f.finger];
    left = [f.string + " string", [f.placement, finger].filter(Boolean).join(" ")].join(" · ");
  }
  const down = bow?.stroke.direction === "down";
  const continueBow = bow && bow.stroke.ids[0] !== note.id;
  const right = bow ? (continueBow ? "Continue " : "Start ") + (down ? "down bow" : "up bow") +
    " · " + (down ? "frog to tip" : "tip to frog") : "Rest the bow";
  get(".hands-note").textContent = rest ? "Rest" : writtenPitch(note.pitch, key);
  get(".left-cue").textContent = left;
  get(".right-cue").textContent = right;
  get("svg").setAttribute("aria-label", "Violin, scroll up. " + left + ". " + right + ".");
  host.dataset.handNote = note.id;
  for (const [index, wire] of [...host.querySelectorAll("[data-wire]")].entries())
    wire.classList.toggle("active-wire", playable && index === wireIndex);
  const spot = get(".finger-spot"), contact = get(".bow-contact");
  get(".finger-guide").style.display = contact.style.display = playable ? "" : "none";
  if (playable) {
    const semitones = note.pitch - strings[wireIndex][1];
    const y = nut + (bridge - nut) * (1 - 2 ** (-semitones / 12));
    const x = stringX(wireIndex, y);
    get(".finger-leader").setAttribute("d", "M67 " + y + "H" + x);
    get(".finger-tag").setAttribute("y", y + 5);
    get(".finger-tag").textContent = shortFinger(f);
    spot.setAttribute("cx", x);
    spot.setAttribute("cy", y);
    spot.setAttribute("fill", f.finger ? "#17644b" : "white");
    spot.setAttribute("stroke", f.finger ? "white" : "#17644b");
    contact.setAttribute("cx", stringX(wireIndex, 216));
  }
  get(".bow-picture").style.display = bow ? "" : "none";
  get(".bow-arrow").setAttribute("transform", "translate(189 194) scale(" + (down ? 1 : -1) + " 1)");
}
