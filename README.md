# Stringbook · Violin fingering and bowing for beginners

Know the tune but still have to stop and work out where your fingers go? Stringbook writes the **string and finger below each note** and the **bow direction above it**. Follow the staff for rhythm, hear the melody at your pace, then print the same markings for your music stand.

[Printable score and practice card (2-page PDF)](docs/media/twinkle-practice-score.pdf) · [Included songs](#included-songs) · [Feature status](#feature-status) · [Run Stringbook](#run-stringbook)

![Ten-second demo of Twinkle, Twinkle, Little Star. The highlight moves over the staff, then the violin diagram shows where to place each finger and which way to bow.](docs/media/notes-and-bowing.gif)

[Open the full-size demo](docs/media/notes-and-bowing.gif) · [View a still screenshot](docs/media/annotated-score.png)

The first five notes of *Twinkle, Twinkle, Little Star* read **D · D · A · A · A1**. Play the open D string twice, the open A string twice, then put your index finger on the A string. Later, **D2↑** means a high second finger on the D string. Select that note to see the finger position and bow direction on the violin.

## Included songs

These seven beginner violin scores come with a fresh install and work offline. Open **Switch piece** to play one, or search by either name.

| Song | 中文名 | Edition in Stringbook |
| --- | --- | --- |
| Baa, Baa, Black Sheep | 咩咩黑绵羊 | *The Baby’s Opera*, upper-staff melody |
| Frère Jacques | 两只老虎 | Stringbook setting of the traditional round |
| Here We Go Round the Mulberry Bush | 我们绕着桑树转 | *The Baby’s Opera*, upper-staff melody |
| Hush-a-by Baby | 宝宝摇篮曲 | *The Baby’s Opera*, upper-staff melody |
| Jingle Bells | 铃儿响叮当 | Stringbook setting of Pierpont’s refrain |
| Row, Row, Row Your Boat | 划船歌 | Stringbook’s even-beat setting of the traditional round |
| Twinkle, Twinkle, Little Star | 小星星 | Stringbook’s D-major setting of the traditional melody |

The three *Baby’s Opera* melodies are adapted from Linda Cantoni’s MusicXML transcriptions for the Project Gutenberg edition, listed as public domain in the United States. The other four are project arrangements of public-domain tunes. Personal imports stay in your local library. [Edition credits and reuse terms](THIRD_PARTY_NOTICES.md#music-in-the-public-catalogue)

## Feature status

**Tested** means the named workflow has been exercised on the supported Apple Silicon Mac. **Testing** means you can try it now, but the musical result still needs checking against the source.

| Feature | Status | What you can try |
| --- | --- | --- |
| Score, fingering and bowing | Tested | Select a note, inspect both hands, edit a finger or bow, or transpose the piece. The practice card shows the fingerings used. |
| Playback, saving and printing | Tested | Slow down, count in, start from a note or loop two bars. Save, reopen and print the edited score with its practice card. |
| Title search | Tested | Search starters by English or Chinese title, or fetch a specific OpenScore Lieder edition. Try **小星星** offline or **Just for Today** online. |
| Score photo or PDF recognition | Testing | Simple printed examples have been checked. Curved phone photos and multi-part pages can produce wrong notes or rhythms. Choose the melody part and compare it with the original. [Sample image](samples/rhythm.png) · [Sample PDF](samples/placement.pdf) |
| Audio-to-score conversion | Testing | Start with a short solo recording. Check pitches and timing by ear, especially with accompaniment. [Four-second sample](samples/melody.wav) |

The import tests exercise file selection through export. Recognition quality was measured separately on a limited set of scores and recordings. Beginner feedback on which suggested fingerings and bowings feel comfortable is still pending. [Test coverage and measured results](TESTING.md)

## Run Stringbook

The setup script supports **macOS on Apple Silicon**. Install Node.js 24 with npm, uv, FFmpeg and Google Chrome first. [Prerequisite commands and setup details](INSTRUCTIONS.md#recreate-the-environment)

```sh
git clone https://github.com/dhtim135/violin-for-beginner.git
cd violin-for-beginner
./scripts/setup.sh
./scripts/start.sh
```

Open **[Stringbook on localhost](http://127.0.0.1:8427)**. *Twinkle* is ready to play. For a first practice loop, set **Speed** to **0.75×**, turn on **Loop bars**, choose bars **1–2**, and press **Play**. Click the first **A1** to see where your finger lands. **Esc** returns you to the score.

## Feedback and contributions

Which note made you stop? If a fingering feels awkward, tell us the piece, bar, displayed label and what you would play instead. Reports from beginners and teachers are welcome. [Open an issue](https://github.com/dhtim135/violin-for-beginner/issues) · [Contribute code or a score](CONTRIBUTING.md)

Star Stringbook if you’d like to find it again for your next practice session.

For development, start with the [product scope](PRODUCT.md), [architecture](ARCHITECTURE.md), [milestones](MILESTONES.md), [testing guide](TESTING.md) and [repository conventions](AGENTS.md).

## License and music credits

Stringbook is **source-available** under PolyForm Noncommercial 1.0.0. The license covers contributors’ original code, documentation, exercises and arrangements to the extent they hold the rights. Personal study and use by educational institutions, including those charging tuition, are permitted. Selling the app or running a paid hosted service requires separate permission. [Full license](LICENSE) · [Permission inquiries](https://github.com/dhtim135/violin-for-beginner/issues)

When sharing a copy, include the license or its official URL and the following notice.

> Required Notice: Copyright Stringbook contributors

Third-party software, score editions and recordings have their own terms. [Music and dependency credits](THIRD_PARTY_NOTICES.md)
