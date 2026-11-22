# Delivery milestones

**Current delivery: local P0 feedback build.** All four entry points reach an editable annotated score, playback, local saving and downloadable PDF. The build targets one musician on the verified Mac configuration. Field feedback will establish which kinds of source material are practical for beginners.

| Milestone | Delivered | Evidence |
| --- | --- | --- |
| M0 · Feasibility | Local rendering, image/PDF recognition, catalogue retrieval and transcription experiments. | [Measured findings and limits](experiments/m0/FINDINGS.md) |
| M1 · Score workspace | Direct piece switching, enlarged score paper, key selection, four-string first-position suggestions, low/high placement, per-note correction, alternate fingerings, undo, speed, count-in, bar loops, save/reopen and annotated PDF. | Musical regression tests and a browser exercise that checks a fingering correction in the PDF. |
| M2 · Image and PDF | Real Audiveris conversion, PDF page selection, part selection, original-source comparison and retryable failure messages. | Generated PNG and PDF fixtures exercised from file picker through download. M0 also measured skewed pages and multi-part excerpts. |
| M3 · Search | Pinned index of 1,462 online editions and 31 public offline pieces, including 20 nursery arrangements. Existing private editions also appear in the local picker. Named part choices, edition links and a no-match state. | Search, fetch, save and print of *Just for Today* in the browser. |
| M4 · Audio draft | Segment selection, tempo estimation/override, predominant-line suggestion, sixteenth-note quantization, clip audition and corrections. | Uploaded WAV exercised end to end. Five paired performances evaluated independently of the UI. Dense accompaniment remains experimental. |
| M5 · Local integration | Startup/setup scripts, isolated browser tests, local storage, sample inputs, print inspection and operating guides. | [Verification record](TESTING.md) and [user instructions](INSTRUCTIONS.md). |

The score workspace also includes editable bow directions and slurs, playback highlighting by stroke and a printable, transposition-aware practice card. *Ode to Joy* is the reference exercise.

## Acceptance boundary

Supported examples have a working path through export. Search availability depends on an edition in the catalogue. Recognition produces a reviewable draft. Pitches beyond the first-position range need correction or an explicit transposition. The measured audio results do not establish accuracy for arbitrary songs.

The first feedback round should establish three things: whether the string/finger notation is readable while holding the violin, how long it takes to correct a short phrase, and which requested songs the catalogue can actually supply. Real phone photos, page curvature, mixed commercial recordings and unassisted beginner correction time remain important evaluation gaps.

## Updating the roadmap

Record the user's source category, observed problem, desired outcome and reproducible example in the relevant milestone. Update the acceptance check in TESTING.md when making a fix. Guided practice lessons, progress tracking and performance scoring are future product decisions. The agreed P0 playback controls already ship.
