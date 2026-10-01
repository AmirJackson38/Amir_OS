"""Atomic writes for generated views and review candidates."""
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def exclusive_writer(path):
    """Fail visibly instead of overwriting another client's concurrent queue update."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_name(path.name + '.lock')
    with lock_path.open('x', encoding='utf-8') as handle:
        handle.write(str(os.getpid()))
    try:
        yield
    finally:
        lock_path.unlink()


def atomic_write(path, content):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                         dir=path.parent, prefix="." + path.name,
                                         suffix=".tmp", delete=False) as handle:
            temp_path = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()
