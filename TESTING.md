# Verification and known limits

Run from the repository root after setup. The browser suite starts its own server on a temporary loopback port and stores its SQLite database, originals, screenshots and downloads under `.runtime/test-*/`. The ordinary library under `.data/` is independent.

```sh
npm test
```

The suite needs local Chrome (or CHROME_BIN), Audiveris, FFmpeg, the pinned Python environment, Poppler's pdftotext and internet access for the selected OpenScore edition. A model-backend warning about missing TensorFlow/CoreML/TFLite is expected when using ONNX. The worker log can also report unsupported MusicXML dynamics.

| Check | Command or procedure | Observed |
| --- | --- | --- |
| Musical model | `node --test tests/music.test.js` | All strings, semitone placement, a locked alternate fingering, unsupported pitches, rebarring and tied durations. |
| Source normalization | `.venv/bin/python -m unittest discover -s tests` | Offline starter editions have complete bars and playable first-position pitches. Repeat expansion preserves rests and durations. Overlapping parts and tie flags are represented in the suggested line. |
| User workflows | `node tests/workflows.mjs` | Blocks legacy asset URLs and the app module, selects a local triplet study and D major using the page forms, then checks the transposed first note when the module loads. Holds the saved-library response open while switching pieces and changing key. Switches pieces, transposes D major to A major, undoes the change, then verifies the selected key after saving, reopening and exporting. Checks eighth-note triplets, full-width paper, edits and playback. Checks that Pause holds the highlighted note, Resume advances within the selected loop, Reset restarts the selected range, and a count-in can be paused and resumed. Checks bar and note starts, loop wraparound after an exact-note start, uninterrupted browsing and stopping when a replacement piece opens. Exercises every input through library save/reopen and PDF download. Checks a changed finger label in PDF text, absent titles, invalid pages, stale-save rejection and mobile overflow. |
| Visual inspection | Desktop workspace and rendered second page of a multi-page catalogue export | Staffs, notes and compact low/high finger labels remain together. Each system has its bar range. The print background is white. |
| Setup | `./scripts/setup.sh` on the prepared Apple Silicon machine | Dependency installation and prerequisite checks passed. The Audiveris binary was previously extracted from the pinned arm64 disk image and exercised by real conversions. |

The browser suite generates its own 24-bar study in the temporary local library. It measures gaps, baselines and notehead alignment across all 216 finger labels at 390 px and 1300 px. It checks the grouped picker order with the app module blocked, and checks bilingual titles in the picker, a saved score and a PDF. The model suite verifies the public catalogue independently of any private collection.

The public catalogue test checks the seven retained titles. All offline editions are checked for matching bilingual titles, measure lengths and first-position range.

The bowing checks cover source up-bows, violin versus piano slurs in MusicXML, tied durations, rests, group edits and scale spelling. The browser joins two notes in *Twinkle, Twinkle, Little Star*, changes and saves a bow direction, reopens the edition, checks playback highlighting and transposition, and inspects the PDF card and mobile viewport.

## Quality measurements

The M0 recognizer recovered all expected pitch/rest and duration pairs in 12 simple generated inputs. On three more complex voice-and-piano PDFs, the default recognized part matched 11/16, 26/38 and 4/30 expected events respectively. Part selection and source comparison matter. These results cover the measured excerpts. [M0 findings](experiments/m0/FINDINGS.md)

The app's audio selector was evaluated on five Bach10 violin recordings and the same five quartet mixes. A match requires identical pitch and onset within 100 ms of a reference violin note, matched once. Results below count suggested musical attacks before splitting sustained notes into tied notation. Each group has 224 reference notes.

| Audio input | M0 baseline matches / suggestions | App matches / suggestions |
| --- | --- | --- |
| Solo violin | 215 / 315 | 198 / 301 |
| Quartet mix | 184 / 744 | 143 / 452 |

The app's counts include estimated tempo and sixteenth-note quantization. M0 evaluated unquantized detections grouped by attack. The app produced fewer suggestions and fewer correct timed matches. Grid timing, especially on expressive performances, needs improvement. A selected tempo and short solo clip are the best starting conditions. User correction time and playability on real material still need feedback. [Per-recording results](experiments/m0/results/app-audio-comparison.json)

Run `.venv/bin/python -m scripts.compare_audio` to reproduce the app measurement. It uses the pinned Bach10 mirror, reuses M0 audio when available, and writes local measurements to `.runtime/audio-comparison.json`.

## Checks to keep with future changes

1. Edit a pitch into an overlapping string range, choose fourth finger, save, reopen and inspect the same note in print.
2. Play through a rest, tie and loop boundary. Verify pitches by ear, current-note highlighting, count-in, and speed changes. Browser automation observes the playback UI; it cannot certify what a listener hears.
3. Import real phone photos, multi-page PDFs and unfamiliar titles. Record source/part, expected result and correction effort. Exercise invalid input and retry without disturbing the open score.
4. Try an isolated recording and an accompanied recording separately. Compare the original clip, suggested line, and edited result.
5. For renderer changes, inspect both screen sizes and page breaks. Include non-ASCII titles, the legend, review marks and any out-of-range notes.
