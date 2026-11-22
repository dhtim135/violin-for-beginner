# Using Stringbook locally

Open **http://127.0.0.1:8427** on the computer running the server. The starter melody opens immediately. Click **Play**, then click a note, choose a string and finger, and click **Apply change**. **Hear note** plays the selected pitch. Use **Save score** to add it to **My scores**, or **Download PDF** to print the current arrangement.

The controls are in English. Built-in pieces show their original and Simplified Chinese names side by side, including in PDFs. Search for either name, such as **Jingle Bells** or **铃儿响叮当**. 指法 examples: `G` = G 弦空弦, `D3` = D 弦第三指, `A2↓` = A 弦低二指, `A2↑` = A 弦高二指. The letter always names the string. The number always names the finger.

Use **Switch piece** above the title to choose a starter or reopen a saved arrangement. English titles are sorted A–Z within each group. Try **Frère Jacques** for string changes or **Baa, Baa, Black Sheep** for the lower strings. The three pieces from *The Baby’s Opera* work offline and link to the printed source under **Score tools → Score & source**.

For other repertoire you have permission to use, choose **Import music** and provide your own score image, PDF or audio excerpt. Save the result to **My scores**. An existing local edition collection in `VIOLIN_DATA/private-editions.json` also appears in the picker after restart. Include that file when backing up the library.

## Start or restart

On this machine the dependencies are installed. From the repository root:

```sh
./scripts/start.sh
```

After updating the app, restart the server and reload the score tab to pick up the matching page and controls. Keep that terminal running. Ctrl+C stops the server. If the address is already in use, open the existing Stringbook tab or choose another port with `PORT=8428 ./scripts/start.sh`. Open the matching localhost address. Use one server per data directory.

## Recreate the environment

The verified setup is macOS on Apple Silicon, Node 24 with npm, uv, FFmpeg (including ffprobe), and Google Chrome. Install Poppler for the PDF verification tests. For a machine using Homebrew, the command-line prerequisites are available via `brew install node@24 uv ffmpeg poppler`; ensure the Node 24 binaries are on PATH. Chrome is a separate prerequisite. Then run:

```sh
./scripts/setup.sh
./scripts/start.sh
```

Setup uses the Node lockfile and a pinned Python 3.10.20 ONNX environment. It installs Audiveris 5.11.0 into the repository's ignored runtime directory. When mounting its disk image, read the installer license and respond to the terminal prompt. Set `AUDIVERIS` to an existing Audiveris executable or `CHROME_BIN` to a compatible Chromium executable to use another installation. Other operating systems require their own native dependencies and have not been verified.

## Try each input

| Import tab | First thing to try | What to check |
| --- | --- | --- |
| Image | [Rhythm example](samples/rhythm.png) | Choose the recognized part. Look for the rest and dotted rhythm. Open the original under **Score & source** to compare. |
| PDF | [Finger placement example](samples/placement.pdf), page 1 | Select pages such as `1-3, 5` and choose a part. Compare the low/high second-finger placements. |
| Search | Search **Die Forelle** or **Just for Today** | Choose an edition, then the vocal part. Other parts are available under **Score & source**. **Frère Jacques** and **小星星** also work offline. |
| Audio | [Four-second melody](samples/melody.wav), tempo 120 | Generate a suggested melody and compare it with the original excerpt in **Score & source**. Try a recording of a single instrument next. |

Uploads are limited to 40 MB each, PDFs to 12 selected pages and audio to 180 seconds per segment. PNG/JPEG and the audio extensions listed in the file picker are supported. Selecting a shorter excerpt is useful for long recordings. Search covers the pinned OpenScore Lieder repertoire plus local starters. Retrieving an online edition needs internet access. Local uploads, playback, editing, saving and PDF generation work offline after setup.

## Reading size and key

The score opens at full width with enlarged staff notation and finger labels. Select a note or open **Score tools** for editing and source information. Close **Score tools** to give the paper the full width again.

