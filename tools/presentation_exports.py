"""Compare browser-extracted embedded JSON with the combined pack, read-only.

The browser wrapper owns HTML parsing and entry-point byte identity. Supply its
single script payload on standard input; this checker owns strict JSON equality.
"""
import argparse
from decimal import Decimal
import json
from pathlib import Path
import sys

from family_exports import first_difference, pointer, read_json, reject_constant, strict_object


def audit(root, embedded):
    root = Path(root).resolve()
    report = {'projects_checked': 0, 'errors': []}

    def error(code, path, detail):
        report['errors'].append({'code': code, 'path': path, 'detail': detail})

    path = root / 'evidence-pack.json'
    try:
        if not path.resolve().is_relative_to(root):
            raise ValueError('Combined input escapes the selected root')
        pack = read_json(path)
    except (OSError, UnicodeError, ValueError, ArithmeticError, RuntimeError) as exc:
        error('PRESENTATION_INPUT_ERROR', 'evidence-pack.json', str(exc))
        return report
    if not isinstance(pack, dict) or not isinstance(embedded, dict):
        error('PRESENTATION_SCHEMA', '/', 'Combined and embedded JSON must be objects')
        return report
    projects = pack.get('projects')
    if not isinstance(projects, list) or not projects:
        error('PRESENTATION_SCHEMA', '/projects', 'Combined projects must be a nonempty array')
        return report
    expected = []
    for index, project in enumerate(projects):
        summary = project.get('summary') if isinstance(project, dict) else None
        name = summary.get('name') if isinstance(summary, dict) else None
        if not isinstance(name, str) or not name.strip():
            error('PRESENTATION_SCHEMA', '/projects/' + str(index), 'Project needs a nonblank summary name')
            return report
        expected.append({**project, 'name': name})
    for key, value, kind in [('packs', expected, list), ('report', pack.get('build_report'), dict)]:
        actual = embedded.get(key)
        if not isinstance(value, kind) or not isinstance(actual, kind):
            error('PRESENTATION_SCHEMA', '/' + key, 'Missing or malformed comparison field')
            continue
        difference = first_difference(value, actual, '/' + key)
        if difference is not None:
            error('PRESENTATION_MISMATCH', difference, 'Embedded JSON differs from the combined record')
    report['projects_checked'] = len(expected)

    def register(rows, label):
        if not isinstance(rows, list):
            error('PRESENTATION_SCHEMA', label, 'Source register must be an array')
            return None
        result = {}
        for index, row in enumerate(rows):
            identifier = row.get('source_id') if isinstance(row, dict) else None
            if not isinstance(identifier, str) or not identifier.strip() or identifier in result:
                error('PRESENTATION_SCHEMA', label + '/' + str(index), 'Source IDs must be nonblank and unique')
                return None
            result[identifier] = row
        return result

    combined_sources = register(pack.get('sources'), '/sources')
    embedded_sources = register(embedded.get('sources'), '/embedded/sources')
    if combined_sources is not None and embedded_sources is not None:
        difference = first_difference(combined_sources, embedded_sources, '/sources')
        if difference is not None:
            error('PRESENTATION_MISMATCH', difference, 'Embedded source register differs from the combined register')
    generated, build = pack.get('generated'), embedded.get('build')
    if not isinstance(generated, dict) or not isinstance(build, dict):
        error('PRESENTATION_SCHEMA', '/build', 'Generated and presentation metadata must be objects')
    else:
        for key, value in generated.items():
            if key not in build:
                error('PRESENTATION_MISMATCH', '/build/' + pointer(key), 'Generated field missing from presentation metadata')
                continue
            difference = first_difference(value, build[key], '/build/' + pointer(key))
            if difference is not None:
                error('PRESENTATION_MISMATCH', difference, 'Presentation metadata differs from combined metadata')
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1] / 'site')
    args = parser.parse_args(argv)
    try:
        embedded = json.loads(sys.stdin.read(), object_pairs_hook=strict_object,
                              parse_float=Decimal, parse_constant=reject_constant)
    except (UnicodeError, ValueError, ArithmeticError) as exc:
        report = {'projects_checked': 0, 'errors': [
            {'code': 'PRESENTATION_INPUT_ERROR', 'path': '/embedded', 'detail': str(exc)}]}
    else:
        report = audit(args.root, embedded)
    print(json.dumps(report, indent=2))
    return int(bool(report['errors']))


if __name__ == '__main__':
    raise SystemExit(main())
