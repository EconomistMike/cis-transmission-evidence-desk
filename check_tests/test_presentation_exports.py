"""Challenge embedded-data agreement with independent disposable inputs."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).parents[1] / 'tools' / 'presentation_exports.py'


class PresentationExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.pack = {'projects': [{'family_slug': 'alpha', 'summary': {'name': 'Alpha'},
                                  'observations': [{'id': 'O1', 'value': 1}], 'other': [False, None]}],
                     'sources': [{'source_id': 'S1', 'revision': 1}],
                     'generated': {'research_cutoff': '2026-09-04', 'revision': 'synthetic'},
                     'build_report': {'status': 'passed', 'blockers': []}}
        self.embedded = {'packs': [{**copy.deepcopy(self.pack['projects'][0]), 'name': 'Alpha'}],
                         'sources': copy.deepcopy(self.pack['sources']),
                         'report': copy.deepcopy(self.pack['build_report']),
                         'build': {**self.pack['generated'], 'presentation_only': 'retained'},
                         'evidence_values': {'alpha': []}}

    def run_check(self, raw=None):
        path = self.root / 'evidence-pack.json'
        path.write_text(json.dumps(self.pack), encoding='utf-8')
        before = path.read_bytes()
        result = subprocess.run([sys.executable, '-B', str(SOURCE), '--root', str(self.root)],
                                input=json.dumps(self.embedded) if raw is None else raw,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(path.read_bytes(), before)
        self.assertIn(result.returncode, (0, 1), result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(result.returncode, int(bool(report['errors'])), report)
        return report

    def test_matching_payload_passes_without_input_writes(self):
        report = self.run_check()
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['projects_checked'], 1)

    def test_cli_default_root_uses_site_beside_tools(self):
        checkout = self.root / 'checkout'
        (checkout / 'tools').mkdir(parents=True)
        (checkout / 'site').mkdir()
        for source in (SOURCE, SOURCE.with_name('family_exports.py')):
            shutil.copyfile(source, checkout / 'tools' / source.name)
        path = checkout / 'site' / 'evidence-pack.json'
        path.write_text(json.dumps(self.pack))
        before = path.read_bytes()
        result = subprocess.run([sys.executable, '-B', str(checkout / 'tools' / SOURCE.name)],
                                cwd=self.root, input=json.dumps(self.embedded),
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['projects_checked'], 1)
        self.assertEqual(path.read_bytes(), before)

    def test_nested_boolean_and_number_drift_is_rejected(self):
        for value in (True, False, '1'):
            with self.subTest(value=value):
                self.pack['projects'][0]['observations'][0]['value'] = int(value)
                self.embedded['packs'][0]['observations'][0]['value'] = value
                error = self.run_check()['errors'][0]
                self.assertEqual(error['code'], 'PRESENTATION_MISMATCH')
                self.assertEqual(error['path'], '/packs/0/observations/0/value')

    def test_derived_name_and_project_order_are_preserved(self):
        self.embedded['packs'][0]['name'] = 'Stale heading'
        self.assertEqual(self.run_check()['errors'][0]['path'], '/packs/0/name')
        self.embedded['packs'][0]['name'] = 'Alpha'
        second = copy.deepcopy(self.pack['projects'][0])
        second.update(family_slug='beta', summary={'name': 'Beta'})
        self.pack['projects'].append(second)
        self.embedded['packs'].insert(0, {**second, 'name': 'Beta'})
        self.assertTrue(self.run_check()['errors'])

    def test_sources_are_matched_by_identifier_with_typed_fields(self):
        self.pack['sources'].append({'source_id': 'S2', 'revision': 2})
        self.embedded['sources'].insert(0, {'revision': 2, 'source_id': 'S2'})
        self.assertEqual(self.run_check()['errors'], [])
        self.embedded['sources'][1]['revision'] = True
        self.assertEqual(self.run_check()['errors'][0]['path'], '/sources/S1/revision')

    def test_duplicate_blank_missing_and_extra_source_ids_fail(self):
        original = copy.deepcopy(self.embedded['sources'])
        for sources in ([], original * 2, [{'source_id': ' '}], [{'source_id': False}],
                        [*original, {'source_id': 'extra'}]):
            with self.subTest(sources=sources):
                self.embedded['sources'] = sources
                self.assertTrue(self.run_check()['errors'])

    def test_report_and_every_generated_field_must_agree(self):
        self.embedded['report']['status'] = 'stale'
        self.assertEqual(self.run_check()['errors'][0]['path'], '/report/status')
        self.embedded['report'] = copy.deepcopy(self.pack['build_report'])
        for key in self.pack['generated']:
            saved = self.embedded['build'].pop(key)
            self.assertTrue(self.run_check()['errors'])
            self.embedded['build'][key] = saved
        self.embedded['build']['revision'] = 'different'
        self.assertEqual(self.run_check()['errors'][0]['path'], '/build/revision')

    def test_malformed_payload_containers_fail(self):
        for key in ('packs', 'sources', 'report', 'build'):
            original = self.embedded[key]
            for value in (None, '', False, [] if isinstance(original, dict) else {}):
                with self.subTest(key=key, value=value):
                    self.embedded[key] = value
                    self.assertTrue(self.run_check()['errors'])
            self.embedded[key] = original

    def test_malformed_combined_projects_and_names_fail(self):
        original = copy.deepcopy(self.pack)
        self.pack['projects'] = []
        original_packs = self.embedded['packs']
        self.embedded['packs'] = []
        error = self.run_check()['errors'][0]
        self.assertEqual(error['code'], 'PRESENTATION_SCHEMA')
        self.assertEqual(error['path'], '/projects')
        self.embedded['packs'] = original_packs
        self.pack = copy.deepcopy(original)
        for projects in ([], {}, [None], [{'family_slug': 'alpha', 'summary': {}}],
                         [{'family_slug': 'alpha', 'summary': {'name': ' '}}]):
            with self.subTest(projects=projects):
                self.pack = copy.deepcopy(original)
                self.pack['projects'] = projects
                self.assertTrue(self.run_check()['errors'])

    def test_exact_decimal_forms_and_unicode_payloads_agree(self):
        self.pack['projects'][0]['summary']['name'] = 'Evidence </script> £'
        self.embedded['packs'][0]['summary']['name'] = 'Evidence </script> £'
        self.embedded['packs'][0]['name'] = 'Evidence </script> £'
        raw = json.dumps(self.embedded).replace('"value": 1', '"value": 1.0').replace('<', '\\u003c')
        self.assertEqual(self.run_check(raw)['errors'], [])
        self.pack['projects'][0]['observations'][0]['value'] = 0.1
        raw = raw.replace('"value": 1.0', '"value": 0.10000000000000000001')
        self.assertTrue(self.run_check(raw)['errors'])

    def test_duplicate_keys_nonfinite_constants_and_invalid_json_fail(self):
        for raw in ('', '{', 'null', '[]', '{"packs":[],"packs":[]}',
                    '{"unexpected":NaN}', '{"unexpected":Infinity}'):
            with self.subTest(raw=raw):
                report = self.run_check(raw)
                self.assertTrue(report['errors'])
                self.assertEqual(report['projects_checked'], 0)

    def test_malformed_combined_roots_and_registers_fail(self):
        original = copy.deepcopy(self.pack)
        for key in ('generated', 'build_report', 'sources'):
            for value in (None, '', False):
                with self.subTest(key=key, value=value):
                    self.pack = copy.deepcopy(original)
                    self.pack[key] = value
                    self.assertTrue(self.run_check()['errors'])

    def test_missing_input_and_escaping_symlink_fail(self):
        for missing in (True, False):
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as outside:
                path = self.root / 'evidence-pack.json'
                if path.exists() or path.is_symlink():
                    path.unlink()
                if not missing:
                    external = Path(outside) / 'pack.json'
                    external.write_text(json.dumps(self.pack))
                    path.symlink_to(external)
                result = subprocess.run([sys.executable, '-B', str(SOURCE), '--root', str(self.root)],
                                        input=json.dumps(self.embedded), capture_output=True,
                                        text=True, timeout=10)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertTrue(json.loads(result.stdout)['errors'])


if __name__ == '__main__':
    unittest.main()
