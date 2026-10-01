"""Validate Markdown wikilinks and native template configuration without writing files."""
import argparse
import json
import re
from pathlib import Path


def check_vault(root):
    root = Path(root)
    notes = list(root.rglob('*.md'))
    index = {}
    for note in notes:
        if '.obsidian' in note.parts:
            continue
        index.setdefault(note.stem.casefold(), []).append(note)
    errors = []
    links = 0
    for note in notes:
        if '.obsidian' in note.parts:
            continue
        content = note.read_text(encoding='utf-8-sig')
        for match in re.finditer(r'\[\[([^\]|#]+)(?:[^\]]*)\]\]', content):
            target = match.group(1).strip()
            if '/' in target:
                candidate = root / (target if target.endswith('.md') else target + '.md')
                found = candidate.is_file()
            else:
                found = target.casefold() in index or target.removesuffix('.md').casefold() in index
            links += 1
            if not found:
                errors.append(f'{note.relative_to(root)} -> {target}')
    for config_name in ('daily-notes.json', 'templates.json'):
        config_path = root / '.obsidian' / config_name
        config = json.loads(config_path.read_text(encoding='utf-8-sig'))
        if not (root / config['folder']).is_dir():
            errors.append(f'{config_name}: folder missing')
        if config.get('template') and not (root / (config['template'] + '.md')).is_file():
            errors.append(f'{config_name}: template missing')
    print(f'{len(index)} note names; {links} wikilinks checked; {len(errors)} error(s).')
    for error in errors:
        print(error)
    return 1 if errors else 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('vault', type=Path)
    raise SystemExit(check_vault(parser.parse_args().vault))
