"""Exercise export comparison with disposable JSON and independent type cases."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).parents[1] / 'tools' / 'family_exports.py'
spec = importlib.util.spec_from_file_location('family_exports_under_test', SOURCE)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class FamilyExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'families').mkdir()
        self.pack = {
            'generated': {'research_cutoff': '2026-09-04', 'audit_correction_date': '2026-09-07'},
            'sources': [{'source_id': 'S1', 'title': 'Synthetic source', 'metadata': {'revision': 1}}],
            'projects': [{
                'family_slug': 'alpha', 'project_id': 'P1', 'source_ids': ['S1'],
                'summary': {'name': 'Synthetic project', 'nested': [1, False, None, 'text']},
                'policy_chart': {'findings': [{'field': 'length', 'supported_value': '1 km'}]},
                'observations': [{'id': 'O1', 'source_id': 'S1', 'value': 1}],
                'components': [], 'timeline': [], 'warnings': [],
            }],
        }
        self.family = {key: copy.deepcopy(value) for key, value in self.pack['projects'][0].items()
                       if key in ('summary', 'policy_chart', 'observations', 'components', 'timeline', 'warnings')}
        self.family.update(sources=copy.deepcopy(self.pack['sources']), build=copy.deepcopy(self.pack['generated']))
        self.family['build'].update(family_slug='alpha', project_id='P1')
        self.pack_path = self.root / 'evidence-pack.json'
        self.family_path = self.root / 'families' / 'alpha.json'

    def write(self):
        self.pack_path.write_text(json.dumps(self.pack), encoding='utf-8')
        self.family_path.write_text(json.dumps(self.family), encoding='utf-8')

    def errors(self):
        self.write()
        return checker.audit(self.root)['errors']

    def test_valid_exports_pass_and_input_bytes_are_unchanged(self):
        self.write()
        before = {path: path.read_bytes() for path in (self.pack_path, self.family_path)}
        report = checker.audit(self.root)
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['families_checked'], 1)
        self.assertEqual({path: path.read_bytes() for path in before}, before)

    def test_numeric_representation_and_object_order_do_not_change_meaning(self):
        self.family['observations'][0]['value'] = 1.0
        self.family['summary'] = dict(reversed(list(self.family['summary'].items())))
        second = {'source_id': 'S2', 'title': 'Second synthetic source'}
        self.pack['sources'].append(second)
        self.pack['projects'][0]['source_ids'].append('S2')
        self.family['sources'].insert(0, copy.deepcopy(second))
        self.assertEqual(self.errors(), [])

    def test_every_distinct_family_is_checked(self):
        second = copy.deepcopy(self.pack['projects'][0])
        second['family_slug'] = 'beta'
        second['project_id'] = 'P2'
        self.pack['projects'].append(second)
        self.write()
        other = self.root / 'families' / 'beta.json'
        changed = copy.deepcopy(self.family)
        changed['build'].update(family_slug='beta', project_id='P2')
        other.write_text(json.dumps(changed))
        self.assertEqual(checker.audit(self.root)['families_checked'], 2)
        self.assertEqual(checker.audit(self.root)['errors'], [])
        changed['observations'][0]['value'] = True
        other.write_text(json.dumps(changed))
        self.assertTrue(any('beta.json' in error['path'] for error in checker.audit(self.root)['errors']))

    def test_boolean_numeric_and_nested_differences_are_rejected(self):
        for collection, field, value in [('observations', 'value', True), ('observations', 'value', False), ('observations', 'value', '1')]:
            with self.subTest(value=value):
                self.pack['projects'][0][collection][0][field] = int(value)
                self.family[collection][0][field] = value
                errors = self.errors()
                self.assertEqual(errors[0]['code'], 'EXPORT_MISMATCH')
                self.assertEqual(errors[0]['path'], 'families/alpha.json/observations/0/value')
        self.pack['projects'][0]['observations'][0]['value'] = 1
        self.family['observations'][0]['value'] = 1
        self.family['summary']['nested'][1] = 0
        self.assertEqual(self.errors()[0]['path'], 'families/alpha.json/summary/nested/1')

    def test_source_register_boolean_numeric_differences_are_rejected(self):
        self.family['sources'][0]['metadata']['revision'] = True
        self.assertEqual(self.errors()[0]['path'], 'families/alpha.json/sources/S1/metadata/revision')

    def test_decimal_precision_is_preserved_during_comparison(self):
        self.write()
        text = self.family_path.read_text().replace('"value": 1', '"value": 1.0000000000000000000001')
        self.family_path.write_text(text)
        self.assertTrue(checker.audit(self.root)['errors'])

    def test_each_substantive_collection_is_compared(self):
        for key in ('summary', 'policy_chart', 'observations', 'components', 'timeline', 'warnings'):
            with self.subTest(key=key):
                changed = copy.deepcopy(self.family)
                if isinstance(changed[key], list):
                    changed[key].append({'unexpected': 'record'})
                else:
                    changed[key]['unexpected'] = 'field'
                self.write()
                self.family_path.write_text(json.dumps(changed))
                suffix = '/' + key + ('/unexpected' if isinstance(changed[key], dict) else '')
                self.assertEqual(checker.audit(self.root)['errors'][0]['path'], 'families/alpha.json' + suffix)

    def test_nonempty_projects_and_research_metadata_are_required(self):
        original = copy.deepcopy(self.pack)
        for value in ([], {}, '', None, [None]):
            with self.subTest(projects=value):
                self.pack = copy.deepcopy(original)
                self.pack['projects'] = value
                self.assertTrue(self.errors())
        for value in ('', ' ', None, False, 1):
            with self.subTest(cutoff=value):
                self.pack = copy.deepcopy(original)
                self.pack['generated']['research_cutoff'] = value
                self.family['build']['research_cutoff'] = value
                self.assertTrue(self.errors())

    def test_blank_identities_fail_with_matching_export_files(self):
        original, exported = copy.deepcopy(self.pack), copy.deepcopy(self.family)
        for value in ('', ' '):
            with self.subTest(slug=value):
                self.pack, self.family = copy.deepcopy(original), copy.deepcopy(exported)
                self.pack['projects'][0]['family_slug'] = self.family['build']['family_slug'] = value
                self.write()
                (self.root / 'families' / (value + '.json')).write_text(json.dumps(self.family))
                self.assertTrue(checker.audit(self.root)['errors'])
            with self.subTest(project_id=value):
                self.pack, self.family = copy.deepcopy(original), copy.deepcopy(exported)
                self.pack['projects'][0]['project_id'] = self.family['build']['project_id'] = value
                self.assertTrue(self.errors())

    def test_unused_global_sources_still_require_valid_identifiers(self):
        original = copy.deepcopy(self.pack)
        for value in ('', ' ', None, True, 0):
            with self.subTest(identifier=value):
                self.pack = copy.deepcopy(original)
                self.pack['sources'].append({'source_id': value})
                self.assertTrue(self.errors())

    def test_declared_sources_require_an_array_despite_matching_registers(self):
        self.pack['sources'] = [{'source_id': 'S'}, {'source_id': '1'}]
        self.family['sources'] = copy.deepcopy(self.pack['sources'])
        self.pack['projects'][0]['observations'][0]['source_id'] = 'S'
        self.family['observations'][0]['source_id'] = 'S'
        for value in ('S1', {'S': None, '1': None}):
            with self.subTest(declared=value):
                self.pack['projects'][0]['source_ids'] = value
                self.assertTrue(self.errors())

    def test_malformed_matching_collections_and_rows_are_rejected(self):
        for key, bad in [('observations', {}), ('components', ''), ('timeline', [None]), ('warnings', [1])]:
            with self.subTest(key=key):
                saved = copy.deepcopy(self.pack['projects'][0][key]), copy.deepcopy(self.family[key])
                self.pack['projects'][0][key] = self.family[key] = bad
                self.assertTrue(self.errors())
                self.pack['projects'][0][key], self.family[key] = saved
        self.pack['projects'][0]['policy_chart']['findings'] = {}
        self.family['policy_chart']['findings'] = {}
        self.assertTrue(self.errors())

    def test_source_register_membership_and_duplicates_are_rejected(self):
        for damage in [
            lambda: self.family.update(sources=[]),
            lambda: self.family['sources'].append(copy.deepcopy(self.family['sources'][0])),
            lambda: self.pack['sources'].append(copy.deepcopy(self.pack['sources'][0])),
            lambda: self.pack['projects'][0].update(source_ids=['S1', 'S1']),
            lambda: self.pack['projects'][0].update(source_ids=['missing']),
        ]:
            with self.subTest(damage=damage):
                pack, family = copy.deepcopy(self.pack), copy.deepcopy(self.family)
                damage()
                self.assertTrue(self.errors())
                self.pack, self.family = pack, family

    def test_missing_or_escaping_exports_fail(self):
        self.write()
        self.family_path.unlink()
        self.assertTrue(checker.audit(self.root)['errors'])
        for slug in ('../escape', 'nested/path', '..\\escape', ''):
            with self.subTest(slug=slug):
                self.pack['projects'][0]['family_slug'] = slug
                self.assertTrue(self.errors())

    def test_duplicate_families_or_missing_required_fields_fail(self):
        self.pack['projects'].append(copy.deepcopy(self.pack['projects'][0]))
        self.assertTrue(self.errors())
        self.pack['projects'].pop()
        del self.family['observations']
        self.assertTrue(self.errors())

    def test_non_object_json_roots_are_rejected(self):
        for name in ('evidence-pack.json', 'families/alpha.json'):
            for value in ('null', 'false', '0', '[]', '"text"'):
                with self.subTest(name=name, value=value):
                    self.write()
                    (self.root / name).write_text(value)
                    self.assertTrue(checker.audit(self.root)['errors'])

    def test_export_dates_must_match_available_combined_metadata(self):
        for key in ('research_cutoff', 'audit_correction_date'):
            with self.subTest(key=key):
                original = self.family['build'][key]
                self.family['build'][key] = '2026-10-22'
                self.assertTrue(self.errors())
                self.family['build'][key] = original

    def test_export_identity_metadata_matches_the_combined_record(self):
        for key in ('family_slug', 'project_id'):
            with self.subTest(key=key):
                original = self.family['build'][key]
                self.family['build'][key] = 'other'
                self.assertTrue(self.errors())
                self.family['build'][key] = original
        self.pack['generated']['contract'] = 'v1'
        self.family['build']['contract'] = 'v2'
        self.assertTrue(self.errors())

    def test_duplicate_json_keys_and_non_finite_constants_fail(self):
        for replacement in ('"value": 1, "value": true', '"value": NaN', '"value": Infinity'):
            with self.subTest(replacement=replacement):
                self.write()
                self.family_path.write_text(self.family_path.read_text().replace('"value": 1', replacement))
                self.assertTrue(checker.audit(self.root)['errors'])

    def test_cli_returns_structured_failure_and_success(self):
        self.write()
        args = [sys.executable, '-B', str(SOURCE), '--root', str(self.root)]
        valid = subprocess.run(args, capture_output=True, text=True, timeout=10)
        self.assertEqual(valid.returncode, 0, valid.stderr)
        self.assertEqual(json.loads(valid.stdout)['errors'], [])
        self.family['observations'][0]['value'] = True
        self.write()
        broken = subprocess.run(args, capture_output=True, text=True, timeout=10)
        self.assertEqual(broken.returncode, 1, broken.stderr)
        self.assertTrue(json.loads(broken.stdout)['errors'])
        self.pack_path.unlink()
        absent = subprocess.run(args, capture_output=True, text=True, timeout=10)
        self.assertEqual(absent.returncode, 1, absent.stderr)
        self.assertTrue(json.loads(absent.stdout)['errors'])


if __name__ == '__main__':
    unittest.main()
