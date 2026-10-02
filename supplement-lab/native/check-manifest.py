#!/usr/bin/env python3
"""Kolbi · Berechtigungs-Transparenz für den Android-Build.

Liest das von Gradle GEMERGTE Manifest (App + alle Bibliotheken), listet alle <uses-permission>,
selbst deklarierten <permission> und <queries> auf, schreibt das als Tabelle in die Job-Zusammenfassung
($GITHUB_STEP_SUMMARY) und bricht mit Exit 1 ab, wenn etwas drin ist, das Store-Version 1.0 nicht
haben darf:

  · android.permission.health.* / Health-Connect-<queries>  → 1.0 startet ohne Health
    (erlaubt nur mit NEXT_PUBLIC_LAB_HEALTH=1)
  · USE_EXACT_ALARM      → Play erlaubt das nur Wecker-/Kalender-Apps (Deklaration nötig)
  · SCHEDULE_EXACT_ALARM → bewusst per tools:node="remove" entfernt (Erinnerungen laufen ungenau)
  · AD_ID                → bewusst entfernt (keine Werbe-/Geräte-IDs; sonst Play-Deklaration „Werbe-ID“)

Aufruf:  python3 native/check-manifest.py [Pfad/zum/AndroidManifest.xml]
Ohne Pfad wird im Build-Ordner android/app/build/intermediates gesucht (Release-Variante).
"""
from __future__ import annotations

import glob
import os
import sys
import xml.etree.ElementTree as ET

A = "{http://schemas.android.com/apk/res/android}"
HERE = os.path.dirname(os.path.abspath(__file__))
INTERMEDIATES = os.path.join(HERE, "..", "android", "app", "build", "intermediates")

# Reihenfolge = Vorrang. AGP 8.x: merged_manifest/<variant>/process<Variant>MainManifest ist das
# Ergebnis des Manifest-Mergers; die übrigen sind daraus abgeleitet (gleiche Berechtigungen).
CANDIDATES = [
    "merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml",
    "merged_manifests/release/processReleaseManifest/AndroidManifest.xml",
    "bundle_manifest/release/processApplicationManifestReleaseForBundle/AndroidManifest.xml",
    "merged_manifest/release/AndroidManifest.xml",
    "merged_manifests/release/AndroidManifest.xml",
]


def find_manifest() -> str | None:
    for rel in CANDIDATES:
        p = os.path.join(INTERMEDIATES, rel)
        if os.path.isfile(p):
            return p
    # Fallback für andere AGP-Versionen: irgendein Release-Manifest unter merged_manifest*/bundle_manifest
    hits = sorted(
        h for pat in ("merged_manifest*/release*/**/AndroidManifest.xml", "bundle_manifest/release*/**/AndroidManifest.xml")
        for h in glob.glob(os.path.join(INTERMEDIATES, pat), recursive=True)
    )
    return hits[0] if hits else None


