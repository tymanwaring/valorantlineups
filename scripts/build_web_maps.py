import io
import os
import requests
from PIL import Image

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120 Safari/537.36"
}
API = "https://valorant.fandom.com/api.php"
# Resolve paths from the repo root (the parent of this scripts/ folder) so the
# script works no matter what directory it is run from.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "web", "public", "maps")
OVERLAY_OPACITY = int(0.52 * 255)

STANDARD_MAPS = [
    "Abyss", "Ascent", "Bind", "Breeze", "Corrode", "Fracture",
    "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset",
]


def get_original_url(file_title):
    params = {
        "action": "query",
        "titles": f"File:{file_title}",
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    r = requests.get(API, params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    for _, page in r.json()["query"]["pages"].items():
        info = page.get("imageinfo")
        if info:
            return info[0]["url"]
    return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in STANDARD_MAPS:
        url = get_original_url(f"Loading_Screen_{name}.png")
        if not url:
            print(f"[SKIP] {name}")
            continue
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        overlay = Image.new("RGBA", img.size, (0, 0, 0, OVERLAY_OPACITY))
        img = Image.alpha_composite(img, overlay).convert("RGB")
        out = os.path.join(OUT_DIR, f"{name}.png")
        img.save(out, "PNG")
        print(f"[OK] {name} -> {out}")


if __name__ == "__main__":
    main()
