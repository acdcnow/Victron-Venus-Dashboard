#!/usr/bin/env python3
"""Static checks for the Victron Venus Dashboard card.

Covers the things the browser harness cannot see: translation parity across the
bundled languages and the deprecations that must not come back.

Run from the repository root:  python tests/static-check.py
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
LANGUAGES = ["en", "de", "es", "fr", "it"]

# Deliberately not used any more: the Shoelace components are gone from the
# Home Assistant frontend, attribute based event details no longer work and the
# card must not listen for global config events or leak them globally either.
FORBIDDEN = [
    (r"\bsl-(tab|tab-group|tab-panel|button|switch|select)\b", "Shoelace component"),
    (r"\bnew Event\(['\"]hass-more-info", "more-info must be a CustomEvent"),
    (r"event\.detail\s*=", "assigning to event.detail"),
    (r"document\.addEventListener\(\s*['\"]config-changed", "global config-changed listener"),
    (r"\bmwc-", "legacy Material Web Component"),
    (r"#111111['\"]?\s*;", "hardcoded background colour"),
    (r"hass\.data\b", "hass.data is not usable from a card"),
    (r"\bsubscribeEvents\(\s*['\"]state_changed", "state_changed subscription in a card"),
]

REQUIRED_FILES = [
    "dist/Victron-Venus-Dashboard.js",
    "dist/lib-config.js",
    "dist/lib-venus.js",
    "dist/lib-editor.js",
    "dist/editor.js",
    "dist/color-field.js",
    "dist/css-common.js",
    "dist/css-editor.js",
    *[f"dist/lang-{language}.js" for language in LANGUAGES],
    "hacs.json",
    "README.md",
    "CHANGELOG.md",
]


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    failures.append(message)


failures: list[str] = []


def read_locale(language: str) -> dict:
    """Parses the `export default { ... };` translation module.

    The files are plain JavaScript object literals with unquoted keys, so the
    keys are quoted before the body is handed to the JSON parser.
    """
    text = (DIST / f"lang-{language}.js").read_text(encoding="utf-8")
    body = text[text.index("{") : text.rindex("}") + 1]
    body = re.sub(r"^\s*//[^\n]*", "", body, flags=re.MULTILINE)
    body = re.sub(r",(\s*[}\]])", r"\1", body)
    body = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', body)
    return json.loads(body)


def flatten(mapping: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for key, value in mapping.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys |= flatten(value, path)
        else:
            keys.add(path)
    return keys


def check_files() -> None:
    for name in REQUIRED_FILES:
        if not (ROOT / name).exists():
            fail(f"missing file: {name}")


def check_translations() -> None:
    base = flatten(read_locale("en"))
    for language in LANGUAGES:
        keys = flatten(read_locale(language))
        missing = sorted(base - keys)
        extra = sorted(keys - base)
        if missing:
            fail(f"lang-{language}.js is missing: {', '.join(missing)}")
        if extra:
            fail(f"lang-{language}.js has unused keys: {', '.join(extra)}")


def check_deprecations() -> None:
    for path in sorted(DIST.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        for pattern, label in FORBIDDEN:
            for match in re.finditer(pattern, text):
                line = text[: match.start()].count("\n") + 1
                fail(f"{path.name}:{line} uses {label}: {match.group(0)!r}")


def check_imports() -> None:
    for path in sorted(DIST.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        for target in re.findall(r"from\s+['\"]\./([^'\"]+)['\"]", text):
            if not (DIST / target).exists():
                fail(f"{path.name} imports missing module {target}")
        for target in re.findall(r"import\(\s*[`'\"]\./([^`'\"]+)", text):
            name = target.split("${")[0]
            if name.endswith(".js") and not (DIST / name).exists():
                fail(f"{path.name} dynamically imports missing module {name}")


def check_manifest() -> None:
    """HACS plugins are found by name: the repository name must match the js file
    inside `dist/`, and every `.js` file next to it is downloaded as well."""
    manifest = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
    if not manifest.get("name"):
        fail("hacs.json has no name")
        return

    filename = manifest.get("filename")
    if filename and not (ROOT / filename).exists():
        fail(f"hacs.json points at a missing file: {filename}")

    entry = DIST / f"{manifest['name']}.js"
    if not entry.exists():
        fail(
            f"HACS looks for dist/{manifest['name']}.js, but it does not exist "
            "(the repository name has to match the card file name)"
        )


def check_version() -> None:
    version = re.search(
        r'VERSION\s*=\s*"([^"]+)"', (DIST / "lib-config.js").read_text(encoding="utf-8")
    )
    if not version:
        fail("dist/lib-config.js does not export a version")
        return
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    if f"## {version.group(1)}" not in changelog and f"[{version.group(1)}]" not in changelog:
        fail(f"CHANGELOG.md has no entry for version {version.group(1)}")
    page = (ROOT / "README.md").read_text(encoding="utf-8")
    if version.group(1) not in page:
        fail(f"README.md does not mention version {version.group(1)}")


def main() -> int:
    check_files()
    check_translations()
    check_deprecations()
    check_imports()
    check_manifest()
    check_version()

    if failures:
        print(f"\n{len(failures)} problem(s) found.")
        return 1
    print("static checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
