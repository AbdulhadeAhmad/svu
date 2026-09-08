#!/usr/bin/env python3
"""Prepare the generated dist/ directory using only browser runtime files."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'dist'


def main():
    if DESTINATION.is_symlink():
        raise SystemExit('Refusing to replace a symlink at dist/.')
    runtime = [ROOT / name for name in ('index.html', 'style.css', 'ite_subjects.json')]
    runtime += sorted((ROOT / 'src').rglob('*.js'))
    runtime += sorted((ROOT / 'styles').rglob('*.css'))
    runtime.append(ROOT / 'assets/videos/import-exam-history.mp4')
    for source in runtime:
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            raise SystemExit(f'Invalid runtime file: {source}')
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    for source in runtime:
        target = DESTINATION / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    print(f'Prepared {len(runtime)} static files in {DESTINATION}')


if __name__ == '__main__':
    main()
