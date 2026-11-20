# Violin for Beginner — Product direction

Status: agreed product direction. The local P0 feedback build is described in
[MILESTONES.md](MILESTONES.md). See [ARCHITECTURE.md](ARCHITECTURE.md) for the
implemented technical design.

## Problem and intended outcome

A beginner wants to play a recognizable melody but cannot comfortably read staff
notation. Translate a chosen piece into a suggested violin score that combines
staff rhythm with clear string-and-finger instructions, demonstration playback,
and printable output.

The core promise is: bring music, receive a reviewable annotated score, and use it
to understand what to play and when. This is a lightweight score assistant.

## Intended user

A violin beginner who recognizes string names and finger numbers more readily
than pitches on a staff. The product must support G, D, A, and E strings, not just
the strings used in examples.

## Agreed P0 scope

All four input routes belong to P0. They may be built in sequence, but P0 is not
complete with only image/PDF import.

| Input | User flow | Required behavior |
| --- | --- | --- |
| Score image | Upload a photo or screenshot | Recognize notation; expose unreadable or uncertain passages for review |
| PDF | Upload and select pages | Recognize the score; select the melody/part when multiple parts exist |
| Title search | Search for a piece and select a result | Confirm the piece/version, show provenance, and use an available source; explain when no usable source exists |
| Audio | Upload and select the whole recording or a segment | Produce a suggested main-melody transcription that the user can audition and correct |

Specific file formats, size/page/duration limits, search providers, and supported
notation complexity remain to be validated. Audio is a suggested transcription,
not a promise of perfect reconstruction of every instrument in a recording.

### Unified output

- Staff notation with aligned per-note string/finger labels.
- G / D / A / E string support, open strings, finger numbers, and necessary
  placement hints such as low/high finger placement.
- A concise legend explaining the notation.
- Demonstration playback with synchronized highlighting.
- Playback can pause and resume at the same position. Reset returns to the start of the piece or selected loop. Speed, count-in and loop bars are adjustable.
- Save and reopen the annotated score.
- Export a clearly laid-out annotated PDF with its legend for printing.
- Clear identification of the source, selected part/segment, simplification,
  transposition, and any passages needing review.

The suggested version should be a usable first draft. Prefer an accessible
single melody and preserve recognizable melody and rhythm. Disclose any changes;
do not silently rewrite the source to fit the beginner setting.

### Annotation meaning

Examples: `G` = open G string; `G1` = G string, first finger; `D3` = D string,
third finger; `A2` = A string, second finger; `E4` = E string, fourth finger.

These are string/finger labels, not scientific pitch names. Additional placement
hints are required where the bare label would be ambiguous. The exact visual
syntax, default hand-position range, and fingering preferences need validation.

### Review and correction

Users must be able to audition a generated result and make minimal corrections
to note pitch, duration, or assigned fingering. This is not a full notation editor.
Changes must propagate to notation, playback, saved revisions, and PDF export.
Keep original source material available for comparison.

Uncertainty must be visible and actionable. Do not label an entire generated
score as verified solely because the conversion process succeeded.

## Core journey

1. Upload an image/PDF/audio file, or search by title.
2. Confirm the piece, version, pages, part, or audio segment as applicable.
3. Generate a suggested annotated score.
4. Inspect the score, audition it, and correct errors when needed.
5. Adjust playback speed or loop selected measures as reading aids.
6. Save the score and/or export a printable PDF.

The result page should make the score the primary content and show upcoming
notes, not only the currently sounding note. Avoid prerequisite music-theory
questionnaires before the first useful result.

The piece picker groups related repertoire and sorts by English title within each group.

Each built-in piece displays its original title alongside its Simplified Chinese name in the piece picker, search, saved scores, score heading and printed PDF. Either name can be used for title search.

The score paper and printed PDF include a readable fingering guide for open
strings, finger numbers and low/high placement. The piece picker identifies
excerpts by name. Each edition identifies its source and any changes to the melody, key or rhythm.

The public catalogue contains original studies, beginner arrangements of public-domain melodies and documented third-party editions. Each new public score needs a redistribution and adaptation basis for its particular edition. Musicians can import other repertoire locally when they have permission to use it. The application uses PolyForm Noncommercial 1.0.0, including its permission for use by educational institutions. [License](LICENSE)

## Version consistency

Notation, finger labels, playback, saved content, and exported PDF must represent
the same score revision. The original source and any simplified/transposed
arrangement remain distinguishable. Never overwrite an explicit correction
without making the change visible to the user.

## Beyond P0

- Guided phrase-by-phrase lessons and practice curricula.
- Practice history, progress tracking, and daily goals.
- Microphone listening, performance scoring, and intonation/rhythm feedback.
- Broader teaching features and advanced notation editing.

Playback, count-in, speed changes, and looping remain in P0 even though they can
also support practice.

## P0 delivery criteria

- Each of the four input routes has a working end-to-end path to an annotated
  score, save/reopen, and PDF export on representative supported examples.
- Title search returns real selectable sources and has an honest no-source state.
- Audio produces an auditionable suggested melody with a correction path.
- All four strings and necessary placement hints are covered by reference cases.
- Playback/highlighting, tempo changes, count-in, and loops follow the displayed
  score, including after edits.
- Saved/reopened scores preserve corrections and source/version information.
- Exported pages keep notes and their labels together, include a legend, and have
  no clipped or overlapping notation in the agreed reference set.
- Failed, unsupported, and uncertain conversions have understandable next steps.

Quantitative accuracy, latency, supported-input limits, and browser/device targets
will be set after feasibility experiments. They are not measured guarantees yet.

## Decisions to revisit after the local feedback build

- Hosted deployment and operating costs.
- Search sources and the breadth of the initial searchable repertoire.
- Audio quality envelope, especially accompanied versus isolated melodies.
- Default hand-position range and rules for alternative fingerings.
- Further simplification preferences. The local build supports explicit key selection and reversible transposition.
- Interface language, target devices, and initial account/storage model.
- Quality targets based on real beginner correction effort and repertoire coverage.
