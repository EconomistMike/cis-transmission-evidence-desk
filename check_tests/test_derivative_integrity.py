"""Pin the text files inspected at the recorded public commit; certify no source meaning."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).parents[1]


class DerivativeIntegrityTests(unittest.TestCase):
    def test_registered_derivative_paths_and_bytes_match_reviewed_pins(self):
        site = (ROOT / 'site').resolve()
        pack = json.loads((site / 'evidence-pack.json').read_text(encoding='utf-8'))
        manifest = json.loads((ROOT / 'check_tests' / 'derivative-pins.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['schema'], 1)
        self.assertRegex(manifest['baseline_commit'], r'^[0-9a-f]{40}$')
        pins = manifest['sources']
        identifiers = [pin['source_id'] for pin in pins]
        self.assertEqual(identifiers, sorted(set(identifiers)), 'Pins must be sorted and unique')
        registered = {source['source_id']: source['derivative_path'] for source in pack['sources']}
        self.assertEqual(set(identifiers), set(registered), 'Review pins for added or removed sources')
        for pin in pins:
            with self.subTest(source_id=pin['source_id']):
                self.assertEqual(pin['path'], registered[pin['source_id']], 'Review changed derivative paths')
                path = (site / pin['path']).resolve()
                self.assertTrue(path.is_relative_to(site), 'Derivative must remain inside site/')
                self.assertRegex(pin['sha256'], r'^[0-9a-f]{64}$')
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), pin['sha256'],
                                 'Derivative bytes changed: review extraction and citations before updating pins')


if __name__ == '__main__':
    unittest.main()
