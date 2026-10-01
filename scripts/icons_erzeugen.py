"""Erzeugt Favicon und PWA-Icons aus dem Praxislogo (apps/web/public/logo.png, transparent, quadratisch).

Aufruf: python3 scripts/icons_erzeugen.py   (benötigt Pillow: pip install pillow)
"""
from pathlib import Path

from PIL import Image

ORDNER = Path(__file__).resolve().parents[1] / "apps/web/public"
HINTERGRUND = (251, 250, 245, 255)  # Creme wie der App-Hintergrund

logo = Image.open(ORDNER / "logo.png").convert("RGBA")
logo.resize((64, 64), Image.LANCZOS).save(ORDNER / "favicon.png", optimize=True)


def icon(groesse: int, rand: float, name: str) -> None:
    flaeche = Image.new("RGBA", (groesse, groesse), HINTERGRUND)
    innen = int(groesse * (1 - 2 * rand))
    flaeche.alpha_composite(logo.resize((innen, innen), Image.LANCZOS), ((groesse - innen) // 2,) * 2)
    flaeche.convert("RGB").save(ORDNER / name, optimize=True)


icon(192, 0.06, "icon-192.png")
icon(512, 0.06, "icon-512.png")
icon(512, 0.14, "icon-maskable-512.png")  # Sicherheitsrand für runde/abgeschnittene Icons
icon(180, 0.08, "apple-touch-icon.png")
print("Icons erzeugt.")
