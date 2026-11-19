# Builds the WhatsApp-ready share page of one booked trip: trips/<slug>/ (Oren 19.11.2026).
# WhatsApp and iMessage do not run JavaScript, so the preview (og:image, title, icon) must be static, per trip.
#   og.jpg       = the trip's top banner (the hero graphic), 1200 wide
#   icon-512.png / icon-180.png = the country flag + a small one-colour glyph of the trip type (couple / family / friends)
#   index.html   = the same public page as trips/index.html, with these tags; the token stays in the link (?t=), never here.
# Usage:
#   python trips/tools/share_page.py --slug rome --banner <hero.webp> --title "..." --desc "..." \
#       --flag "v:#009246,#FFFFFF,#CE2B37" --type couple --c1 "#8E1B2C" --c2 "#1E5B43"
# Then set share.path = "<slug>/" in the trip's sq_docs doc (trip.html builds the link from it).
# The banner goes into a public repo: drawn graphics only, never real photos of the kids.
import argparse, html, os, re
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # trips/
SITE = "https://tipul10000-droid.github.io/apps/trips/"


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rr_mask(size, r):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], r, fill=255)
    return m


def flag_img(spec, size):
    """spec "v:#a,#b,#c" = vertical stripes, "h:..." = horizontal stripes."""
    kind, cols = spec.split(":", 1)
    cols = [hexrgb(c) for c in cols.split(",")]
    w, h = size
    im = Image.new("RGB", size)
    d = ImageDraw.Draw(im)
    n = len(cols)
    for i, c in enumerate(cols):
        if kind == "v":
            d.rectangle([round(i * w / n), 0, round((i + 1) * w / n), h], fill=c)
        else:
            d.rectangle([0, round(i * h / n), w, round((i + 1) * h / n)], fill=c)
    return im


def person(d, cx, top, s, col):
    """A simple person glyph: head + rounded shoulders. s = scale (head radius)."""
    d.ellipse([cx - s, top, cx + s, top + 2 * s], fill=col)
    bw = s * 1.65
    d.rounded_rectangle([cx - bw, top + 2.35 * s, cx + bw, top + 5.2 * s], radius=s * 1.4, fill=col)


def heart(d, cx, cy, s, col):
    d.ellipse([cx - s, cy - s * .55, cx, cy + s * .45], fill=col)
    d.ellipse([cx, cy - s * .55, cx + s, cy + s * .45], fill=col)
    d.polygon([(cx - s * .97, cy + .05 * s), (cx + s * .97, cy + .05 * s), (cx, cy + s * 1.15)], fill=col)


def glyph(kind, size, col=(255, 255, 255)):
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S / 100
    if kind == "family":
        person(d, 30 * u, 18 * u, 11 * u, col)
        person(d, 70 * u, 18 * u, 11 * u, col)
        person(d, 50 * u, 46 * u, 8 * u, col)
    elif kind == "friends":
        person(d, 22 * u, 30 * u, 9.5 * u, col)
        person(d, 78 * u, 30 * u, 9.5 * u, col)
        person(d, 50 * u, 22 * u, 11 * u, col)
    else:  # couple
        person(d, 29 * u, 30 * u, 11 * u, col)
        person(d, 71 * u, 30 * u, 11 * u, col)
        heart(d, 50 * u, 22 * u, 9 * u, col)
    return im.resize((size, size), Image.LANCZOS)


