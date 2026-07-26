import argparse
import sys
from . import __version__, __app_name__


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        prog="myagent",
        description=f"{__app_name__} - Lightweight terminal AI client for OmniRoute",
        epilog="Run without arguments for interactive mode."
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug mode (shows routing metadata)"
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"{__app_name__} v{__version__}"
    )
    return parser.parse_args(argv)


def main():
    args = parse_args()
    from .chat import run
    try:
        run(debug_mode=args.debug)
    except KeyboardInterrupt:
        print()
        sys.exit(0)
