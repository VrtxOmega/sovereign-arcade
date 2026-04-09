"""
Create multi-resolution .ico and deploy a desktop shortcut for Sovereign Arcade.
"""
import sys
import os
import struct
import zlib
import shutil

# ── Determine paths ───────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ICON_PNG     = os.path.join(SCRIPT_DIR, "assets", "icon.png")
ICON_ICO     = os.path.join(SCRIPT_DIR, "assets", "icon.ico")
BAT_FILE     = os.path.join(SCRIPT_DIR, "SovereignArcade.bat")
DESKTOP_PATH = os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop")

# ── Build ICO ─────────────────────────────────────────────────────
def png_to_ico(src_png, dest_ico, sizes=(256, 128, 64, 48, 32, 16)):
    try:
        from PIL import Image
        img = Image.open(src_png).convert("RGBA")
        icons = []
        for s in sizes:
            i = img.resize((s, s), Image.LANCZOS)
            icons.append(i)
        icons[0].save(dest_ico, format="ICO",
                      sizes=[(s, s) for s in sizes],
                      append_images=icons[1:])
        print(f"ICO created: {dest_ico}")
        return True
    except ImportError:
        # Pillow not installed — minimal single-size ICO copy trick
        shutil.copy(src_png, dest_ico)
        print(f"Pillow not found — using PNG as ICO placeholder: {dest_ico}")
        return True
    except Exception as e:
        print(f"ICO error: {e}")
        return False

# ── Create shortcut ───────────────────────────────────────────────
def create_shortcut():
    try:
        import winshell
        from win32com.client import Dispatch
    except ImportError:
        # Fallback using powershell
        lnk_path = os.path.join(DESKTOP_PATH, "Sovereign Arcade.lnk")
        cmd = (
            f'$WS = New-Object -ComObject WScript.Shell; '
            f'$S = $WS.CreateShortcut("{lnk_path}"); '
            f'$S.TargetPath = "{os.path.join(SCRIPT_DIR, "SovereignArcade.vbs")}"; '
            f'$S.WorkingDirectory = "{SCRIPT_DIR}"; '
            f'$S.IconLocation = "{ICON_ICO}"; '
            f'$S.Description = "SOVEREIGN ARCADE — VERITAS OMEGA"; '
            f'$S.Save()'
        )
        os.system(f'powershell -Command "{cmd}"')
        print(f"Shortcut created: {lnk_path}")
        return

    lnk_path = os.path.join(DESKTOP_PATH, "Sovereign Arcade.lnk")
    shell = Dispatch('WScript.Shell')
    sc    = shell.CreateShortCut(lnk_path)
    sc.Targetpath       = os.path.join(SCRIPT_DIR, "SovereignArcade.vbs")
    sc.WorkingDirectory = SCRIPT_DIR
    sc.IconLocation     = ICON_ICO
    sc.Description      = "SOVEREIGN ARCADE -- VERITAS OMEGA"
    sc.save()
    print(f"Shortcut created: {lnk_path}")

if __name__ == "__main__":
    print("SOVEREIGN ARCADE — Setup")
    print("-" * 40)
    png_to_ico(ICON_PNG, ICON_ICO)
    create_shortcut()
    print("Done")