def describe_query(el: ET.Element) -> str:
    tag = el.tag
    if tag == "package":
        return f"package `{el.get(A + 'name')}`"
    if tag == "provider":
        return f"provider `{el.get(A + 'authorities')}`"
    if tag == "intent":
        parts = []
        for c in el:
            if c.tag == "action":
                parts.append(f"action `{c.get(A + 'name')}`")
            elif c.tag == "category":
                parts.append(f"category `{c.get(A + 'name')}`")
            elif c.tag == "data":
                d = ", ".join(f"{k.replace(A, '')}={v}" for k, v in c.attrib.items())
                parts.append(f"data `{d}`")
        return "intent " + " · ".join(parts)
    return f"`{tag}`"


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else find_manifest()
    if not path or not os.path.isfile(path):
        print(f"::error::Gemergtes Release-Manifest nicht gefunden (gesucht unter {os.path.normpath(INTERMEDIATES)}). "
              "Lief bundleRelease? Pfad ggf. als Argument übergeben.")
        return 1
    health_ok = os.environ.get("NEXT_PUBLIC_LAB_HEALTH") == "1"

    root = ET.parse(path).getroot()
    pkg = root.get("package") or "?"
    perms: list[tuple[str, str]] = []
    for el in root:
        if el.tag in ("uses-permission", "uses-permission-sdk-23"):
            name = el.get(A + "name") or "?"
            extra = []
            if el.get(A + "maxSdkVersion"):
                extra.append(f"bis API {el.get(A + 'maxSdkVersion')}")
            if el.tag == "uses-permission-sdk-23":
                extra.append("ab API 23")
            perms.append((name, ", ".join(extra)))
    declared = [el.get(A + "name") or "?" for el in root if el.tag == "permission"]
    queries = [describe_query(q) for qs in root if qs.tag == "queries" for q in qs]

    problems: list[str] = []
    for name, _ in perms:
        if name.startswith("android.permission.health.") and not health_ok:
            problems.append(f"`{name}` – Store-Version 1.0 startet OHNE Health Connect. Health-Plugin aus "
                            "dem nativen Build lassen (capacitor.config.ts → includePlugins) oder bewusst "
                            "mit NEXT_PUBLIC_LAB_HEALTH=1 bauen (dann Play-Deklaration „Gesundheits-Apps“ nötig).")
        elif name == "android.permission.USE_EXACT_ALARM":
            problems.append("`USE_EXACT_ALARM` – Google Play erlaubt das nur Wecker-/Kalender-Apps und verlangt "
                            "eine Deklaration. Kolbi braucht keine exakten Alarme: Quelle finden und per "
                            "`tools:node=\"remove\"` im App-Manifest entfernen.")
        elif name == "android.permission.SCHEDULE_EXACT_ALARM":
            problems.append("`SCHEDULE_EXACT_ALARM` – ist im App-Manifest bewusst per `tools:node=\"remove\"` entfernt "
                            "(Erinnerungen laufen ungenau, isExactNotification: false). Merge-Regel wiederherstellen.")
        elif name == "com.google.android.gms.permission.AD_ID":
            problems.append("`AD_ID` – Kolbi nutzt keine Werbe-ID (keine Geräte-IDs). Merge-Regel "
                            "`tools:node=\"remove\"` im App-Manifest wiederherstellen; sonst verlangt Play die "
                            "Deklaration „Werbe-ID“.")
    if not health_ok:
        for q in queries:
            if "com.google.android.apps.healthdata" in q or "androidx.health" in q:
                problems.append(f"Health-Connect-Abfrage im Manifest ({q}) – Health-Plugin ist im nativen Build "
                                "eingebunden, obwohl 1.0 ohne Health startet.")
    raw = open(path, encoding="utf-8").read()
    if not health_ok and "android.permission.health." in raw and not any("android.permission.health." in p for p in problems):
        problems.append("`android.permission.health.*` kommt im Manifest vor (z. B. als Activity-Berechtigung) – "
                        "Store-Version 1.0 startet ohne Health Connect.")

    lines = [f"## Android-Berechtigungen ({pkg})", "",
             f"Quelle: `{os.path.relpath(path)}`", "",
             "| Berechtigung | Hinweis |", "|---|---|"]
    lines += [f"| `{n}` | {x} |" for n, x in sorted(perms)] or ["| – | keine |"]
    lines += ["", "**Selbst deklarierte Berechtigungen (`<permission>`):** " +
              (", ".join(f"`{d}`" for d in sorted(declared)) or "keine"), "",
              "**Paket-Sichtbarkeit (`<queries>`):**", ""]
    lines += [f"- {q}" for q in queries] or ["- keine"]
    lines += [""]
    if problems:
        lines += ["### ❌ Nicht erlaubt für Store-Version 1.0", ""] + [f"- {p}" for p in problems]
    else:
        lines += ["✅ Keine Health-Berechtigungen, keine exakten Alarme, keine Werbe-ID."]
    report = "\n".join(lines) + "\n"

    print(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(report)
    for p in problems:
        print(f"::error title=Manifest-Prüfung::{p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
