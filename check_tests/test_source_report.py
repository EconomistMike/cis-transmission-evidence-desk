"""Independent date examples and disposable source/citation graphs."""
from datetime import date
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from tools.source_report import browser_url_valid, date_bounds, publication_age, source_report, valid_publisher_url


class DateTests(unittest.TestCase):
    def test_calendar_precision_is_preserved(self):
        self.assertEqual(date_bounds('2024'), (date(2024, 1, 1), date(2024, 12, 31), 'year'))
        self.assertEqual(date_bounds('2024-02'), (date(2024, 2, 1), date(2024, 2, 29), 'month'))
        self.assertEqual(date_bounds('2026-02-28'), (date(2026, 2, 28), date(2026, 2, 28), 'day'))

    def test_invalid_dates_are_not_guessed(self):
        for text in ['2026-02-29', '2026-13', '2026-2', '26', '2026-01-02T00:00:00', 'unknown', 2026]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                date_bounds(text)

    def test_partial_dates_produce_age_intervals(self):
        result = publication_age('2026-09', date(2026, 10, 22), 30)
        self.assertEqual((result['minimum_age_days'], result['maximum_age_days']), (22, 51))
        self.assertEqual(result['review_band'], 'possibly_older_than_interval')
        self.assertEqual(publication_age('2026-09-22', date(2026, 10, 22), 30)['review_band'], 'within_interval')
        self.assertEqual(publication_age('2026-09-21', date(2026, 10, 22), 30)['review_band'], 'older_than_interval')

    def test_missing_and_future_dates_remain_explicit(self):
        self.assertEqual(publication_age('', date(2026, 10, 22), 30)['review_band'], 'undated')
        self.assertEqual(publication_age('2027', date(2026, 10, 22), 30)['review_band'], 'future_dated')
        year = publication_age('2026', date(2026, 10, 22), 30)
        self.assertTrue(year['period_extends_after_as_of'])
        self.assertLess(year['minimum_age_days'], 0)
        self.assertFalse(publication_age('2026-10-22', date(2026, 10, 22), 30)['period_extends_after_as_of'])


class SourceReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'sources').mkdir()
        (self.root / 'sources/source.pdf').write_bytes(b'original bytes')
        (self.root / 'sources/source.txt').write_text('Source text')
        source = dict(source_id='S1', local_path='sources/source.pdf', derivative_path='sources/source.txt',
                      sha256=hashlib.sha256(b'original bytes').hexdigest(), publication_date='2026-09',
                      original_url='https://example.org/report')
        self.pack = dict(schema='ate.project-evidence-pack.v2', generated=dict(research_cutoff='2026-09-04', audit_correction_date='2026-10-22'),
                         sources=[source], projects=[dict(family_slug='test', source_ids=['S1'], observations=[dict(id='O1', source_id='S1')],
                         components=[], timeline=[], warnings=[], policy_chart=dict(findings=[dict(field='cost', selected_observation='O1', source_ids='S1', status='supported')]))])

    def report(self):
        return source_report(self.pack, self.root, as_of=date(2026, 10, 22), review_interval_days=30)

    def codes(self):
        return {x['code'] for x in self.report()['errors']}

    def test_malformed_containers_and_rows_cannot_erase_validation(self):
        project = self.pack['projects'][0]
        slots = [(self.pack, 'sources'), (self.pack, 'projects'), (project, 'observations'),
                 (project, 'components'), (project, 'timeline'), (project, 'warnings'),
                 (project['policy_chart'], 'findings')]
        for owner, field in slots:
            original = owner[field]
            for malformed in [{}, '', None, 42, [None], ['record'], [[]]]:
                with self.subTest(field=field, malformed=malformed):
                    owner[field] = malformed
                    self.assertTrue({'INVALID_COLLECTION', 'INVALID_ROW'} & self.codes())
            owner[field] = original
        for field in ['components', 'timeline', 'warnings']:
            project[field] = []
        project['policy_chart']['findings'] = []
        self.assertEqual(self.report()['errors'], [])

    def test_valid_sources_and_research_age_are_independent_of_correction_date(self):
        report = self.report()
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['research_age_days'], 48)
        self.assertEqual(report['sources'][0]['age']['review_band'], 'possibly_older_than_interval')
        self.assertEqual(report['sources'][0]['age']['precision'], 'month')

    def test_missing_changed_or_escaping_archives_fail(self):
        (self.root / 'sources/source.pdf').write_bytes(b'changed')
        self.assertIn('HASH_MISMATCH', self.codes())
        (self.root / 'sources/source.pdf').unlink()
        self.assertIn('MISSING_ORIGINAL', self.codes())
        self.pack['sources'][0]['local_path'] = '../outside'
        self.assertIn('UNSAFE_PATH', self.codes())

    def test_derivative_and_publisher_url_are_checked(self):
        (self.root / 'sources/source.txt').unlink()
        self.pack['sources'][0]['original_url'] = 'javascript:alert(1)'
        self.assertTrue({'MISSING_DERIVATIVE', 'INVALID_PUBLISHER_URL'} <= self.codes())

    def test_malformed_publisher_urls_are_rejected_without_exposing_credentials(self):
        for url in [None, 0, ['not-a-url'], {'url': 'not-a-url'}, 'https://example.org:bogus/report', 'https://example.org:99999/report',
                    'https://192.0.2.999/report', 'https://256.256.256.256/report',
                    'https://xn--a.example/report', 'https://bad host.example/report', 'https://exam\nple.org/report',
                    'https://example.org/\tfile', 'https://example.org/report title.pdf',
                    'https://example.org/report\x00.pdf', 'https://-bad.example/report',
                    'https://bad..example/report', 'https://example.org../report', 'https://[invalid]/report',
                    'https://reader:synthetic-password@example.org/report', 'https://@example.org/report']:
            with self.subTest(url=url):
                self.pack['sources'][0]['original_url'] = url
                report = self.report()
                self.assertIn('INVALID_PUBLISHER_URL', {x['code'] for x in report['errors']})
                self.assertNotIn('synthetic-password', json.dumps(report))

    def test_missing_url_parser_is_unverified_and_not_a_publisher_failure(self):
        browser_url_valid.cache_clear()
        with patch('tools.source_report.subprocess.run', side_effect=FileNotFoundError('node')):
            with self.assertRaisesRegex(RuntimeError, 'unavailable'):
                valid_publisher_url('https://example.org/parser-prerequisite')
        browser_url_valid.cache_clear()
        for code, output in [(1, 'true'), (0, 'unexpected')]:
            with self.subTest(code=code, output=output), patch('tools.source_report.subprocess.run', return_value=subprocess.CompletedProcess(['node'], code, output, '')):
                with self.assertRaisesRegex(RuntimeError, 'failed'):
                    browser_url_valid('https://example.org/parser-failure')
            browser_url_valid.cache_clear()

    def test_hostname_length_boundary_is_enforced(self):
        host = '.'.join(['a' * 63] * 3 + ['b' * 61])
        self.pack['sources'][0]['original_url'] = 'https://' + host + '/report'
        self.assertEqual(self.report()['errors'], [])
        self.pack['sources'][0]['original_url'] = 'https://' + host + 'b/report'
        self.assertIn('INVALID_PUBLISHER_URL', self.codes())

    def test_missing_and_blank_identifiers_are_invalid(self):
        for identifier in [None, '', ' ', False, 0]:
            with self.subTest(identifier=identifier):
                self.pack['sources'][0]['source_id'] = identifier
                self.assertIn('INVALID_ID', self.codes())

    def test_valid_publisher_url_forms_are_retained(self):
        for url in ['https://example.org:443/report?q=1#page=3', 'http://example.org/file%20name.pdf',
                    'https://192.0.2.1/report', 'https://xn--bcher-kva.example/report',
                    'https://bücher.example/report', 'https://[2001:db8::1]:8443/report']:
            with self.subTest(url=url):
                self.pack['sources'][0]['original_url'] = url
                self.assertEqual(self.report()['errors'], [])

    def test_invalid_path_forms_and_symlink_escape_fail(self):
        for path in ['', None, '/etc/passwd']:
            with self.subTest(path=path):
                self.pack['sources'][0]['local_path'] = path
                self.assertIn('UNSAFE_PATH', self.codes())
        (self.root / 'escape').symlink_to(self.root.parent, target_is_directory=True)
        self.pack['sources'][0]['local_path'] = 'escape/outside'
        self.assertIn('UNSAFE_PATH', self.codes())

    def test_component_sources_and_timeline_acquisitions_remain_explicit(self):
        project = self.pack['projects'][0]
        project['components'] = [dict(id='C1', source_id=' ')]
        self.assertIn('INVALID_SOURCE_REFERENCE', self.codes())
        project['components'] = []
        project['timeline'] = [dict(source_id='', status='planner')]
        self.assertIn('MISSING_TIMELINE_SOURCE', self.codes())
        project['timeline'][0]['status'] = 'Unavailable'
        self.assertEqual(self.report()['errors'], [])

    def test_duplicate_source_observation_and_component_ids_fail(self):
        self.pack['sources'] *= 2
        project = self.pack['projects'][0]
        project['observations'] *= 2
        project['components'] = [dict(id='C1', source_id='S1')] * 2
        self.assertTrue({'DUPLICATE_SOURCE', 'DUPLICATE_OBSERVATION', 'DUPLICATE_COMPONENT'} <= self.codes())

    def test_unresolved_observation_and_family_citations_fail(self):
        project = self.pack['projects'][0]
        project['observations'][0]['source_id'] = 'missing'
        project['source_ids'] = []
        self.assertTrue({'UNKNOWN_SOURCE', 'UNDECLARED_SOURCE'} <= self.codes())

    def test_blank_source_and_malformed_selection_are_rejected(self):
        project = self.pack['projects'][0]
        for value in [' ', None, 'S1;S1']:
            with self.subTest(value=value):
                project['observations'][0]['source_id'] = value
                self.assertIn('INVALID_SOURCE_REFERENCE', self.codes())
        project['observations'][0]['source_id'] = 'S1'
        for value in [False, 0, [], {}, 'absent']:
            with self.subTest(value=value):
                project['policy_chart']['findings'][0]['selected_observation'] = value
                self.assertIn('UNKNOWN_SELECTION', self.codes())

    def test_supported_findings_require_sources_and_unavailable_sources_stay_unverified(self):
        project = self.pack['projects'][0]
        project['policy_chart']['findings'][0]['source_ids'] = ''
        self.assertIn('MISSING_FINDING_SOURCE', self.codes())
        project['policy_chart']['findings'][0]['source_ids'] = 'S1'
        project['warnings'] = [dict(code='SOURCE_UNAVAILABLE', source_ids='unavailable', severity='blocker')]
        report = self.report()
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['unavailable_sources'], [dict(family='test', source_ids=['unavailable'])])

    def test_invalid_publication_date_is_a_diagnostic_and_not_an_invented_age(self):
        self.pack['sources'][0]['publication_date'] = '2026-02-30'
        self.assertIn('INVALID_PUBLICATION_DATE', self.codes())

    def test_cli_is_read_only_and_uses_exit_status_for_integrity(self):
        path = self.root / 'evidence-pack.json'
        path.write_text(json.dumps(self.pack))
        before = path.read_bytes()
        command = [sys.executable, 'tools/source_report.py', '--site', str(self.root), '--as-of', '2026-10-22', '--review-interval-days', '30']
        good = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stderr + good.stdout)
        (self.root / 'sources/source.pdf').write_bytes(b'changed')
        bad = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1, bad.stderr)
        self.assertIn('HASH_MISMATCH', {e['code'] for e in json.loads(bad.stdout)['errors']})
        self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
