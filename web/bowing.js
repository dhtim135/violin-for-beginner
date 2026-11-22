// A join names the previous attack. Inserting or deleting an unrelated note
// must never attach a saved slur to the new neighbour.
export function bowPlan(score) {
  const plan = new Map();
  let previous, stroke, attackId, nextDirection = "down";
  for (const bar of score.bars) {
    for (const note of bar.events) {
      if (note.pitch === null) {
        previous = stroke = null;
        nextDirection = "down";
        continue;
      }
      const edit = note.bowEdit;
      const direction = edit ? edit.direction : note.sourceBow;
      const tied = Boolean(previous?.tie && previous.pitch === note.pitch);
      const joinFrom = edit ? edit.joinFrom : note.sourceJoin;
      const joined = previous && joinFrom && !direction &&
        (joinFrom === previous.id || joinFrom === attackId);
      if (!tied && !joined) {
        stroke = { direction: direction || nextDirection, ids: [], slurred: false };
        nextDirection = stroke.direction === "down" ? "up" : "down";
      } else if (joined && !tied) {
        stroke.slurred = true;
      }
      // Only synthetic tied fragments represent the same original attack ID.
      if (!tied || !note.attackId) attackId = note.id;
      let origin = "Suggested";
      if (tied) origin = "Tie";
      else if (edit && (!edit.joinFrom || joined)) origin = "Your edit";
      else if (direction || joined) origin = "Source notation";
      stroke.ids.push(note.id);
      plan.set(note.id, { stroke, origin, tied });
      previous = note;
    }
  }
  return plan;
}
