import io
import os
import requests
from PIL import Image, ImageDraw, ImageFont

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120 Safari/537.36"
}
API = "https://valorant.fandom.com/api.php"
# Resolve paths from the repo root (the parent of this scripts/ folder) so the
# script works no matter what directory it is run from.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "lineups")
FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Valorant_Font.ttf")

# Dark filter opacity (0 = none, 255 = black).
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


def fit_font(text, max_width):
    """Pick the largest font size whose rendered text fits within max_width."""
    size = 10
    font = ImageFont.truetype(FONT_PATH, size)
    dummy = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    while True:
        nxt = ImageFont.truetype(FONT_PATH, size + 10)
        w = dummy.textbbox((0, 0), text, font=nxt)[2]
        if w > max_width:
            break
        size += 10
        font = nxt
    return font


def build(name):
    file_title = f"Loading_Screen_{name}.png"
    url = get_original_url(file_title)
    if not url:
        print(f"[SKIP] no image for {name}")
        return

    resp = requests.get(url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("RGBA")

    # Dark filter for readability.
    overlay = Image.new("RGBA", img.size, (0, 0, 0, OVERLAY_OPACITY))
    img = Image.alpha_composite(img, overlay)

    # Map name in the Valorant font, centered.
    text = name.upper()
    font = fit_font(text, int(img.width * 0.8))
    draw = ImageDraw.Draw(img)
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    tw, th = r - l, b - t
    x = (img.width - tw) / 2 - l
    y = (img.height - th) / 2 - t

    # Soft shadow for contrast, then white text.
    draw.text((x + 5, y + 5), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    out = os.path.join(OUT_DIR, f"{name}.png")
    img.convert("RGB").save(out, "PNG")
    print(f"[OK] {name} -> {out}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in STANDARD_MAPS:
        build(name)


if __name__ == "__main__":
    main()
