"""Compare archived family exports with their combined JSON records, read-only."""
import argparse
from decimal import Decimal
import json
from pathlib import Path

FIELDS = {'summary': dict, 'policy_chart': dict, 'observations': list,
          'components': list, 'timeline': list, 'warnings': list}


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON object key: ' + key)
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError('Non-finite JSON constant: ' + value)


def read_json(path):
    return json.loads(path.read_bytes(), object_pairs_hook=strict_object,
                      parse_float=Decimal, parse_constant=reject_constant)


def pointer(value):
    return str(value).replace('~', '~0').replace('/', '~1')


def first_difference(left, right, path=''):
    if isinstance(left, bool) or isinstance(right, bool):
        return None if type(left) is type(right) and left == right else path or '/'
    if isinstance(left, (int, Decimal)) and isinstance(right, (int, Decimal)):
        return None if left == right else path or '/'
    if type(left) is not type(right):
        return path or '/'
    if isinstance(left, dict):
        if left.keys() != right.keys():
            return path + '/' + pointer(sorted(left.keys() ^ right.keys())[0])
        for key in sorted(left):
            difference = first_difference(left[key], right[key], path + '/' + pointer(key))
            if difference is not None:
                return difference
        return None
    if isinstance(left, list):
        if len(left) != len(right):
            return path or '/'
        for index, (a, b) in enumerate(zip(left, right)):
            difference = first_difference(a, b, path + '/' + str(index))
            if difference is not None:
                return difference
        return None
    return None if left == right else path or '/'


def audit(root):
    root = Path(root).resolve()
    report = {'families_checked': 0, 'errors': []}

    def error(code, path, detail):
        report['errors'].append({'code': code, 'path': path, 'detail': detail})

    def load(path, label):
        try:
            if not path.resolve().is_relative_to(root):
                error('UNSAFE_EXPORT_PATH', label, 'Resolved input escapes the selected root')
                return None
            data = read_json(path)
            if not isinstance(data, dict):
                error('EXPORT_SCHEMA', label, 'JSON input must be an object')
                return None
            return data
        except (OSError, UnicodeError, ValueError, ArithmeticError, RuntimeError) as exc:
            error('EXPORT_INPUT_ERROR', label, str(exc))
            return None

    def register(rows, path):
        if not isinstance(rows, list):
            error('EXPORT_SCHEMA', path, 'Source register must be an array')
            return None
        result = {}
        for index, row in enumerate(rows):
            identifier = row.get('source_id') if isinstance(row, dict) else None
            if not isinstance(identifier, str) or not identifier.strip() or identifier in result:
                error('EXPORT_SCHEMA', path + '/' + str(index), 'Source IDs must be nonblank and unique')
                return None
            result[identifier] = row
        return result

    def substantive(record, path):
        if not isinstance(record, dict):
            error('EXPORT_SCHEMA', path, 'Family record must be an object')
            return False
        for key, expected in FIELDS.items():
            value = record.get(key)
            if not isinstance(value, expected):
                error('EXPORT_SCHEMA', path + '/' + key, 'Missing or malformed substantive field')
                return False
            if expected is list and any(not isinstance(row, dict) for row in value):
                error('EXPORT_SCHEMA', path + '/' + key, 'Collection rows must be objects')
                return False
        findings = record['policy_chart'].get('findings')
        if not isinstance(findings, list) or any(not isinstance(row, dict) for row in findings):
            error('EXPORT_SCHEMA', path + '/policy_chart/findings', 'Findings must be an array of objects')
            return False
        return True

    pack = load(root / 'evidence-pack.json', 'evidence-pack.json')
    if pack is None:
        return report
    if not isinstance(pack, dict) or not isinstance(pack.get('projects'), list) or not pack['projects']:
        error('EXPORT_SCHEMA', 'evidence-pack.json', 'Combined pack needs a nonempty projects array')
        return report
    sources = register(pack.get('sources'), '/sources')
    generated = pack.get('generated')
    if not isinstance(generated, dict) or not isinstance(generated.get('research_cutoff'), str) or not generated['research_cutoff'].strip():
        error('EXPORT_SCHEMA', '/generated', 'Combined research cut-off is required')
        return report
    if sources is None:
        return report
    seen = set()
    for index, project in enumerate(pack['projects']):
        location = '/projects/' + str(index)
        if not substantive(project, location):
            continue
        slug = project.get('family_slug')
        if not isinstance(slug, str) or not slug.strip() or slug in ('.', '..') or any(char in slug for char in ('/', '\\', '\0')):
            error('UNSAFE_EXPORT_PATH', location + '/family_slug', 'Family slug must be a single nonblank path component')
            continue
        if slug in seen:
            error('EXPORT_SCHEMA', location + '/family_slug', 'Duplicate family slug')
            continue
        seen.add(slug)
        project_id = project.get('project_id')
        if not isinstance(project_id, str) or not project_id.strip():
            error('EXPORT_SCHEMA', location + '/project_id', 'Combined project ID must be a nonblank string')
            continue
        declared = project.get('source_ids')
        if not isinstance(declared, list) or any(not isinstance(value, str) or not value.strip() for value in declared):
            error('EXPORT_SCHEMA', location + '/source_ids', 'Declared source IDs must be an array of nonblank strings')
            continue
        if len(set(declared)) != len(declared) or any(value not in sources for value in declared):
            error('EXPORT_SOURCE_MISMATCH', location + '/source_ids', 'Duplicate or unregistered declared source ID')
            continue
        label = 'families/' + slug + '.json'
        family = load(root / label, label)
        if family is None or not substantive(family, label):
            continue
        report['families_checked'] += 1
        for field in FIELDS:
            difference = first_difference(project[field], family[field], '/' + field)
            if difference is not None:
                error('EXPORT_MISMATCH', label + difference, 'Substantive JSON differs from the combined record')
        exported_sources = register(family.get('sources'), label + '/sources')
        if exported_sources is not None:
            if set(exported_sources) != set(declared):
                error('EXPORT_SOURCE_MISMATCH', label + '/sources', 'Exported register differs from the declared source set')
            for identifier in set(exported_sources) & set(declared):
                difference = first_difference(sources[identifier], exported_sources[identifier], '/sources/' + pointer(identifier))
                if difference is not None:
                    error('EXPORT_MISMATCH', label + difference, 'Source record differs from the combined register')
        build = family.get('build')
        if not isinstance(build, dict):
            error('EXPORT_SCHEMA', label + '/build', 'Family build metadata must be an object')
            continue
        identities = {'family_slug': slug, 'project_id': project_id}
        if 'contract' in generated:
            identities['contract'] = generated['contract']
        for key, expected in identities.items():
            if first_difference(expected, build.get(key)) is not None:
                error('EXPORT_IDENTITY_MISMATCH', label + '/build/' + key, 'Export identity differs from the combined record')
        for key in ('research_cutoff', 'audit_correction_date'):
            if key in generated and first_difference(generated[key], build.get(key)) is not None:
                error('EXPORT_DATE_MISMATCH', label + '/build/' + key, 'Export date differs from combined metadata')
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1] / 'site')
    args = parser.parse_args(argv)
    report = audit(args.root)
    print(json.dumps(report, indent=2))
    return int(bool(report['errors']))


if __name__ == '__main__':
    raise SystemExit(main())
