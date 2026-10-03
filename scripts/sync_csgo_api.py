#!/usr/bin/env python3
"""Regenerate the sticker / music-kit data that ships with the panel and the plugin.

Sources (same ones the original generators used):
  * https://github.com/ByMykel/CSGO-API  -> en + zh-CN stickers.json / music_kits.json

Regenerated blocks:
  * Panel/src/data/stickers.ts          -> allStickers
  * Panel/src/data/skins.ts             -> musicKits
  * Panel/src/data/localNames.ts        -> musicKitNameMap
  * addons/.../PlayerSkinMod/Data/StaticData.cs -> KitIds (random-pick pool)

Everything else in those files is left untouched. Run from the repository root:

    python3 scripts/sync_csgo_api.py

Weapon/knife/glove paint kits are NOT handled here: the panel's weaponPaints
mirrors the plugin's GunPaints pool and is edited by hand when Valve ships a
new collection.
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api"
ROOT = Path(__file__).resolve().parent.parent

STICKERS_TS = ROOT / "Panel/src/data/stickers.ts"
SKINS_TS = ROOT / "Panel/src/data/skins.ts"
LOCAL_NAMES_TS = ROOT / "Panel/src/data/localNames.ts"
STATIC_DATA_CS = (
    ROOT
    / "addons/counterstrikesharp/plugins/PlayerSkinMod/Data/StaticData.cs"
)


def fetch(path: str):
    req = urllib.request.Request(f"{BASE}/{path}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read())


def js_string(value: str) -> str:
    """Escape a value for a double-quoted TS string literal."""
    return value.replace("\\", "\\\\").replace('"', '\\"')


def ts_single(value: str) -> str:
    """Escape a value for a single-quoted TS string literal."""
    return value.replace("\\", "\\\\").replace("'", "\\'")


def replace_block(text: str, start_marker: str, end_marker: str, body: str) -> str:
    """Replace the text between two markers (exclusive) with `body`."""
    start = text.index(start_marker) + len(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + body + text[end:]


# ── stickers ────────────────────────────────────────────────────────────

def sync_stickers() -> int:
    stickers = fetch("en/stickers.json")
    entries = {}
    for sticker in stickers:
        entries[int(sticker["def_index"])] = sticker

    lines = []
    for def_index in sorted(entries):
        sticker = entries[def_index]
        lines.append(
            "  { id: %d, name: \"%s\", image: \"%s\" },"
            % (def_index, js_string(sticker["name"]), js_string(sticker["image"]))
        )

    text = STICKERS_TS.read_text(encoding="utf-8")
    header = "export const allStickers: StickerData[] = ["
    text = replace_block(text, header, "\n];", "\n" + "\n".join(lines))
    STICKERS_TS.write_text(text, encoding="utf-8")
    return len(entries)


# ── music kits ──────────────────────────────────────────────────────────

def load_music_kits():
    """Return {id: {"plain": {...}, "stat": {...}}} with en/zh name + image."""
    kits = {}
    for lang in ("en", "zh-CN"):
        for kit in fetch(f"{lang}/music_kits.json"):
            kit_id = int(kit["def_index"])
            entry = kits.setdefault(kit_id, {})
            variant = "stat" if kit["name"].startswith("StatTrak") else "plain"
            entry[f"has_{variant}"] = True
            slot = entry.setdefault(variant, {})
            if lang == "en":
                slot["name_en"] = kit["name"]
                slot["image"] = kit["image"]
            else:
                slot["name_zh"] = kit["name"]
    # Fill gaps so every variant has both names and an image.
    for entry in kits.values():
        fallback = entry.get("plain") or entry.get("stat")
        plain = entry.setdefault("plain", {})
        stat = entry.setdefault("stat", {})
        for slot in (plain, stat):
            slot.setdefault("name_en", fallback.get("name_en", ""))
            slot.setdefault("name_zh", fallback.get("name_zh", ""))
            slot.setdefault("image", fallback.get("image", ""))
    return kits


def strip_stat(name: str) -> str:
    """Drop the StatTrak prefix — the plain entry is not StatTrak even when the
    API only lists a StatTrak item for that kit id."""
    return re.sub(r"^StatTrak(?:™)?\s*", "", name)


def plain_name_zh(kit_id: int, kits: dict) -> str:
    entry = kits[kit_id]
    if entry["plain"]["name_zh"]:
        return strip_stat(entry["plain"]["name_zh"])
    return strip_stat(entry["stat"]["name_zh"])


def sync_music_kits(kits: dict) -> int:
    lines = []
    for kit_id in sorted(kits):
        entry = kits[kit_id]
        source = entry.get("plain") or entry["stat"]
        lines.append(
            "  { id: %d, name: '%s', image: '%s' },"
            % (kit_id, ts_single(plain_name_zh(kit_id, kits)), ts_single(source["image"]))
        )

    text = SKINS_TS.read_text(encoding="utf-8")
    header = "export const musicKits: MusicKit[] = ["
    text = replace_block(text, header, "\n];", "\n" + "\n".join(lines))
    SKINS_TS.write_text(text, encoding="utf-8")
    return len(kits)


def sync_music_kit_names(kits: dict) -> int:
    lines = []
    for kit_id in sorted(kits):
        entry = kits[kit_id]
        for suffix, variant in (("", "plain"), ("_st", "stat")):
            if not entry.get(f"has_{variant}"):
                continue
            slot = entry[variant]
            en_name = slot["name_en"] if suffix else strip_stat(slot["name_en"])
            zh_name = slot["name_zh"] if suffix else strip_stat(slot["name_zh"])
            lines.append(
                "  'music_kit-%d%s': { en: \"%s\", zh: \"%s\" },"
                % (kit_id, suffix, js_string(en_name), js_string(zh_name))
            )

    text = LOCAL_NAMES_TS.read_text(encoding="utf-8")
    header = "export const musicKitNameMap: Record<string, { en: string; zh: string }> = {"
    text = replace_block(text, header, "\n};", "\n" + "\n".join(lines))
    LOCAL_NAMES_TS.write_text(text, encoding="utf-8")
    return len(lines)


# ── plugin random pool ──────────────────────────────────────────────────

def sync_kit_ids(kits: dict) -> int:
    # The pool deliberately excludes 1 (the default Valve kit) so that
    # "random" never resolves to the stock music.
    ids = [kit_id for kit_id in sorted(kits) if kit_id != 1]

    rows = []
    for start in range(0, len(ids), 10):
        chunk = ids[start:start + 10]
        rows.append("        " + ", ".join("%3d" % i for i in chunk) + ",")
    body = "\n".join(rows)

    text = STATIC_DATA_CS.read_text(encoding="utf-8")
    start_marker = "public static readonly int[] KitIds =\n    {"
    text = replace_block(text, start_marker, "\n    };", "\n" + body)
    STATIC_DATA_CS.write_text(text, encoding="utf-8")
    return len(ids)


def main() -> int:
    stickers = sync_stickers()
    kits = load_music_kits()
    kit_count = sync_music_kits(kits)
    name_count = sync_music_kit_names(kits)
    pool = sync_kit_ids(kits)
    print(f"stickers: {stickers}")
    print(f"music kits: {kit_count} ({name_count} localized names)")
    print(f"random pool ids: {pool}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
