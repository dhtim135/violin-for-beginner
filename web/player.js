let ctx,
  voices = [],
  timer,
  animation,
  startUpdates,
  generation = 0;
function stopUpdates() {
  clearInterval(timer);
  cancelAnimationFrame(animation);
}
export function stop() {
  generation++;
  stopUpdates();
  startUpdates = null;
  for (const osc of voices) {
    try {
      osc.stop();
    } catch {}
  }
  voices = [];
}
export async function pause() {
  // The audio clock holds both scheduled notes and the visual playhead in place.
  const ticket = generation;
  await ctx.suspend();
  if (ticket === generation) stopUpdates();
}
export async function resume() {
  const ticket = generation;
  await ctx.resume();
  if (ticket === generation) startUpdates?.();
}
function tone(freq, at, length, click = false) {
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = click ? "sine" : "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(
    click ? 0.12 : 0.22,
    at + Math.min(0.018, length / 4),
  );
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(gain).connect(ctx.destination);
  voices.push(osc);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    voices = voices.filter((v) => v !== osc);
  };
  osc.start(at);
  osc.stop(at + length + 0.01);
}
export async function play(
  score,
  { speed, count, loop, first, last, fromId },
  highlight,
  done,
) {
  stop();
  const ticket = generation;
  ctx ||= new AudioContext();
  await ctx.resume();
  if (ticket !== generation) return;
  const beat = 60 / (score.bpm * speed),
    bars = score.bars.slice(first, last + 1);
  const notes = bars.flatMap((b) => b.events);
  const startIndex = fromId == null ? 0 : notes.findIndex(n => n.id === fromId);
  if (startIndex < 0) throw Error("Choose a note inside the selected loop.");
  const startBar = fromId == null ? bars[0] : bars.find(bar => bar.events.some(n => n.id === fromId));
  const [num, den] = startBar.meter.split("/").map(Number);
  const start = ctx.currentTime + 0.08;
  let t = 0;
  const timeline = notes.map((n) => {
    const item = { n, t, len: (n.ticks / 96) * beat };
    t += item.len;
    return item;
  });
  const initial = start + (count ? (num * beat * 4) / den : 0);
  const offset = timeline[startIndex].t;
  const cycle = t;
  let base = initial - offset;
  if (count)
    for (let i = 0; i < num; i++)
      tone(i ? 850 : 1200, start + (i * beat * 4) / den, 0.05, true);
  let idx = startIndex,
    firstAttack = true,
    ended = false,
    active;
  function schedule() {
    while (!ended && base + timeline[idx].t < ctx.currentTime + 0.16) {
      const { n, t, len } = timeline[idx];
      if (
        n.pitch !== null &&
        !(
          !firstAttack && idx > 0 &&
          timeline[idx - 1].n.tie &&
          timeline[idx - 1].n.pitch === n.pitch
        )
      ) {
        let duration = len,
          j = idx;
        while (timeline[j].n.tie && timeline[j + 1]?.n.pitch === n.pitch)
          duration += timeline[++j].len;
        tone(
          440 * 2 ** ((n.pitch - 69) / 12),
          base + t,
          Math.max(0.03, duration * 0.98),
        );
      }
      firstAttack = false;
      if (++idx === timeline.length) {
        idx = 0;
        if (loop) base += cycle;
        else ended = true;
      }
    }
  }
  function draw() {
    const elapsed = ctx.currentTime - initial;
    const position = elapsed + offset;
    if (!loop && position >= cycle) {
      stop();
      done();
      return;
    }
    if (elapsed >= 0) {
      const pos = position % cycle;
      const item = timeline.findLast((x) => x.t <= pos);
      if (item && item.n.id !== active) {
        active = item.n.id;
        highlight(active);
      }
    }
    animation = requestAnimationFrame(draw);
  }
  startUpdates = () => {
    schedule();
    timer = setInterval(schedule, 40);
    draw();
  };
  startUpdates();
}

export async function audition(pitch) {
  if (pitch === null) return;
  stop();
  const ticket = generation;
  ctx ||= new AudioContext();
  await ctx.resume();
  if (ticket !== generation) return;
  tone(440 * 2 ** ((pitch - 69) / 12), ctx.currentTime + 0.02, 0.5);
}
