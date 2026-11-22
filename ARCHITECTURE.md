# Stringbook architecture

This is a single-user, loopback web app. One Python process serves a JavaScript client, a SQLite library and one background conversion worker. Local disk holds source media. The web experience does not require an account or cloud provisioning.

## Data flow

| Entry | Conversion | Handoff |
| --- | --- | --- |
| Image / PDF | Store the original. For PDF, extract the selected pages with pypdf. Run the Audiveris CLI and read its compressed MusicXML. | List recognized parts for selection. Retain the original for comparison. |
| Search | Match title/composer against the pinned OpenScore Lieder path index. Fetch only the selected edition from that repository and revision. Local starter editions are available directly. | Keep the source URL, credit and selected part. |
| Audio | FFmpeg extracts the chosen clip. Basic Pitch with ONNX detects candidate notes. Use supplied tempo or librosa beat estimation. Rank notes by coverage, strength, register and continuity on a sixteenth-note grid. | Return an editable 4/4 melody draft, clip reference, tempo and source times. |
| Selected notation part | music21 reads sounding pitch, expands supported repeats, selects the upper pitch during overlap and preserves rests, measure lengths and ties. | Return one ordered sequence of measures with review notices. |

`studio/server.py` owns API routes, upload limits, job state, library transactions and PDF requests. `studio/score.py` owns notation import and the original starter fixtures. `studio/starters.py` provides the shared offline browse/search catalogue and additional arrangements.

At startup, the catalogue also reads an optional `private-editions.json` in the local data directory. Each entry is keyed by its piece ID and contains the picker row and normalized score. These local entries follow the same browse, search, playback, save and print paths as built-in pieces. A fresh install gets the public catalogue. The setup script fetches tools and dependencies only.

`assets/babys-opera.zip` holds the three selected MusicXML transcriptions from Project Gutenberg’s edition of *The Baby’s Opera*. `studio/nursery.py` selects the upper staff, applies each tune’s practice key and tempo, and uses the same score normalizer as imports. The catalogue links each arrangement to its corresponding printed score. [Source collection](https://www.gutenberg.org/ebooks/25418)

`studio/transcribe.py` owns audio inference and melody selection.

`studio/ui.py` serves the opening score and both picker forms in the HTML response. Starter choices work independently of the saved-library lookup. On startup the server snapshots the browser modules, renderer and stylesheet under a content-derived URL shared by the score and print views. Restart the server to pick up frontend changes.

## Shared score

A score contains title, source, source kind, selected part or segment, tempo, notices and measures. A measure contains a meter and ordered events. An event contains a stable ID, sounding MIDI pitch (null for rest), duration in ticks at 96 ticks per quarter, forward tie, review flag and fingering. Fingering stores string, finger, placement and position. The optional key stores tonic and mode. Known starter keys and unambiguous declared source keys drive the signature. Older unkeyed scores can be identified by the user. The renderer spells notes against the selected signature, with measure-local accidentals. ABCJS wraps measures to the available width and reserves a lyric row for the fingerings. Each system has its own SVG for pagination. The screen uses a larger staff scale than the A4 print view. The immutable original preserves source spelling and layout.

The piece and key choosers use HTML disclosure panels. Loading the initial example preserves an open panel and yields to a piece already chosen. Static app assets revalidate on reload.

The browser chooses fingerings by minimizing a cost across the phrase. Each playable pitch has candidates on G3/D4/A4/E5 through seven semitones above each open string. The costs balance string crossings, finger motion and fourth-finger use. A user selection fixes that event's candidate. Unsupported pitches remain visible. Suggested transposition is explicit and reversible.

`web/music.js` prepares the editable score, breaks composite durations into tied values, maps stable event IDs to selectable SVG notes and formats the short labels. The beginner arrangement may quantize fine subdivisions to a 32nd-note grid. Rests remain editable. The browser and export page render the same score using abcjs. M0 established feasibility with OSMD. The app uses abcjs for its browser note-selection API and independent staff layout for pagination. ABC text is derived during rendering.

`web/player.js` schedules the score in Web Audio, respects ties and highlights notes against the audio clock. Pause suspends the audio clock and stops the scheduling and highlight timers. An exact-note start offsets the audio clock and initial event index within the chosen range. Loop repeats use the full range, and starting on a tied continuation sounds its remaining duration. Resume restarts the timers on the same timeline, preserving the remaining duration of a note, count-in or loop. It uses a synthesized demonstration tone. `web/app.js` manages selection, editing, audition, undo, save/reopen and job polling. The PDF route sends the current score snapshot to a local headless Chrome process that uses `web/print.html` and the same notation renderer, including unsaved edits.

## Bowing

`studio/score.py` reads explicit directions into `sourceBow` and records simple bowed-string slurs as `sourceJoin` links to the preceding event. The browser keeps user overrides in `bowEdit`. `web/bowing.js` derives strokes on demand, alternating directions between attacks and starting down after rests. A tie continues the stroke. Each note created by splitting a duration retains the attack identity for join lookup. Scores saved before these fields existed get suggestions on opening.

The workspace and print view use the same stroke plan and centered bow labels. `web/practice-card.js` places the current finger assignments on a semitone grid and groups the selected bar by stroke. `web/violin.js` renders both hands from the same event, fingering and stroke on screen and in print. The nut and bridge anchor each distinct pitch/string placement in the current revision. Leaders connect the dots to labels spaced on either side of the neck. Playback updates the active marker within that map. PDF options travel with the export snapshot, including the practice card’s preview note. Playback uses the stroke groups for visual highlighting and retains the synthesized pitch demonstration.

## Persistence and lifecycle

The library transaction updates the latest score and inserts its revision snapshot atomically. The client provides the expected revision and gets HTTP 409 on stale updates. Reopening loads the latest revision. UI undo covers recent edits in the active tab. The revisions table also retains saved snapshots.

Uploads and conversions use unique directories under `VIOLIN_DATA`. Originals never share output names with derivatives. SQLite holds job states and results. A single worker serializes expensive imports. API threads can keep serving the UI. Startup marks interrupted jobs as failed. Run a single server process per library. This design targets one local musician and has no tenant or remote-authentication layer.

## Dependencies and boundaries

Node dependencies are locked in `package-lock.json`. Python and ONNX dependencies are locked for macOS arm64 in `requirements-macos-arm64.txt`. The local Audiveris distribution is AGPL-3.0. The CLI runs as an external process. Review dependency terms before bundling or hosting a distribution. Each online score records the OpenScore Lieder CC0 credit. Source references: [Audiveris](https://github.com/Audiveris/audiveris), [OpenScore Lieder edition snapshot](https://github.com/OpenScore/Lieder/tree/38c5db510224d9facdc4b08d741fc788cfb58ea8), [Basic Pitch](https://github.com/spotify/basic-pitch), [abcjs](https://github.com/paulrosen/abcjs), [music21](https://github.com/cuthbertLab/music21).

Update this document when an input contract, score field, timing unit, persistence rule or runtime boundary changes. Use [TESTING.md](TESTING.md) to identify the regression checks affected by the change.
