"""Insert missing '<' before closing tags left by UTF-8 recovery."""
from pathlib import Path
import re

TAG = r"(?:p|div|span|strong|button|h[1-6]|em|i|option|label|small|b|ul|li|header|section|article|footer|nav|template|a|tr|td|th|table|form|textarea|select|style|script)"
# char (not <) then /tag>  ->  char</tag>
pat = re.compile(rf"(?<!<)/({TAG})>", re.I)


def fix_text(text: str) -> str:
    # Only fix when previous char looks like content (CJK, punct, letter, digit, +, etc.)
    def repl(m: re.Match[str]) -> str:
        start = m.start()
        if start == 0:
            return m.group(0)
        prev = text[start - 1]
        if prev == "<":
            return m.group(0)
        # already </tag
        if start >= 2 and text[start - 1] == "/" and text[start - 2] == "<":
            return m.group(0)
        return f"</{m.group(1)}>"

    # Simpler approach: replace X/tag> with X</tag> when X is not <
    out = []
    i = 0
    while i < len(text):
        m = pat.search(text, i)
        if not m:
            out.append(text[i:])
            break
        # check char before /
        if m.start() > 0 and text[m.start() - 1] != "<":
            out.append(text[i : m.start()])
            out.append(f"</{m.group(1)}>")
            i = m.end()
        else:
            out.append(text[i : m.end()])
            i = m.end()
    return "".join(out)


def main() -> None:
    root = Path(r"d:\petserver\apps\user-web\src")
    for p in root.rglob("*.vue"):
        raw = p.read_text(encoding="utf-8")
        fixed = fix_text(raw)
        if fixed != raw:
            p.write_text(fixed, encoding="utf-8", newline="\n")
            print("fixed", p.name)


if __name__ == "__main__":
    main()
