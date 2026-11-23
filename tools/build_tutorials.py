#!/usr/bin/env python3
"""Turn every labs/<name>/tutorial.md into labs/<name>/tutorial.html.

The .md file is the source. The .html file is what the lab's Tutorial panel shows,
and it is committed, so GitHub Pages needs no build step.

    pip install markdown
    python3 tools/build_tutorials.py            # all labs
    python3 tools/build_tutorials.py hair ssao  # only these labs
"""
import html
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<script>if (window.self !== window.top) document.documentElement.classList.add("in-panel");</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/tutorial.css">
</head>
<body>
<nav class="page-nav"><a href="index.html#tutorial">Open the lab with this tutorial</a><a href="../../index.html#{slug}">All labs</a></nav>
<main class="tutorial">
{body}
</main>
</body>
</html>
"""


def build(folder: Path) -> None:
    source = folder / "tutorial.md"
    text = source.read_text(encoding="utf-8")
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])
    # diagrams get a wrapper: the stylesheet fits them to the dark page and lets them scroll sideways in the narrow panel
    body = re.sub(r'<img ([^>]*src="[^"]+\.svg"[^>]*)>', r'<span class="diagram-wrap"><img class="diagram" \1></span>', body)
    # wide tables scroll sideways inside the narrow panel
    body = body.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    # links that leave the site open in a new tab, so the lab keeps running
    body = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', body)
    first = re.search(r"^# (.+)$", text, re.M)
    title = html.escape(first.group(1).strip() if first else folder.name)
    (folder / "tutorial.html").write_text(PAGE.format(title=title, slug=folder.name, body=body), encoding="utf-8")
    print("built", (folder / "tutorial.html").relative_to(ROOT))


def main() -> None:
    names = sys.argv[1:]
    folders = [ROOT / "labs" / n for n in names] if names else sorted((ROOT / "labs").iterdir())
    for folder in folders:
        if (folder / "tutorial.md").exists():
            build(folder)
        elif names:
            sys.exit(f"no tutorial.md in {folder}")


if __name__ == "__main__":
    main()
