"""Read-only source-age, archive-hash and citation-graph report.

Publication age is a review aid, not proof that historical evidence is invalid.
No source retrieval, research correction, workbook editing or publication occurs.
"""
import argparse
import calendar
from collections import Counter
from datetime import date
import hashlib
from functools import lru_cache
import json
from pathlib import Path
import re
import subprocess
import unicodedata
from urllib.parse import urlsplit


def date_bounds(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}(?:-\d{2})?(?:-\d{2})?', value):
        raise ValueError('Expected YYYY, YYYY-MM or YYYY-MM-DD')
    parts = [int(part) for part in value.split('-')]
    if len(parts) == 1:
        return date(parts[0], 1, 1), date(parts[0], 12, 31), 'year'
    if len(parts) == 2:
        year, month = parts
        return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1]), 'month'
    day = date(*parts)
    return day, day, 'day'


def publication_age(value, as_of, interval):
    if value is None or value == '':
        return dict(precision='unknown', review_band='undated')
    start, end, precision = date_bounds(value)
    youngest, oldest = (as_of - end).days, (as_of - start).days
    if start > as_of:
        band = 'future_dated'
    elif youngest > interval:
        band = 'older_than_interval'
    elif oldest > interval:
        band = 'possibly_older_than_interval'
    else:
        band = 'within_interval'
    return dict(precision=precision, earliest_date=start.isoformat(), latest_date=end.isoformat(),
                minimum_age_days=youngest, maximum_age_days=oldest, review_band=band,
                period_extends_after_as_of=end > as_of)


def references(value):
    if value is None or value == '':
        return []
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        raise ValueError('Source references must be text or a list')
    return [part.strip() for part in value.split(';') if part.strip()]


