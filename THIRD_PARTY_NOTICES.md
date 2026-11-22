# Third-party notices

Stringbook's software terms cover rights held by the project contributors. A public-domain composition, a particular printed arrangement, a recording of it and a software library can each have different terms. The same source rights apply when a user transposes a melody or prints a fingering PDF.

## Music in the public catalogue

| Material | Source and reuse basis |
| --- | --- |
| Three nursery pieces in `assets/babys-opera.zip` | MusicXML transcriptions by Linda Cantoni for Walter Crane’s *The Baby’s Opera*, Project Gutenberg ebook 25418. Project Gutenberg identifies the work as public domain in the USA. Check the status in the country of use. Stringbook selects the upper staff and records its key and tempo changes. The edition manifest maps each displayed title to its source filename. [Manifest](studio/nursery.py) · [Source music files at the pinned revision](https://github.com/GITenberg/The-Baby-s-Opera_25418/tree/ea0fe889d45029211d5d6d6f1b280e4766f54c80/25418-h/music) · [Complete edition](https://www.gutenberg.org/ebooks/25418) · [Accompanying Project Gutenberg notice and license](assets/babys-opera-NOTICE.txt) |
| *Twinkle, Twinkle, Little Star*, *Frère Jacques*, *Row, Row, Row Your Boat* | Stringbook's hand-entered, single-line settings of traditional public-domain tunes. The repository contains the beginner note sequences and their credits. [Opening score](studio/score.py) · [Starter settings](studio/starters.py) |
| *Jingle Bells* | Stringbook setting of Pierpont’s public-domain refrain. [Starter settings](studio/starters.py) · [1857 Pierpont score at the Library of Congress](https://www.loc.gov/item/2023812429/) |
| Online title search | The tracked OpenScore Lieder index identifies individual editions. The app downloads a selected score from the pinned collection of CC0 transcriptions and retains its edition link. [OpenScore Lieder snapshot](https://github.com/OpenScore/Lieder/tree/38c5db510224d9facdc4b08d741fc788cfb58ea8) |

The sample PNG and PDFs use project-authored musical exercises. The four-second WAV is synthesized from an original eight-note sequence. [Notation fixtures](experiments/m0/fixtures.py) · [Audio generator](samples/generate_melody.py)

Other scores, recordings, uploads and local practice editions remain subject to their respective rights. For a concern about a public entry, open an issue with the title, the file or edition URL and the rights or credit that need review. [Repository issues](https://github.com/dhtim135/violin-for-beginner/issues)

## Software installed for local operation

Setup installs these components under their upstream terms. Preserve their license and notice files when redistributing a copy. The lockfiles identify exact package versions, including transitive dependencies. [Node lockfile](package-lock.json) · [Python lockfile](requirements-macos-arm64.txt)

| Component | Role and upstream terms |
| --- | --- |
| abcjs | Browser notation renderer, MIT, copyright Paul Rosen and Gregory Dyke. The server includes the upstream MIT notice in the JavaScript it serves. [abcjs](https://github.com/paulrosen/abcjs) |
| Audiveris | External optical music recognition program invoked by the worker. Setup obtains the upstream AGPLv3 distribution separately. [Audiveris 5.11.0](https://github.com/Audiveris/audiveris/releases/tag/5.11.0) |
| Basic Pitch, ONNX Runtime and librosa | Audio transcription, inference and timing. Basic Pitch is Apache-2.0, copyright Spotify AB, and includes a NOTICE file in the distribution. ONNX Runtime is MIT. librosa is ISC. [Basic Pitch](https://github.com/spotify/basic-pitch) · [ONNX Runtime](https://github.com/microsoft/onnxruntime) · [librosa](https://github.com/librosa/librosa) |
| music21 and pypdf | Notation parsing and PDF page selection. Both code libraries use BSD-3-Clause. Scores in the music21 corpus have their own rights. [music21](https://github.com/cuthbertLab/music21) · [pypdf](https://github.com/py-pdf/pypdf) |
| FastAPI and Uvicorn | Local HTTP service. FastAPI is MIT and Uvicorn is BSD-3-Clause. [FastAPI](https://github.com/fastapi/fastapi) · [Uvicorn](https://github.com/encode/uvicorn) |
| FFmpeg and ffprobe | User-installed audio tools. The applicable license depends on the build and enabled codecs. [FFmpeg legal information](https://ffmpeg.org/legal.html) |
| Playwright, Chrome and Poppler | PDF export and verification use Playwright (Apache-2.0) with a separately installed browser. PDF text checks use a separately installed Poppler utility. [Playwright](https://github.com/microsoft/playwright) · [Chrome terms](https://www.google.com/chrome/terms/) · [Poppler](https://poppler.freedesktop.org/) |

M0 experiments also use OpenSheetMusicDisplay, instrument samples and the Bach10 research recordings. Their upstream terms apply separately. Downloaded samples, model weights and research recordings stay in local working directories. The tracked results report measurements. [Experiment materials and sources](experiments/m0/README.md)
