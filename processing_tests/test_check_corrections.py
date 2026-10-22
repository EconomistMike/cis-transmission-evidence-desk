"""Challenge the read-only check launcher with disposable validator stand-ins."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).parents[1] / 'tools' / 'check-corrections.py'


class ReadOnlyLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'tools').mkdir()
        shutil.copyfile(SOURCE, self.root / 'tools' / 'check-corrections.py')
        self.validator = self.root / 'tools' / 'correct-evidence.py'
        self.original = self.root / 'original.txt'
        self.original.write_bytes(b'Original synthetic input')

    def run_validator(self, body, *, optimised=False):
        self.validator.write_text(body, encoding='utf-8')
        command = [sys.executable, '-B'] + (['-O'] if optimised else []) + ['tools/check-corrections.py']
        return subprocess.run(command, cwd=self.root, capture_output=True, text=True, timeout=15,
                              env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONOPTIMIZE='0'))

    def test_validates_read_only_with_fixed_check_argument(self):
        run = self.run_validator("import sys\nfrom pathlib import Path\nassert sys.argv[1:] == ['--check']\nassert Path('original.txt').read_bytes() == b'Original synthetic input'\nprint('Fixture validated')\n")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stdout, 'Fixture validated\n')
        self.assertEqual(self.original.read_bytes(), b'Original synthetic input')

    def test_write_and_filesystem_mutation_attempts_are_blocked_before_changes(self):
        for body in [
            "from pathlib import Path\nPath('original.txt').write_text('Changed')",
            "import os\nos.open('original.txt', os.O_WRONLY | os.O_TRUNC)",
            "import os\nos.remove('original.txt')",
            "import os\nos.rename('original.txt', 'renamed.txt')",
            "import os\nos.mkdir('new-directory')",
            "import os\nos.chmod('original.txt', 0o600)",
        ]:
            with self.subTest(body=body):
                mode = self.original.stat().st_mode
                run = self.run_validator(body)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn('PermissionError', run.stderr)
                self.assertEqual(self.original.read_bytes(), b'Original synthetic input')
                self.assertEqual(self.original.stat().st_mode, mode)
                self.assertFalse((self.root / 'renamed.txt').exists())
                self.assertFalse((self.root / 'new-directory').exists())

    def test_children_and_network_connections_are_rejected(self):
        for body in [
            "import subprocess,sys\nsubprocess.run([sys.executable, '-c', \"open('original.txt','w').write('Changed')\"])",
            "import socket\nsocket.socket().connect(('127.0.0.1', 1))",
        ]:
            with self.subTest(body=body):
                run = self.run_validator(body)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn('PermissionError', run.stderr)
                self.assertEqual(self.original.read_bytes(), b'Original synthetic input')

    def test_optimisation_is_rejected_before_the_validator_runs(self):
        run = self.run_validator("print('Validator unexpectedly executed')", optimised=True)
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('assertions', run.stderr)
        self.assertNotIn('unexpectedly executed', run.stdout)


if __name__ == '__main__':
    unittest.main()
