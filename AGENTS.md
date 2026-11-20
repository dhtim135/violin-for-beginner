# Repository guide

## Purpose and product authority

Build a lightweight app that helps violin beginners turn music into readable,
playable, printable sheet music with string-and-finger annotations.
Use `PRODUCT.md` for agreed scope, `ARCHITECTURE.md` for implemented boundaries,
`MILESTONES.md` for delivery status, `TESTING.md` for verification and
`INSTRUCTIONS.md` for setup and operation. Keep these guides current with changes.

## Working agreements

- Commit completed changes progressively, grouping each feature or fix with its tests and documentation.

- Ground stack changes in the measured results in `experiments/m0/FINDINGS.md`
  and the current local architecture.
- Keep the experience approachable for beginners. Chinese and English terminology
  may be used in discussion. The current UI is English with a bilingual fingering
  guide in the user instructions.
- Preserve all four P0 input routes: score images, PDFs, title search, and audio
  conversion. Incremental milestones must not silently remove a route from P0.
- P0 includes playback aids, but not a guided practice curriculum or performance
  assessment. Do not expand scope without a concrete product reason.
- Record agreed changes in `PRODUCT.md`. Clearly distinguish experiments,
  proposals, measured results, and confirmed decisions.

## Musical and data invariants

- Support all four violin strings: G, D, A, E.
- User labels such as `E4` mean E string, fourth finger. Never parse them as
  scientific pitch notation. Store pitch, string, finger, hand position, and
  finger-placement modifiers separately.
- Show necessary finger-placement guidance; a finger number alone is not always
  sufficient. Do not silently assign an impossible fingering.
- Fingering depends on the musical context. Preserve explicit user corrections.
- Preserve source material and distinguish it from generated or edited versions.
  Disclose simplification, transposition, and selected melody/segment.
- Treat recognition and transcription as fallible. Keep reviewable uncertainties;
  do not invent confidence scores that the underlying system cannot support.
- Screen notation, fingering, playback, saved data, and exported PDF must derive
  from the same score revision. An edit must not leave stale playback or exports.
- Search must identify an actual piece/version and source. A title match alone is
  not a usable score, and unavailable content must not be fabricated.

## Engineering expectations

- Prefer established notation, recognition, and audio tools over rebuilding them.
  Evaluate accuracy, maintenance, runtime requirements, and licenses before adoption.
- Keep source ingestion separate from the shared score and fingering pipeline.
- Keep expensive conversion work outside interactive request handling; expose
  meaningful progress, errors, and retries when that pipeline is implemented.
- Preserve provenance and source-use information for imported/search content.
- Do not commit credentials, private uploads, model weights, or generated bulk files.
- Test meaningful musical cases: accidentals, rests, ties, rhythm, all four strings,
  alternate fingerings, edits, and consistency between playback and export.
- Visually inspect representative annotated scores and printed pages. Recognition
  quality claims require a labeled evaluation set, not just a successful demo.
- Add setup commands and exact dependency versions after the stack is selected;
  do not document commands as working before they have been verified.

## Current state

The local P0 feedback build is implemented. Start it with `./scripts/start.sh`
after setup. Run `npm test` to verify the musical model and real browser routes.
The production hosting target and application license remain open.
