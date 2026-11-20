# Local feasibility experiments

Run these experiments from this directory. The scripts fetch public source scores and recordings, create original reference phrases and write outputs under `.work/`. The JSON in `results/` is a snapshot of the measured run. Each experiment can also be run individually once its inputs are ready.

## Reproduce on Apple Silicon

The measured configuration used macOS arm64, Python 3.10.20, Node 24, local Chrome, FFmpeg, Poppler, and the Audiveris 5.11.0 macOS arm64 distribution. Set `CHROME_BIN` and `AUDIVERIS` to the executables on your machine. Audiveris includes a JVM. Its text recognition reported no installed OCR languages in this run.

```sh
npm ci
uv venv --python 3.10.20 .work/venv
uv pip install --python .work/venv/bin/python --no-deps -r requirements-macos-arm64.txt
source .work/venv/bin/activate
python fixtures.py
node render.mjs
python omr.py
python search.py
python edition.py
python audio.py
python recordings.py
```

The Python file pins the full environment used for this ONNX experiment. Explicit installation with `--no-deps` avoids pulling in a second, platform-default model runtime. Basic Pitch logs warnings for the unused model backends. SciPy 1.13.1 loaded successfully on this host after a newer wheel failed to load. The pins apply to the experiment environment only.

## What the scripts measure

| Script | Input and observable result |
| --- | --- |
| fixtures.py + render.mjs | Four original two-bar melodies in MusicXML and a four-bar annotated example. OSMD lays out the test labels in a lyric row and Chromium prints the score. The rendered sample is `.work/annotated.pdf`. Hand-authored labels provide the layout reference. |
| omr.py | Feed each clean PDF, its 220 dpi PNG and a rotated, blurred JPEG to Audiveris. Unpack the exported MXL and compare ordered pairs of pitch or rest and exact written duration. |
| search.py | Search titles in the pinned OpenScore Lieder tree, retrieve an edition and validate MusicXML by reading its parts and notes. Example command: `python search.py "Die Forelle"`. The default run includes an absent title. |
| edition.py | Use the default search results. Engrave the first eight bars of each retrieved score with its piano part, run the PDFs through Audiveris and compare the first returned part to the original vocal part. This measures the default part choice too. |
| audio.py | Assemble four phrases from violin samples. Repeat with a sustained synthetic chord. Detect note events with Basic Pitch, keep the highest pitch starting in each eighth-note slot and score pitch, onset and duration. This experiment supplies the true tempo and grid. |
| recordings.py | Run the same note detector on five real Bach10 violin recordings and their quartet mixes. Select the highest note among near-simultaneous attacks and match each suggestion once against the annotated violin line. |

The search code uses curl to retrieve pinned assets. Rerunning the default query restores the inputs for the edition experiment. Run the OMR scripts against newly generated outputs in a fresh work directory when changing recognizer versions.

## Dependencies and source material

- [Audiveris 5.11.0](https://github.com/Audiveris/audiveris/releases/tag/5.11.0), AGPL-3.0. Resolve compatibility with the eventual distribution model before shipping.
- [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay), BSD-3-Clause, with [Playwright](https://github.com/microsoft/playwright) for headless printing.
- [Basic Pitch](https://github.com/spotify/basic-pitch), Apache-2.0, using its included ONNX model.
- [OpenScore Lieder](https://github.com/OpenScore/Lieder/tree/38c5db510224d9facdc4b08d741fc788cfb58ea8), CC0 scores, with the source edition URL recorded per match.
- [Violin samples](https://github.com/nbrosowsky/tonejs-instruments/tree/622c2f1c32c8cfce4158ddc3eb26e518ddef37e5/samples/violin) used to assemble the synthetic phrases.
- [Bach10 research dataset mirror and annotation documentation](https://github.com/flippy-fyp/Bach10_v1.1/tree/2a53cdc6495bb82f03f943b77ca3b11ddf7f5a31) used for local evaluation. Recordings and model weights stay outside the tracked results.
