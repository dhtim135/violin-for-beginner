# Contributing to Stringbook

To report a problem, include the input route, browser, piece or measure, expected behavior and what you observed. A short original example is ideal for a fingering or rhythm issue. Share only files you have permission to publish. [Issue tracker](https://github.com/dhtim135/violin-for-beginner/issues)

## Working on the app

1. Follow the local setup guide, then run `./scripts/start.sh` and open the loopback address. [Setup and sample inputs](INSTRUCTIONS.md)
2. Make the change on a branch. Keep notation, playback, saved scores and PDF exports on the same score revision. [Repository guide](AGENTS.md)
3. Run `npm test`. For notation changes, also inspect a representative screen and printed page. In the pull request, describe what you exercised and any checks you could not run. [Verification guide](TESTING.md)

## Adding music

Identify the composer, arranger or transcriber, exact edition and source URL. Give the license, public-domain basis or written permission covering both redistribution of the submitted files and publication of the adapted violin score. A link to listen to a song or download sheet music alone does not establish those rights.

Credit the source in the score and update the notices. Supply the English and Simplified Chinese titles, measure range, practice key and any simplification. For recordings, document the rights to the performance and recording too. Keep personal imports in the local library. [Public catalogue and credits](THIRD_PARTY_NOTICES.md)

## Maintaining the public repository

Use the same app for public development and personal practice. Keep personal scores in the local data directory, and store backups outside the checkout. A contributor can reproduce a bug with an original short phrase or a bundled piece. This also applies to material visible in screenshots, screen recordings, test fixtures and exported PDFs. [Practice library and backup instructions](INSTRUCTIONS.md#personal-practice-library)

Use these checks when merging changes or publishing a release.

1. Review all incoming commits, including files added and deleted within the branch. From a topic branch, `git log --name-status origin/main..HEAD` lists affected paths commit by commit. Inspect changes that contain note sequences, recordings, archives, screenshots or download links. If a local-only edition entered a commit, remove it from the branch history before publishing.
2. For each new public edition, check the source, reuse terms and credits described above. Link the evidence in the pull request and the third-party notices. Apply the same review to new dependencies and their upstream licenses.
3. Run `npm test`. It checks the public catalogue and exercises the private-library loader with a project-authored fixture. Capture public demos from a preview with an empty data directory. Build release archives from the reviewed Git tag so local files stay on your machine.

## Code and other original contributions

By submitting original code or other project-authored material for inclusion, you agree to license your contribution under the project's PolyForm Noncommercial License 1.0.0. Contributors retain their copyright. Identify third-party materials separately and preserve their upstream terms. [Project license](LICENSE)
