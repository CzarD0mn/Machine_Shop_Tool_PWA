#!/usr/bin/env python3
"""Patch the generated Capacitor AndroidManifest for Machinist Helper."""
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "android")
manifest_path = ROOT / "app/src/main/AndroidManifest.xml"
xml_dir = ROOT / "app/src/main/res/xml"
xml_dir.mkdir(parents=True, exist_ok=True)

src_nsc = Path("native/network_security_config.xml")
if src_nsc.exists():
    (xml_dir / "network_security_config.xml").write_text(src_nsc.read_text())

text = manifest_path.read_text()

perms = [
    '    <uses-permission android:name="android.permission.INTERNET" />',
    '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
]
for line in perms:
    if line.strip() not in text:
        text = text.replace("</manifest>", f"{line}\n</manifest>", 1)

if "android:usesCleartextTraffic" not in text:
    text = text.replace(
        "<application",
        '<application android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/network_security_config"',
        1,
    )
elif "networkSecurityConfig" not in text:
    text = text.replace(
        'android:usesCleartextTraffic="true"',
        'android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/network_security_config"',
        1,
    )

if 'android:allowBackup="true"' in text:
    text = text.replace('android:allowBackup="true"', 'android:allowBackup="false"', 1)
elif "allowBackup" not in text:
    text = text.replace(
        "<application",
        '<application android:allowBackup="false"',
        1,
    )

manifest_path.write_text(text)
print("patched", manifest_path)
