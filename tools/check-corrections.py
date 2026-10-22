"""Run the legacy consistency validator with assertions and read-only checks."""
import os
from pathlib import Path
import runpy
import sys


def deny_mutations(event, arguments):
    """Catch accidental writes and external actions in this check process."""
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND
    if event == 'open' and arguments[2] & write_flags:
        raise PermissionError('The correction check cannot open files for writing')
    if event in {
        'os.remove', 'os.rename', 'os.rmdir', 'os.mkdir', 'os.link', 'os.symlink',
        'os.truncate', 'os.chmod', 'os.chown', 'os.utime', 'os.system',
        'os.exec', 'os.posix_spawn', 'os.fork', 'subprocess.Popen', 'socket.connect',
    }:
        raise PermissionError(f'The correction check forbids {event}')


def main():
    if not __debug__:
        raise SystemExit('The correction check requires Python assertions; remove optimisation')
    sys.dont_write_bytecode = True
    validator = Path(__file__).with_name('correct-evidence.py')
    sys.argv = [str(validator), '--check']
    sys.addaudithook(deny_mutations)
    runpy.run_path(str(validator), run_name='__main__')


if __name__ == '__main__':
    main()
