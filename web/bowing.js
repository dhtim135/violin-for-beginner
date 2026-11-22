// A join names the previous attack. Inserting or deleting an unrelated note
// must never attach a saved slur to the new neighbour.
export function bowPlan(score) {
  const plan = new Map();
  let previous, stroke, nextDirection = "down";
  for (const bar of score.bars) {
    for (const note of bar.events) {
      if (note.pitch === null) {
        previous = stroke = null;
        nextDirection = "down";
        continue;
      }
      const edit = note.bowEdit;
      const direction = edit?.direction || note.sourceBow;
      const tied = previous?.tie && previous.pitch === note.pitch;
      const joinFrom = edit ? edit.joinFrom : note.sourceJoin;
      const joined = previous && joinFrom === (previous.attackId || previous.id);
      if (!stroke || !(tied || (joined && (edit || !direction)))) {
        const chosen = edit ? edit.direction : direction;
        stroke = { direction: chosen || nextDirection, ids: [], slurred: false };
        nextDirection = stroke.direction === "down" ? "up" : "down";
      } else if (!tied) {
        stroke.slurred = true;
      }
      const origin = tied ? "Tie" : edit ? "Your edit" :
        note.sourceBow || joined ? "Source notation" : "Suggested";
      stroke.ids.push(note.id);
      plan.set(note.id, { stroke, origin, tied: Boolean(tied) });
      previous = note;
    }
  }
  return plan;
}