def make_icon(a, size):
    S = size
    # one-colour background: the trip colour, a bit darker towards the bottom corner (mixing c1 and c2 turned brown)
    c1 = hexrgb(a.c1); c2 = tuple(round(v * .55) for v in c1)
    bg = Image.new("RGB", (S, S))
    px = bg.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S - 2)
            px[x, y] = tuple(round(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
    # the flag, large, rounded, upper part
    fw, fh = round(S * .70), round(S * .47)
    fl = flag_img(a.flag, (fw, fh))
    fx, fy = (S - fw) // 2, round(S * .12)
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([fx, fy + S * .015, fx + fw, fy + fh + S * .015], round(S * .07), fill=(0, 0, 0, 70))
    bg = Image.alpha_composite(bg.convert("RGBA"), sh)
    bg.paste(fl, (fx, fy), rr_mask((fw, fh), round(S * .07)))
    # the trip type: a white one-colour glyph under the flag
    g = glyph(a.type, round(S * .40))
    bg.alpha_composite(g, ((S - g.width) // 2, round(S * .56)))
    return bg.convert("RGB")


def make_og(a, out):
    im = Image.open(a.banner).convert("RGB")
    w = 1200
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    return im.size


def main():
    ap = argparse.ArgumentParser()
    for k in ("slug", "banner", "title", "desc", "flag"):
        ap.add_argument("--" + k, required=True)
    ap.add_argument("--type", default="couple", choices=["couple", "family", "friends"])
    ap.add_argument("--c1", default="#8E1B2C")
    ap.add_argument("--c2", default="#1E5B43")
    a = ap.parse_args()
    assert re.fullmatch(r"[a-z0-9-]+", a.slug)
    out = os.path.join(ROOT, a.slug)
    os.makedirs(out, exist_ok=True)
    ow, oh = make_og(a, os.path.join(out, "og.jpg"))
    ic = make_icon(a, 512)
    ic.save(os.path.join(out, "icon-512.png"), optimize=True)
    ic.resize((180, 180), Image.LANCZOS).save(os.path.join(out, "icon-180.png"), optimize=True)
    ic.resize((48, 48), Image.LANCZOS).save(os.path.join(out, "favicon.png"), optimize=True)

    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    base = SITE + a.slug + "/"
    T, D = html.escape(a.title, quote=True), html.escape(a.desc, quote=True)
    tags = ("<meta property=\"og:type\" content=\"website\">\n"
            "<meta property=\"og:site_name\" content=\"הטיול שלנו\">\n"
            f"<meta property=\"og:title\" content=\"{T}\">\n"
            f"<meta property=\"og:description\" content=\"{D}\">\n"
            f"<meta property=\"og:image\" content=\"{base}og.jpg\">\n"
            f"<meta property=\"og:image:secure_url\" content=\"{base}og.jpg\">\n"
            "<meta property=\"og:image:type\" content=\"image/jpeg\">\n"
            f"<meta property=\"og:image:width\" content=\"{ow}\">\n<meta property=\"og:image:height\" content=\"{oh}\">\n"
            f"<meta property=\"og:image:alt\" content=\"{T}\">\n"
            "<meta name=\"twitter:card\" content=\"summary_large_image\">\n"
            f"<meta name=\"description\" content=\"{D}\">\n")
    s = src.replace('<html lang="he" dir="rtl">', '<html lang="he" dir="rtl" data-img="../img/">', 1)
    s = re.sub(r'<meta name="apple-mobile-web-app-title" content="[^"]*">', f'<meta name="apple-mobile-web-app-title" content="{T}">', s)
    s = re.sub(r'<link rel="apple-touch-icon" href="[^"]*">\n<link rel="icon" href="[^"]*">',
               '<link rel="apple-touch-icon" href="icon-180.png">\n<link rel="icon" type="image/png" sizes="512x512" href="icon-512.png">\n<link rel="icon" type="image/png" sizes="48x48" href="favicon.png">', s)
    s = re.sub(r"<title>[^<]*</title>", f"<title>{T}</title>\n" + tags.rstrip("\n"), s)
    s = re.sub(r'(href|src)="(?!https?:|icon-|favicon)([^"]+)"', r'\1="../\2"', s)
    s = s.replace("<!-- דף שיתוף ציבורי לטיול אחד", f"<!-- נוצר ע\"י trips/tools/share_page.py ({a.slug}): תגיות תצוגה מקדימה לוואטסאפ. לא לערוך ידנית.\n     דף שיתוף ציבורי לטיול אחד", 1)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8", newline="\n").write(s)
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(os.path.join(out, f)))


if __name__ == "__main__":
    main()
