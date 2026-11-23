# Contributing to Stringbook

To report a problem, include the input route, browser, piece or measure, expected behavior and what you observed. A short original example is ideal for a fingering or rhythm issue. Share only files you have permission to publish. [Issue tracker](https://github.com/dhtim135/violin-for-beginner/issues)

## Working on the app

1. Follow the local setup guide, then run `./scripts/start.sh` and open the loopback address. [Setup and sample inputs](INSTRUCTIONS.md)
2. Make the change on a branch. Keep notation, playback, saved scores and PDF exports on the same score revision. [Repository guide](AGENTS.md)
3. Run `npm test`. For notation changes, also inspect a representative screen and printed page. In the pull request, describe what you exercised and any checks you could not run. [Verification guide](TESTING.md)

## Adding music

Identify the composer, arranger or transcriber, exact edition and source URL. Give the license, public-domain basis or written permission covering both redistribution of the submitted files and publication of the adapted violin score. A link to listen to a song or download sheet music alone does not establish those rights.

Credit the source in the score and update the notices. Supply the English and Simplified Chinese titles, measure range, practice key and any simplification. For recordings, document the rights to the performance and recording too. Keep personal imports in the local library. [Public catalogue and credits](THIRD_PARTY_NOTICES.md)

### Music rights check

Before uploading music to a public branch or fork, document each work in [the rights register](music-rights.json). Keep uncertain editions in your local practice library. The **Music rights review** check runs on pull requests into `main` and again after merge. A green check means the required documentation is present for the reviewed file versions. The maintainer merging the PR must read the sources and decide whether the grants actually cover the proposed use.

1. Give the composition and the specific edition separate entries under the work’s `composition` and `edition` fields. For audio or video, add `recording` and document the performance and recording rights. Each field needs a `basis`, a `reason` explaining the grant, and an `evidence` HTTPS URL or `repo:path` to a tracked credit, source or permission record. Use the catalogue ID for a bundled song.
2. Supported bases are `original`, `public-domain`, `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0` and `written-permission`. For public domain, identify the historical work, edition and applicable territory. For licensed material, cite the exact edition and license, keep the upstream attribution and meet any share-alike requirements. For written permission, record who authorized public redistribution and adaptation and the scope. Keep confidential correspondence private and cite a shareable record. Propose other licenses for policy review before adding the material.
3. Under `files`, map each score, recording, screenshot, archive or catalogue source to all work IDs it contains. Set `blob` to the result of `git hash-object -- path/to/file`. Update the hash only after reviewing the changed material. Keep reader-facing credits in [third-party notices](THIRD_PARTY_NOTICES.md).
4. Commit the material and its evidence together on your **local** topic branch. Run `python3 scripts/check_music_rights.py --base origin/main --head HEAD` before pushing. The check inspects every incoming commit, including files later deleted. If one fails, fix the local history before uploading it.

Review the actual contents even when hashes and metadata match. The checker does not identify tunes by ear, authenticate permission letters, or find every possible melody embedded in code. Submit changes to the checker, workflow and branch rules for maintainer review as well.

## Maintaining the public repository

Use the same app for public development and personal practice. Keep personal scores in the local data directory, and store backups outside the checkout. A contributor can reproduce a bug with an original short phrase or a bundled piece. This also applies to material visible in screenshots, screen recordings, test fixtures and exported PDFs. [Practice library and backup instructions](INSTRUCTIONS.md#personal-practice-library)

Open a pull request for every change to `main`, including maintainer changes. The GitHub ruleset blocks direct pushes, force pushes and branch deletion. Before merge, the branch must be up to date, review conversations resolved, and the GitHub Actions **Music rights review** check successful. The ruleset allows a solo maintainer to merge their own passing PR. [Live branch rules](https://github.com/dhtim135/violin-for-beginner/rules/27922647)

Use these checks when merging changes or publishing a release.

1. Review all incoming commits, including files added and deleted within the branch. From a topic branch, `git log --name-status origin/main..HEAD` lists affected paths commit by commit. Inspect changes that contain note sequences, recordings, archives, screenshots or download links. If a local-only edition entered a commit, remove it from the branch history before publishing.
2. For each new public edition, check the source, reuse terms and credits described above. Link the evidence in the pull request and the third-party notices. Apply the same review to new dependencies and their upstream licenses.
3. Run `npm test`. It checks the public catalogue and exercises the private-library loader with a project-authored fixture. Capture public demos from a preview with an empty data directory. Build release archives from the reviewed Git tag so local files stay on your machine.

## Code and other original contributions

By submitting original code or other project-authored material for inclusion, you agree to license your contribution under the project's PolyForm Noncommercial License 1.0.0. Contributors retain their copyright. Identify third-party materials separately and preserve their upstream terms. [Project license](LICENSE)