@lru_cache(maxsize=512)
def browser_url_valid(value):
    try:
        result = subprocess.run(['node', str(Path(__file__).with_name('publisher-url.cjs'))],
                                input=json.dumps(value), capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError('Node URL parser is unavailable; no packages are installed automatically') from exc
    if result.returncode != 0 or result.stdout not in ('true', 'false'):
        raise RuntimeError('Node URL parser failed; source URL validity is unverified')
    return result.stdout == 'true'


def valid_publisher_url(value):
    if not isinstance(value, str) or not value or any(
            c.isspace() or unicodedata.category(c).startswith('C') or c in '<>"{}|\\^`' for c in value):
        return False
    try:
        url = urlsplit(value)
        if url.scheme not in ('http', 'https') or not url.hostname or url.username is not None or url.password is not None:
            return False
        # Accessing port validates both its syntax and its range.
        url.port
        return browser_url_valid(value)
    except (ValueError, UnicodeError):
        return False


def source_report(pack, root, *, as_of, review_interval_days):
    errors, ages, unavailable = [], [], []

    def fail(code, record, detail):
        errors.append(dict(code=code, record=record, detail=detail))

    def index(rows, field, code):
        found = {}
        for row in rows:
            key = row.get(field)
            if not isinstance(key, str) or not key.strip() or key.strip() != key:
                fail('INVALID_ID', field, 'Expected a non-blank exact identifier')
            elif key in found:
                fail(code, key, 'Identifiers must be unique')
            else:
                found[key] = row
        return found

    def rows(value, record):
        if not isinstance(value, list):
            fail('INVALID_COLLECTION', record, 'Expected an array, including for an empty collection')
            return []
        valid = []
        for position, row in enumerate(value):
            if not isinstance(row, dict):
                fail('INVALID_ROW', f'{record}/{position}', 'Expected a record object')
            else:
                valid.append(row)
        return valid

    if not isinstance(pack, dict):
        return dict(errors=[dict(code='INVALID_INPUT', record='pack', detail='Expected an evidence pack object')])
    rows(pack.get('sources'), 'sources')
    for position, project in enumerate(rows(pack.get('projects'), 'projects')):
        for field in ['observations', 'components', 'timeline', 'warnings']:
            rows(project.get(field), f'projects/{position}/{field}')
        chart = project.get('policy_chart')
        if not isinstance(chart, dict):
            fail('INVALID_ROW', f'projects/{position}/policy_chart', 'Expected a chart object')
        else:
            rows(chart.get('findings'), f'projects/{position}/policy_chart/findings')
    if errors:
        return dict(errors=errors)

    if pack.get('schema') != 'ate.project-evidence-pack.v2':
        fail('INVALID_SCHEMA', 'schema', 'Expected ate.project-evidence-pack.v2')
    cutoff = date.fromisoformat(pack['generated']['research_cutoff'])
    sources = index(pack['sources'], 'source_id', 'DUPLICATE_SOURCE')
    projects = index(pack['projects'], 'family_slug', 'DUPLICATE_FAMILY')
    index([o for p in pack['projects'] for o in p['observations']], 'id', 'DUPLICATE_OBSERVATION')
    root = root.resolve()
    for source_id, source in sources.items():
        for field, code in [('local_path', 'MISSING_ORIGINAL'), ('derivative_path', 'MISSING_DERIVATIVE')]:
            relative = source.get(field)
            if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
                fail('UNSAFE_PATH', source_id + '/' + field, 'Expected a relative archive path')
                continue
            path = (root / relative).resolve()
            if not path.is_relative_to(root):
                fail('UNSAFE_PATH', source_id + '/' + field, 'Archive path escapes site root')
            elif not path.is_file():
                fail(code, source_id, relative)
            elif field == 'local_path' and hashlib.sha256(path.read_bytes()).hexdigest() != source.get('sha256'):
                fail('HASH_MISMATCH', source_id, 'Original bytes differ from registered SHA-256')
        publisher_url_valid = valid_publisher_url(source.get('original_url'))
        if not publisher_url_valid:
            fail('INVALID_PUBLISHER_URL', source_id, 'Expected a public HTTP(S) URL without credentials')
        try:
            age = publication_age(source.get('publication_date'), as_of, review_interval_days)
        except (ValueError, TypeError) as exc:
            age = dict(precision='invalid', review_band='invalid_date')
            fail('INVALID_PUBLICATION_DATE', source_id, str(exc))
        ages.append(dict(source_id=source_id, publication_date=source.get('publication_date'), age=age,
                         original_url=source.get('original_url') if publisher_url_valid else None))

    for slug, project in projects.items():
        declared = set(references(project.get('source_ids')))

        def cite(value, record, single=False):
            if single and (not isinstance(value, str) or not value.strip() or references(value) != [value]):
                fail('INVALID_SOURCE_REFERENCE', record, 'Expected one exact source identifier')
                return
            for source_id in references(value):
                if source_id not in sources:
                    fail('UNKNOWN_SOURCE', record, f'Unresolved source {source_id}')
                if source_id not in declared:
                    fail('UNDECLARED_SOURCE', record, f'{source_id} is absent from family source_ids')

        for source_id in declared:
            if source_id not in sources:
                fail('UNKNOWN_SOURCE', slug + '/source_ids', f'Unresolved source {source_id}')
        local_observations = {o['id']: o for o in project['observations']}
        local_ids = set(local_observations)
        for observation in project['observations']:
            cite(observation.get('source_id'), slug + '/' + observation['id'], single=True)
        index(project['components'], 'id', 'DUPLICATE_COMPONENT')
        for component in project['components']:
            cite(component.get('source_id'), slug + '/component/' + str(component.get('id')), single=True)
        for i, event in enumerate(project['timeline']):
            if not references(event.get('source_id')) and event.get('status') != 'Unavailable':
                fail('MISSING_TIMELINE_SOURCE', f'{slug}/timeline/{i}', 'Cite the event or mark unavailable acquisition explicitly')
            cite(event.get('source_id'), f'{slug}/timeline/{i}')
        for i, finding in enumerate(project['policy_chart']['findings']):
            record = f'{slug}/finding/{i}'
            if finding.get('status') in ('supported', 'supported_with_boundary') and not references(finding.get('source_ids')):
                fail('MISSING_FINDING_SOURCE', record, 'Supported findings require registered citations')
            cite(finding.get('source_ids'), record)
            selected = finding.get('selected_observation')
            if selected is not None and selected != '' and (not isinstance(selected, str) or selected not in local_ids):
                fail('UNKNOWN_SELECTION', record, 'Selection must resolve to an observation in this family')
            elif isinstance(selected, str) and selected in local_observations:
                origin = local_observations[selected].get('source_id')
                if isinstance(origin, str) and origin not in references(finding.get('source_ids')):
                    fail('SELECTED_SOURCE_NOT_CITED', record,
                         f'Selected observation {selected} uses {origin}, absent from finding citations')
        for i, warning in enumerate(project['warnings']):
            if warning.get('code') == 'SOURCE_UNAVAILABLE':
                unavailable.append(dict(family=slug, source_ids=references(warning.get('source_ids'))))
            else:
                cite(warning.get('source_ids'), f'{slug}/warning/{i}')

    return dict(as_of=as_of.isoformat(), review_interval_days=review_interval_days,
                research_cutoff=cutoff.isoformat(), research_age_days=(as_of - cutoff).days,
                audit_correction_date=pack['generated'].get('audit_correction_date'),
                counts=dict(sources=len(sources), families=len(projects), publication_precision=dict(Counter(a['age']['precision'] for a in ages)),
                            review_bands=dict(Counter(a['age']['review_band'] for a in ages))),
                errors=errors, sources=ages, unavailable_sources=unavailable,
                limits=['Publication age is not capture age or proof of current-world validity.',
                        'Year/month precision is retained as an interval; no exact date is inferred.',
                        'A correction date does not refresh the research cut-off or source dates.',
                        'Offline archive/citation graph only; publisher availability, source meaning, PDF pinpoints and export equality are unchecked.'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path('site'))
    parser.add_argument('--as-of', type=date.fromisoformat, default=date.today())
    parser.add_argument('--review-interval-days', type=int, default=365)
    args = parser.parse_args()
    if args.review_interval_days < 0:
        parser.error('--review-interval-days must be non-negative')
    try:
        pack = json.loads((args.site / 'evidence-pack.json').read_text(encoding='utf-8'))
        report = source_report(pack, args.site, as_of=args.as_of, review_interval_days=args.review_interval_days)
    except RuntimeError as exc:
        report = dict(errors=[dict(code='CHECK_PREREQUISITE', record='Node URL parser', detail=str(exc))])
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        report = dict(errors=[dict(code='INVALID_INPUT', record=str(args.site), detail=str(exc))])
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if report['errors'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
