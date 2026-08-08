#!/usr/bin/env python3
"""Normalise the site to US spelling.

The client reads the site as a US supplier and flagged "catalogue"; the same
British-English drift runs through the authored product copy ("signalling",
"analogue", "stabilised"), so this fixes the class rather than the instance.

Stems only, so inflections come along for free: "signalling" and "signalled"
both fall out of the "signall" -> "signal" rule. Case of the first letter is
preserved, which is all that matters here since none of these appear in
all-caps.
"""

import pathlib
import re
import sys

# Longest first, so a stem never eats a more specific one.
PAIRS = [
    ("lyophilisation", "lyophilization"),
    ("characteris", "characteriz"),
    ("recognis", "recogniz"),
    ("mislabell", "mislabel"),
    ("signalling", "signaling"),
    ("signalled", "signaled"),
    ("behaviour", "behavior"),
    ("programme", "program"),
    ("catalogue", "catalog"),
    ("glycaem", "glycem"),
    ("modelling", "modeling"),
    ("stabilis", "stabiliz"),
    ("analogue", "analog"),
    ("optimis", "optimiz"),
    ("labelled", "labeled"),
    ("enquir", "inquir"),
    ("colour", "color"),
    ("centre", "center"),
    ("ageing", "aging"),
]

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src"

# Identifiers that merely *contain* a British stem and must survive untouched.
# `aria-labelledby` is spelled with two Ls in the ARIA spec regardless of
# dialect; rewriting it to `aria-labeledby` silently drops the accessible name,
# which is exactly what happened the first time this script ran.
PROTECTED = ["aria-labelledby"]


def swap(text: str) -> str:
    for i, word in enumerate(PROTECTED):
        text = text.replace(word, f"\x00{i}\x00")

    for src, dst in PAIRS:
        # \b on the left, but allow a prefix in front of it. Anchoring hard to
        # the word start missed "remodelling" entirely: the stem is "modelling"
        # and "re" sits before it, so \bmodelling never matched. The client
        # caught that one on the live site.
        text = re.sub(rf"\b([a-z]*?){src}", lambda m: m.group(1) + dst, text)
        text = re.sub(rf"\b{src.capitalize()}", dst.capitalize(), text)
        # Prefixed forms that keep their own capital, e.g. "Remodelling".
        text = re.sub(
            rf"\b([A-Z][a-z]*?){src}", lambda m: m.group(1) + dst, text
        )

    for i, word in enumerate(PROTECTED):
        text = text.replace(f"\x00{i}\x00", word)
    return text


def main() -> int:
    changed = []
    for path in sorted(ROOT.rglob("*")):
        if path.suffix not in {".ts", ".tsx", ".css"} or not path.is_file():
            continue
        before = path.read_text()
        after = swap(before)
        if after != before:
            path.write_text(after)
            changed.append(path.relative_to(ROOT.parent.parent))

    for p in changed:
        print(p)
    print(f"\n{len(changed)} files updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
