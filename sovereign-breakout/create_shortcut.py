"""
Create a proper multi-resolution .ico file from the PNG icon
and place a .lnk shortcut on the OneDrive Desktop with that icon.
"""
import os, sys, shutil
from PIL import Image
import win32com.client

# ── Paths ─────────────────────────────────────────────────────────
SRC_PNG  = r"C:\Users\rlope\.gemini\antigravity\brain\64732f0a-daf2-4436-b148-615311fec8f1\sovereign_breakout_icon_veritas_1775703312386.png"
ASSET_PNG = r"C:\Veritas_Lab\sovereign-breakout\assets\icon.png"
ICO_PATH  = r"C:\Veritas_Lab\sovereign-breakout\assets\icon.ico"
BAT_PATH  = r"C:\Veritas_Lab\sovereign-breakout\SovereignBreakout.bat"

DESKTOP_PATHS = [
    r"C:\Users\rlope\OneDrive\Desktop",
    r"C:\Users\rlope\Desktop",
]

# ── 1. Copy best PNG to assets ─────────────────────────────────────
shutil.copy2(SRC_PNG, ASSET_PNG)
print(f"Copied icon to {ASSET_PNG}")

# ── 2. Build multi-res ICO ─────────────────────────────────────────
img = Image.open(ASSET_PNG).convert("RGBA")
sizes = [(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
frames = [img.resize(sz, Image.LANCZOS) for sz in sizes]
frames[0].save(ICO_PATH, format='ICO', sizes=sizes, append_images=frames[1:])
print(f"Created ICO: {ICO_PATH}")

# ── 3. Find Desktop ────────────────────────────────────────────────
desktop = None
for p in DESKTOP_PATHS:
    if os.path.isdir(p):
        desktop = p
        break

if not desktop:
    print("ERROR: Desktop not found"); sys.exit(1)

# ── 4. Create .lnk shortcut ───────────────────────────────────────
shell    = win32com.client.Dispatch("WScript.Shell")
lnk_path = os.path.join(desktop, "Sovereign Breakout.lnk")
shortcut = shell.CreateShortcut(lnk_path)
shortcut.TargetPath       = BAT_PATH
shortcut.WorkingDirectory = os.path.dirname(BAT_PATH)
shortcut.IconLocation     = f"{ICO_PATH},0"
shortcut.Description      = "SOVEREIGN BREAKOUT — VERITAS OMEGA"
shortcut.Save()

print(f"Shortcut created: {lnk_path}")
print("Done ✓")
