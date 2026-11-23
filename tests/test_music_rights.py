"""Exercise the publishing policy on disposable Git history with original test data."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parents[1] / "scripts/check_music_rights.py"


class PublicMusicPolicy(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.repo = Path(temp.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Policy test")
        self.git("config", "commit.gpgsign", "false")
        self.write("evidence.md", "Test fixture composed and arranged by its author.")
        self.grant = {"basis": "original", "reason": "Original synthetic test fixture.", "evidence": "repo:evidence.md"}
        self.work = {"title": "Fixture", "credit": "Test author", "composition": self.grant, "edition": self.grant}
        self.register = {"works": {}, "files": {}}
        self.base = self.commit()

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()

    def write(self, path, content):
        file = self.repo / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content)

    def commit(self):
        self.write("music-rights.json", json.dumps(self.register))
        self.git("add", "-A")
        self.git("commit", "-qm", "Fixture snapshot")
        return self.git("rev-parse", "HEAD")

    def register_file(self, path):
        self.register["works"]["exercise"] = self.work
        self.register["files"][path] = {"blob": self.git("hash-object", path), "works": ["exercise"]}

    def outcome(self, error=None, *args):
        result = subprocess.run([sys.executable, str(CHECKER), *args], cwd=self.repo, capture_output=True, text=True)
        self.assertEqual(result.returncode, int(error is not None), result.stderr)
        if error:
            self.assertIn(error, result.stderr)

    def test_grants_are_bound_to_the_file_and_source(self):
        self.write("song.abc", "original test fixture")
        self.commit()
        self.outcome("missing or stale rights record")
        self.register_file("song.abc")
        self.commit()
        self.outcome()
        self.work["composition"] = dict(self.grant, basis="unknown")
        self.commit()
        self.outcome("unsupported rights basis")
        self.work["composition"] = dict(self.grant, evidence="repo:absent.md")
        self.commit()
        self.outcome("evidence file does not exist")
        self.work["composition"] = self.grant
        self.write("song.abc", "changed version")
        self.commit()
        self.outcome("stale rights record")

    def test_removed_private_file_still_blocks_incoming_range(self):
        self.write(".data/private-editions.json", "{}")
        self.commit()
        (self.repo / ".data/private-editions.json").unlink()
        self.commit()
        self.outcome()
        self.outcome("local practice data", "--base", self.base)

    def test_recording_needs_its_own_evidence(self):
        self.write("demo.wav", "synthetic audio stand-in")
        self.register_file("demo.wav")
        self.commit()
        self.outcome("performance and recording rights")
        self.work["recording"] = self.grant
        self.commit()
        self.outcome()

    def test_embedded_catalogue_cannot_add_an_undocumented_work(self):
        path = "studio/starters.py"
        self.write(path, "TUNES = {'exercise': (), 'another-piece': ()}")
        self.register_file(path)
        self.commit()
        self.outcome("match the public catalogue entries")