Click **Key** beside **Speed**, then click a named key in the panel to play in another key, such as D major or A major. The app moves the entire melody together and chooses an octave that keeps as many notes as possible in first position. It updates the signature, finger labels, playback and PDF. **Undo edit** restores the previous arrangement and fingerings. **Save score** keeps the new key. If the key is unknown, identify the source tonic and mode first. Transposing a minor melody preserves its minor mode.

## Bowing and the practice card

Open **Switch piece → Twinkle, Twinkle, Little Star 小星星**, with **Show bowing** enabled by default. The square-topped mark means down bow (下弓, frog to tip). The V means up bow (上弓, tip to frog). A hooked arrow (↳) means continue the same stroke through that note. Finger arrows below the staff still mean low or high placement. During playback, green follows the current note and ochre marks the other notes in the same stroke.

Select a note to see both hands on a whole violin. A green marker identifies where to place your finger, an open circle marks an open string, and the arrow beside the bow shows the direction of travel. Press **Esc** or **Close** to return to the selected note.

Select a note to see whether its bow comes from source notation, a suggestion or your edit. Choose **One bow with next note** to slur the two notes together. Choose **Separate bow** on the second note to split the stroke, or **Use source or suggestion** to clear that note's override. A tie holds the same pitch through its written durations. Save the score to keep bow edits.

Open **Practice card · 指法与弓法** above the staff. The four-string diagram shows the fingerings used in this arrangement. **Include full scale** adds a one-octave warm-up in the current key (natural minor for a minor key). Choose **Preview bar**, then click a note in a bow group to see it on the violin. The card follows the sounding note during playback and prints the current preview. **Include practice card in PDF** appends the current card to the score. **Show bowing** controls whether marks appear on the printed staff.

## Read and correct a draft

- Set **Start at bar** and press **Play** to begin at that measure. For a precise entrance, click a note or rest on the staff, then **▶ Play from here** in Score tools. Inside a loop, the first pass starts at that note and subsequent passes begin at the first loop bar. The count-in follows the meter at your starting position.
- Open **Switch piece** to browse while listening. Choosing another score stops playback when that score opens.
- Click **Pause** to hold your place and **Resume** to continue, including during the count-in. **Reset** stops playback and returns the next **Play** to the first bar of the piece or selected loop. Playback follows the highlighted note and finger label. Choose speed, count-in and optional inclusive start/end bars before pressing Play. Changing these controls stops playback.
- Click a note or rest to change pitch, duration or fingering. A manually selected fingering survives subsequent automatic suggestions. **Insert after** duplicates the selected event. **Delete** removes it. **Merge with next** keeps the first pitch and combines durations. Use **Undo edit** before saving if needed.
- Rhythm edits shift later events. Bar boundaries can split sustained notes into tied pieces. Newly imported tuplets and fine timing may be simplified, with a notice in the score.
- Brown notes carry a review flag or need a playable fingering. Read the reason in the editor. Audio pitches are all suggestions. Unflagged recognized notes can also be wrong.
- **Range?** means the suggested pitch falls outside the app's first-position map. Edit the note, or use the transposition option under **Score & source** when a shift improves playability. The button states the shift and how many notes would still be outside range. Transposition recalculates fingerings and records the change in the PDF.
- **Download PDF** includes the current edits, legend and source information. Save separately to reopen those edits later.

## Files and recovery

The library database, revision snapshots, uploaded originals, generated clips and recognition logs live under `.data/`. Back up the entire directory with the server stopped. Set `VIOLIN_DATA` to use a different location. Closing the browser leaves saved scores on this machine. Unsaved edits are held in the tab.

If recognition fails, retry with a straight crop or fewer pages. If an audio draft follows the accompaniment, choose a more isolated passage and check the tempo. If a PDF download fails, verify Chrome and `CHROME_BIN`. The server terminal logs conversion errors. Interrupted conversions become failed jobs after restart and can be resubmitted from **Import music**. A concurrent save conflict means another tab has written a newer revision. Reopen the saved copy before making further changes.

For feedback, identify the source/part, bar, actual label or rhythm, expected result and browser. Public examples or short excerpts you can share make regressions reproducible.
