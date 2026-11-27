"""Chen-notation ERD with a radial ("web") attribute layout -> SVG.

Usage: python chen_web.py <out.svg>   (needs Pillow; measures text with C:/Windows/Fonts/arial*.ttf)
Module 01 (Identity & Access) is defined at the bottom; the layout engine is generic.
"""
import math
import sys
from PIL import ImageFont

FONT_DIR = "C:/Windows/Fonts/"
_fonts = {}


def text_w(text, size, bold=False):
    key = (size, bold)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_DIR + ("arialbd.ttf" if bold else "arial.ttf"), size)
    return _fonts[key].getlength(text)


# ---------------------------------------------------------------- sizes
ATTR_FS, TYPE_FS, ENT_FS, REL_FS = 20, 14, 25, 17
SHOW_TYPES = False        # data types stay in the definitions below but are not drawn


class Attr:
    def __init__(self, name, typ="", key=False, children=None, angle=None, push=0.0):
        self.name, self.typ, self.key = name, (typ if SHOW_TYPES else ""), key
        self.angle, self.push = angle, push
        self.children = children or []          # composite attribute
        w = max(text_w(name, ATTR_FS, key), text_w(self.typ, TYPE_FS) if self.typ else 0)
        self.rx = w / 2 + 14
        self.ry = 21 if self.typ else round(ATTR_FS * 0.9)
        self.x = self.y = 0.0


class Entity:
    def __init__(self, name, attrs, direction=None, start=None, ring_pad=0.0, note=None,
                 stagger=0.0, block_half=17.0, extra_gap=0.0, min_w=0, min_h=0):
        self.name, self.attrs = name, attrs
        self.x = self.y = 0.0
        self.direction = direction            # angle from the hub entity (None = hub)
        self.start = direction if start is None else start
        self.ring_pad, self.note, self.stagger = ring_pad, note, stagger
        self.block_half, self.extra_gap = block_half, extra_gap
        self.w = max(text_w(name, ENT_FS, True) + 40, min_w)
        self.h = max(round(ENT_FS * 2.1), min_h)
        self.blocked = []                       # angles (deg) used by relationship lines


class Rel:
    def __init__(self, name, a, card_a, total_a, b, card_b, total_b):
        self.name = name
        self.a, self.card_a, self.total_a = a, card_a, total_a
        self.b, self.card_b, self.total_b = b, card_b, total_b
        # the text sits where the diamond is narrower than its full width: leave room for the slope
        self.h = round(REL_FS * 4.4)
        self.w = (text_w(name, REL_FS, True) + 16) / (1 - (REL_FS * 0.7) / (self.h / 2))
        self.x = self.y = 0.0


def footprint(attr, theta):
    """Extent of an axis-aligned ellipse along the tangent of a circle at theta."""
    ux, uy = -math.sin(theta), math.cos(theta)
    return 2 * math.hypot(attr.rx * ux, attr.ry * uy)


def radial_extent(attr, theta):
    ux, uy = math.cos(theta), math.sin(theta)
    return math.hypot(attr.rx * ux, attr.ry * uy)


def ang_dist(a, b):
    d = (a - b) % 360
    return min(d, 360 - d)


LINE_CLEAR = 12.0   # px between a relationship line and the nearest oval edge


def _arcs(ent):
    """Free arcs (lo, hi) in degrees, clockwise, between relationship lines / note blocks."""
    cuts = sorted(b % 360 for b in ent.blocked)
    if not cuts:
        return [(ent.start, ent.start + 360, False, False)]
    arcs = []
    for i, lo in enumerate(cuts):
        hi = cuts[(i + 1) % len(cuts)]
        if hi <= lo:
            hi += 360
        arcs.append((lo, hi, True, True))       # both ends are lines needing clearance
    # note under the entity: carve its span out of whichever arcs it falls in
    if ent.note:
        out = []
        for lo, hi, cl, ch in arcs:
            for k in (0, 360):
                nlo, nhi = 55 + k, 125 + k
                if nlo < hi and nhi > lo:
                    if nlo > lo:
                        out.append((lo, nlo, cl, False))
                    if nhi < hi:
                        out.append((nhi, hi, False, ch))
                    break
            else:
                out.append((lo, hi, cl, ch))
        arcs = out
    # begin with the arc that contains ent.start (else the first one after it)
    s = ent.start % 360
    idx = next((i for i, (lo, hi, _, _) in enumerate(arcs) if (s - lo) % 360 < hi - lo),
               min(range(len(arcs)), key=lambda i: (arcs[i][0] - s) % 360))
    arcs = arcs[idx:] + arcs[:idx]
    return arcs


def _kf(ent, th):
    # staggering only helps where neighbours sit side by side (top/bottom of the ring)
    return ent.stagger and abs(math.sin(math.radians(th))) > 0.55


def _spacing(ent, a1, t1, a2, t2, gap):
    f1, f2 = footprint(a1, math.radians(t1)), footprint(a2, math.radians(t2))
    k = 0.62 if (_kf(ent, t1) and _kf(ent, t2)) else 1.0
    return (f1 + f2) / 2 * k + gap


def _need(ent, items, mid, gap, clear_lo, clear_hi):
    if not items:
        return 0.0
    need = footprint(items[0], math.radians(mid)) / 2 + footprint(items[-1], math.radians(mid)) / 2
    need += sum(_spacing(ent, items[i], mid, items[i + 1], mid, gap) for i in range(len(items) - 1))
    return need + (LINE_CLEAR if clear_lo else 0) + (LINE_CLEAR if clear_hi else 0)


def _partition(ent, items, arcs, gap):
    """Split the ordered items into consecutive runs, one per arc, minimising the ring radius."""
    n, K = len(items), len(arcs)
    INF = float("inf")
    dp = [[INF] * (n + 1) for _ in range(K + 1)]
    cut = [[0] * (n + 1) for _ in range(K + 1)]
    dp[0][0] = 0.0
    for k in range(1, K + 1):
        lo, hi, cl, ch = arcs[k - 1]
        span = math.radians(hi - lo)
        mid = (lo + hi) / 2
        for i in range(n + 1):
            for j in range(i + 1):
                if dp[k - 1][j] == INF:
                    continue
                r_need = _need(ent, items[j:i], mid, gap, cl, ch) / span
                v = max(dp[k - 1][j], r_need)
                if v < dp[k][i]:
                    dp[k][i], cut[k][i] = v, j
    runs, i = [], n
    for k in range(K, 0, -1):
        j = cut[k][i]
        runs.append(items[j:i])
        i = j
    return dp[K][n], runs[::-1]


def _place(ent, arcs, runs, r, gap):
    placed = []
    for (lo, hi, cl, ch), run in zip(arcs, runs):
        if not run:
            continue
        length = r * math.radians(hi - lo)
        th = [(lo + hi) / 2] * len(run)
        for _ in range(3):                      # footprints depend on the angle: refine
            fp = [footprint(a, math.radians(t)) for a, t in zip(run, th)]
            sp = [_spacing(ent, run[i], th[i], run[i + 1], th[i + 1], gap) for i in range(len(run) - 1)]
            used = fp[0] / 2 + sum(sp) + fp[-1] / 2 + (LINE_CLEAR if cl else 0) + (LINE_CLEAR if ch else 0)
            extra = max(length - used, 0) / (len(run) + 1)
            pos = (LINE_CLEAR if cl else 0) + extra + fp[0] / 2
            new = [lo + math.degrees(pos / r)]
            for s in sp:
                pos += s + extra
                new.append(lo + math.degrees(pos / r))
            th = new
        flip = False
        for a, t in zip(run, th):
            if _kf(ent, t):
                flip = not flip
                placed.append((a, t, flip))
            else:
                flip = False
                placed.append((a, t, False))
    return placed


def _clean(ent, placed, r):
    shapes = []
    for a, t, out in placed:
        shapes.append(("x", a.x, a.y, a.rx + 5, a.ry + 5))
    for i in range(len(shapes)):
        for j in range(i + 1, len(shapes)):
            if ell_overlap(shapes[i], shapes[j]):
                return False
    far = r + 400
    for b in ent.blocked:
        q = (ent.x + far * math.cos(math.radians(b)), ent.y + far * math.sin(math.radians(b)))
        for s in shapes:
            if seg_hits_shape((ent.x, ent.y), q, s):
                return False
    for (a, _, _), s0 in zip(placed, shapes):
        for s in shapes:
            if s is not s0 and seg_hits_shape((ent.x, ent.y), (a.x, a.y), s):
                return False
    return True


def layout_ring(ent, gap=7.0):
    items = list(ent.attrs)
    arcs = _arcs(ent)
    if len(arcs) == 1 and items and items[0].key:
        # a single arc starts at the relationship line: put the key opposite it
        key, rest = items[0], items[1:]
        h = len(rest) // 2
        items = rest[:h] + [key] + rest[h:]
    r_part, runs = _partition(ent, items, arcs, gap)
    rmin = max(math.hypot(ent.w / 2, ent.h / 2) + max(a.rx, a.ry) * 0.6 + 40 for a in items)
    r = max(r_part, rmin) + ent.ring_pad
    for _ in range(60):
        placed = _place(ent, arcs, runs, r, gap)
        for a, t, out in placed:
            rad = math.radians(t)
            rr = r + radial_extent(a, rad) * 0.35 + (ent.stagger if out else 0)
            a.x = ent.x + rr * math.cos(rad)
            a.y = ent.y + rr * math.sin(rad)
            a.theta = t
        if _clean(ent, placed, r):
            break
        r *= 1.03
    ent.radius = r
    for a in items:
        if a.children:
            layout_fan(a, math.radians(a.theta))


def layout_fan(parent, rad, dist=None):
    m = len(parent.children)
    ux, uy = math.cos(rad), math.sin(rad)
    tx, ty = -uy, ux
    kids = parent.children
    # stack children along the tangent, centred on a point further out
    sizes = [footprint(c, rad) + 10 for c in kids]
    span = sum(sizes)
    out = dist or (radial_extent(parent, rad) + max(radial_extent(c, rad) for c in kids) + 55)
    cx, cy = parent.x + ux * out, parent.y + uy * out
    cum = -span / 2
    for c, s in zip(kids, sizes):
        off = cum + s / 2
        # bow the stack outward at its ends so it reads as a fan
        bow = 0.18 * abs(off)
        c.x = cx + tx * off + ux * (-bow * 0.4)
        c.y = cy + ty * off + uy * (-bow * 0.4)
        cum += s


def border_point(ent, tx, ty):
    """Where the segment from the entity centre towards (tx,ty) leaves its rectangle."""
    dx, dy = tx - ent.x, ty - ent.y
    sx = (ent.w / 2) / abs(dx) if dx else math.inf
    sy = (ent.h / 2) / abs(dy) if dy else math.inf
    s = min(sx, sy)
    return ent.x + dx * s, ent.y + dy * s


# ---------------------------------------------------------------- collision report
def shapes_of(entities, rels):
    out = []
    for e in entities:
        out.append(("E:" + e.name, e.x, e.y, e.w / 2 + 6, e.h / 2 + 6))
        if e.note:
            out.append(("N:" + e.name, e.x, e.y + e.h / 2 + 22, text_w(e.note[0], 11) / 2, 18))
        for a in e.attrs:
            out.append(("A:%s.%s" % (e.name, a.name), a.x, a.y, a.rx + 4, a.ry + 4))
            for c in a.children:
                out.append(("A:%s.%s" % (e.name, c.name), c.x, c.y, c.rx + 4, c.ry + 4))
    for r in rels:
        out.append(("R:" + r.name, r.x, r.y, r.w / 2 + 4, r.h / 2 + 4))
    return out


def ell_overlap(a, b):
    # treat each shape as an ellipse; conservative test via scaled distance
    _, x1, y1, a1, b1 = a
    _, x2, y2, a2, b2 = b
    dx, dy = x2 - x1, y2 - y1
    d = math.hypot(dx, dy)
    if d == 0:
        return True
    ux, uy = dx / d, dy / d
    r1 = math.hypot(a1 * ux, b1 * uy) / math.hypot(ux * b1, uy * a1) * b1 if a1 and b1 else 0
    r2 = math.hypot(a2 * ux, b2 * uy) / math.hypot(ux * b2, uy * a2) * b2 if a2 and b2 else 0
    # r = a*b / sqrt((b ux)^2 + (a uy)^2) is the ellipse radius along u
    r1 = a1 * b1 / math.hypot(b1 * ux, a1 * uy)
    r2 = a2 * b2 / math.hypot(b2 * ux, a2 * uy)
    return d < r1 + r2


def seg_hits_shape(p, q, s):
    _, cx, cy, a, b = s
    # sample the segment
    for i in range(1, 60):
        t = i / 60
        x = p[0] + (q[0] - p[0]) * t
        y = p[1] + (q[1] - p[1]) * t
        if ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 < 1:
            return True
    return False


def report(entities, rels):
    shapes = shapes_of(entities, rels)
    probs = []
    for i in range(len(shapes)):
        for j in range(i + 1, len(shapes)):
            if ell_overlap(shapes[i], shapes[j]):
                probs.append("overlap %s <-> %s" % (shapes[i][0], shapes[j][0]))
    segs = []
    for e in entities:
        for a in e.attrs:
            segs.append(("E:" + e.name, "A:%s.%s" % (e.name, a.name), (e.x, e.y), (a.x, a.y)))
            for c in a.children:
                segs.append(("A:%s.%s" % (e.name, a.name), "A:%s.%s" % (e.name, c.name), (a.x, a.y), (c.x, c.y)))
    for r in rels:
        segs.append(("E:" + r.a.name, "R:" + r.name, (r.a.x, r.a.y), (r.x, r.y)))
        segs.append(("E:" + r.b.name, "R:" + r.name, (r.b.x, r.b.y), (r.x, r.y)))
    for s1, s2, p, q in segs:
        for s in shapes:
            if s[0] in (s1, s2) or s[0].startswith("N:"):
                continue
            if seg_hits_shape(p, q, s):
                probs.append("line %s-%s crosses %s" % (s1, s2, s[0]))
    return probs


# ---------------------------------------------------------------- SVG
def crow_end(bx, by, ux, uy, many, mandatory):
    """Crow's-foot marker where a relationship line meets an entity.

    The marker at entity X's end says how many X rows pair with ONE row on the other side:
    outer symbol = maximum (bar = one, crow = many), inner symbol = minimum (circle = zero,
    bar = one). `mandatory` = the other side's FK is NOT NULL, so at least one X is required.
    """
    nx, ny = -uy, ux

    def p(t, s=0.0):
        return bx + ux * t + nx * s, by + uy * t + ny * s

    out = ['<g class="crow">']

    def bar(t):
        (x1, y1), (x2, y2) = p(t, -9), p(t, 9)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (x1, y1, x2, y2))

    def circle(t):
        x, y = p(t)
        out.append('<circle cx="%.1f" cy="%.1f" r="5.5"/>' % (x, y))

    if many:
        ax, ay = p(18)
        for s in (-10, 0, 10):
            x, y = p(0, s)
            out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (ax, ay, x, y))
        if mandatory:
            bar(25)
        else:
            circle(30)
    else:
        bar(9)
        if mandatory:
            bar(17)
        else:
            circle(28)
    out.append("</g>")
    return "".join(out)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


LEGEND_H = 170
SHOW_TITLE = False        # title + subtitle above the diagram
SHOW_LEGEND = False       # legend + notes strip along the bottom

# Page: short bond paper (8.5 x 11 in), portrait. Margins in cm; left is the binding side.
PAGE_IN = (8.5, 11.0)
MARGIN_CM = {"left": 3.54, "top": 2.54, "right": 2.54, "bottom": 2.54}
PX_PER_IN = 96.0


def render(entities, rels, title, subtitle, notes):
    xs, ys = [], []
    for s in shapes_of(entities, rels):
        xs += [s[1] - s[3], s[1] + s[3]]
        ys += [s[2] - s[4], s[2] + s[4]]
    pad = 4
    minx, maxx = min(xs) - pad, max(xs) + pad
    miny = min(ys) - (130 if SHOW_TITLE else pad)
    maxy = max(ys) + (40 + LEGEND_H + 40 if SHOW_LEGEND else pad)
    legend_top = max(ys) + 40
    W, H = maxx - minx, maxy - miny
    # fit the diagram inside the page margins: left edge on the left margin, centred vertically
    cm = PX_PER_IN / 2.54
    pw, ph = PAGE_IN[0] * PX_PER_IN, PAGE_IN[1] * PX_PER_IN
    ml, mt = MARGIN_CM["left"] * cm, MARGIN_CM["top"] * cm
    aw = pw - ml - MARGIN_CM["right"] * cm
    ah = ph - mt - MARGIN_CM["bottom"] * cm
    scale = min(aw / W, ah / H)
    oy = mt + (ah - H * scale) / 2
    render.scale = scale
    o = []
    o.append('<svg xmlns="http://www.w3.org/2000/svg" width="%gin" height="%gin" viewBox="0 0 %.2f %.2f" '
             'font-family="Arial, Helvetica, sans-serif">' % (PAGE_IN[0], PAGE_IN[1], pw, ph))
    o.append('<rect x="0" y="0" width="%.2f" height="%.2f" fill="#ffffff"/>' % (pw, ph))
    o.append('<g transform="translate(%.3f,%.3f) scale(%.5f) translate(%.2f,%.2f)">' % (ml, oy, scale, -minx, -miny))
    o.append("""<style>
  .bg{fill:#ffffff}
  .ent{fill:#dcf2e1;stroke:#1e6b34;stroke-width:2}
  .entS{stroke-dasharray:7 4}
  .entT{font-size:%dpx;font-weight:bold;fill:#0e3a1c}
  .att{fill:#ffffff;stroke:#4a5a70;stroke-width:1.3}
  .attK{fill:#fff8e1;stroke:#8a6d1a;stroke-width:1.6}
  .attC{fill:#f3f6fa;stroke:#4a5a70;stroke-width:1.3}
  .attT{font-size:%dpx;fill:#1d2733}
  .attTK{font-size:%dpx;fill:#1d2733;font-weight:bold}
  .typ{font-size:%dpx;fill:#6b7787}
  .rel{fill:#fdeee3;stroke:#8a3b12;stroke-width:2}
  .relT{font-size:%dpx;font-weight:bold;fill:#5a2408}
  .aline{stroke:#9aa6b5;stroke-width:1.1}
  .rline{stroke:#1d2733;stroke-width:1.6;fill:none}
  .crow line{stroke:#1d2733;stroke-width:1.6}
  .crow circle{fill:#ffffff;stroke:#1d2733;stroke-width:1.6}
  .card{font-size:15px;font-weight:bold;fill:#8a3b12}
  .note{font-size:16px;fill:#6b7787;font-style:italic;paint-order:stroke;stroke:#ffffff;stroke-width:5px;stroke-linejoin:round}
  .title{font-size:30px;font-weight:bold;fill:#10233d}
  .sub{font-size:14px;fill:#4a5a70}
  .lg{font-size:12px;fill:#1d2733}
  .lgbox{fill:#fbfcfe;stroke:#c9d2de;stroke-width:1}
</style>""" % (ENT_FS, ATTR_FS, ATTR_FS, TYPE_FS, REL_FS))
    if SHOW_TITLE:
        o.append('<text class="title" x="%.0f" y="%.0f">%s</text>' % (minx + 40, miny + 52, esc(title)))
        o.append('<text class="sub" x="%.0f" y="%.0f">%s</text>' % (minx + 40, miny + 78, esc(subtitle)))

    # attribute connectors
    o.append('<g class="aline">')
    for e in entities:
        for a in e.attrs:
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (e.x, e.y, a.x, a.y))
            for c in a.children:
                o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (a.x, a.y, c.x, c.y))
    o.append("</g>")

    # relationship lines: one plain line; crow's-foot end at each entity
    for r in rels:
        for ent, card, other_total in ((r.a, r.card_a, r.total_b), (r.b, r.card_b, r.total_a)):
            o.append('<line class="rline" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (ent.x, ent.y, r.x, r.y))
            bx, by = border_point(ent, r.x, r.y)
            dx, dy = r.x - ent.x, r.y - ent.y
            d = math.hypot(dx, dy)
            o.append(crow_end(bx, by, dx / d, dy / d, card == "N", other_total))

    # relationship diamonds
    for r in rels:
        pts = "%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" % (
            r.x, r.y - r.h / 2, r.x + r.w / 2, r.y, r.x, r.y + r.h / 2, r.x - r.w / 2, r.y)
        o.append('<polygon class="rel" points="%s"/>' % pts)
        o.append('<text class="relT" x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central">%s</text>'
                 % (r.x, r.y, esc(r.name)))

    def oval(a, cls):
        o.append('<ellipse class="%s" cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"/>' % (cls, a.x, a.y, a.rx, a.ry))
        ny = a.y - 6 if a.typ else a.y
        tcls = "attTK" if a.key else "attT"
        o.append('<text class="%s" x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central">%s</text>'
                 % (tcls, a.x, ny, esc(a.name)))
        if a.key:
            tw = text_w(a.name, ATTR_FS, True)
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1d2733" stroke-width="1.2"/>'
                     % (a.x - tw / 2, ny + 8, a.x + tw / 2, ny + 8))
        if a.typ:
            o.append('<text class="typ" x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central">%s</text>'
                     % (a.x, a.y + 9, esc(a.typ)))

    for e in entities:
        for a in e.attrs:
            oval(a, "attK" if a.key else ("attC" if a.children else "att"))
            for c in a.children:
                oval(c, "att")
        # a stub (entity defined in another module, shown key-only) gets a dashed border
        o.append('<rect class="ent%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f"/>'
                 % (" entS" if getattr(e, "stub", False) else "", e.x - e.w / 2, e.y - e.h / 2, e.w, e.h))
        o.append('<text class="entT" x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central">%s</text>'
                 % (e.x, e.y, esc(e.name)))
        if e.note:
            for i, line in enumerate(e.note):
                o.append('<text class="note" x="%.1f" y="%.1f" text-anchor="middle">%s</text>'
                         % (e.x, e.y + e.h / 2 + 22 + i * 19, esc(line)))

    if not SHOW_LEGEND:
        o.append("</g>")
        o.append("</svg>")
        return "\n".join(o)

    # legend strip along the bottom
    lx, ly = minx + 40, legend_top
    o.append('<g transform="translate(%.0f,%.0f)">' % (lx, ly))
    o.append('<rect class="lgbox" x="0" y="0" width="%.0f" height="%d" rx="8"/>' % (W - 80, LEGEND_H))
    o.append('<text x="20" y="30" style="font-size:15px;font-weight:bold;fill:#10233d">Legend · Chen notation, crow&#39;s-foot cardinality</text>')
    line = '<line class="rline" x1="-40" y1="0" x2="40" y2="0"/>'
    items = [
        ('<rect class="ent" x="-38" y="-13" width="76" height="26"/>', "Entity"),
        ('<ellipse class="att" cx="0" cy="0" rx="38" ry="13"/>', "Attribute"),
        ('<ellipse class="attK" cx="0" cy="0" rx="38" ry="13"/>'
         '<line x1="-20" y1="5" x2="20" y2="5" stroke="#1d2733" stroke-width="1.2"/>',
         "Key attribute (primary key, underlined)"),
        ('<polygon class="rel" points="0,-15 40,0 0,15 -40,0"/>', "Relationship"),
        (line + crow_end(-40, 0, 1, 0, False, True), "Exactly one"),
        (line + crow_end(-40, 0, 1, 0, False, False), "Zero or one"),
        (line + crow_end(-40, 0, 1, 0, True, False), "Zero or many"),
        (line + crow_end(-40, 0, 1, 0, True, True), "One or many"),
    ]
    col_w = 330
    for i, (shape, label) in enumerate(items):
        cx = 20 + 55 + (i // 4) * col_w
        cy = 62 + (i % 4) * 30
        o.append('<g transform="translate(%d,%d)">%s</g>' % (cx, cy, shape))
        o.append('<text class="lg" x="%d" y="%d" dominant-baseline="central">%s</text>' % (cx + 56, cy, esc(label)))
    nx = 20 + 2 * col_w + 40
    o.append('<line x1="%d" y1="20" x2="%d" y2="%d" stroke="#c9d2de"/>' % (nx - 20, nx - 20, LEGEND_H - 20))
    o.append('<text x="%d" y="30" style="font-size:15px;font-weight:bold;fill:#10233d">Notes</text>' % nx)
    o.append('<text class="lg" x="%d" y="%d" style="fill:#4a5a70">%s</text>' % (
        nx, LEGEND_H - 22, "A crow&#39;s-foot symbol is read at the entity it touches: how many of that entity pair with one on the other side."))
    for i, n in enumerate(notes):
        o.append('<text class="lg" x="%d" y="%d" style="fill:#4a5a70">%s</text>' % (nx, 60 + i * 20, esc(n)))
    o.append("</g>")
    o.append("</g>")
    o.append("</svg>")
    return "\n".join(o)


def outer_extent(e, theta_deg):
    """How far the entity's web reaches from its centre around direction theta."""
    best = 0.0
    pts = []
    for a in e.attrs:
        pts.append(a)
        pts += a.children
    for a in pts:
        dx, dy = a.x - e.x, a.y - e.y
        ang = math.degrees(math.atan2(dy, dx))
        if ang_dist(ang, theta_deg) < 50:
            proj = dx * math.cos(math.radians(theta_deg)) + dy * math.sin(math.radians(theta_deg))
            best = max(best, proj + radial_extent(a, math.radians(theta_deg)))
    return max(best, e.w / 2)


def shift(e, dx, dy):
    e.x += dx
    e.y += dy
    for a in e.attrs:
        a.x += dx
        a.y += dy
        for c in a.children:
            c.x += dx
            c.y += dy


def diamond_reach(r, theta_deg):
    ux, uy = abs(math.cos(math.radians(theta_deg))), abs(math.sin(math.radians(theta_deg)))
    return 1 / (ux / (r.w / 2) + uy / (r.h / 2))


def build(entities, rels, hub, rel_margin=26):
    for e in entities:
        if e.direction is not None:
            e.blocked.append((e.direction + 180) % 360)
        for a in e.attrs:
            a.pin_half = 22 if a.children else 13
    for r in rels:
        sat = r.b if r.a is hub else r.a
        hub.blocked.append(sat.direction)
    for e in entities:
        layout_ring(e)
    for e in entities:
        if e is hub:
            continue
        d = e.direction
        rel = next((r for r in rels if e in (r.a, r.b)), None)
        room = 2 * (diamond_reach(rel, d) + rel_margin) if rel else 120
        dist = outer_extent(hub, d) + room + e.extra_gap + outer_extent(e, d + 180)
        shift(e, dist * math.cos(math.radians(d)), dist * math.sin(math.radians(d)))
    def place_diamonds():
        for r in rels:
            a, b = r.a, r.b
            dx, dy = b.x - a.x, b.y - a.y
            d = math.hypot(dx, dy)
            ra = outer_extent(a, math.degrees(math.atan2(dy, dx)))
            rb = outer_extent(b, math.degrees(math.atan2(-dy, -dx)))
            t = (ra + (d - ra - rb) / 2) / d
            r.x, r.y = a.x + dx * t, a.y + dy * t

    place_diamonds()
    # wide diamonds on the diagonals and neighbouring webs can still touch: push the
    # offending satellite outward along its own direction until the drawing is clean
    for _ in range(80):
        probs = [p for p in report(entities, rels) if "N:" not in p]
        if not probs:
            break
        movers = set()
        for p in probs:
            for e in entities:
                if e is not hub and (":%s." % e.name in p or "E:%s " % e.name in p):
                    movers.add(e)
            for r in rels:
                if "R:" + r.name in p:
                    movers.add(r.b if r.a is hub else r.a)
        for e in movers:
            d = math.radians(e.direction)
            shift(e, 8 * math.cos(d), 8 * math.sin(d))
        place_diamonds()


# ================================================================ Module 01
def module01():
    T, TS, I, B = "TEXT", "TIMESTAMP", "INTEGER", "BOOLEAN"
    user = Entity("User", [
        Attr("user_id", T, key=True),
        Attr("firstname", T), Attr("middle_name", T), Attr("lastname", T),
        Attr("gender", "GenderType"), Attr("age", I), Attr("phone_number", T),
        Attr("avatar", T), Attr("portal_department", T), Attr("household_size", I),
        Attr("partner_barangay", T), Attr("beneficiary_type", "BeneficiaryType"),
        Attr("createdAt", TS), Attr("updatedAt", TS),
        Attr("current_address", T), Attr("address_street", T), Attr("address_barangay", T),
        Attr("address_city", T), Attr("address_province", T),
    ], start=-70, min_w=150, min_h=64)
    role = Entity("Role", [
        Attr("role_id", T, key=True), Attr("type", "RoleType"),
        Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=-90)
    rpd = Entity("RolePermissionDefault", [
        Attr("role_permission_default_id", T, key=True), Attr("role_type", "RoleType"),
        Attr("permission", "PermissionKey"), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=-135, note=["No foreign key: joined to Role by", "role_type = Role.type"])
    account = Entity("Account", [
        Attr("account_id", T, key=True), Attr("email", T + " · unique"), Attr("password", T),
        Attr("email_verified_at", TS), Attr("credential_expires_at", TS),
        Attr("provisioned_by_user_id", T + " · ref User"), Attr("signature_url", T),
        Attr("is_restricted", B), Attr("restricted_at", TS), Attr("restriction_reason", T),
        Attr("last_login_ip", T), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=0)
    gmail = Entity("GmailConnection", [
        Attr("gmail_connection_id", T, key=True), Attr("google_sub", T), Attr("email", T),
        Attr("scope", T), Attr("access_token", T), Attr("refresh_token", T),
        Attr("access_expires_at", TS), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=-45)
    oauth = Entity("OAuthIdentity", [
        Attr("oauth_identity_id", T, key=True), Attr("provider", "AuthProvider"),
        Attr("provider_user_id", T), Attr("email", T), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=45)
    susp = Entity("UserActionSuspension", [
        Attr("user_action_suspension_id", T, key=True), Attr("permission", "PermissionKey"),
        Attr("reason", T), Attr("issued_by_user_id", T + " · ref User"), Attr("expires_at", TS),
        Attr("lifted_at", TS), Attr("lifted_by_user_id", T + " · ref User"),
        Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=90)
    override = Entity("UserPermissionOverride", [
        Attr("user_permission_override_id", T, key=True), Attr("permission", "PermissionKey"),
        Attr("effect", "PermissionOverrideEffect"), Attr("reason", T),
        Attr("granted_by_user_id", T + " · ref User"), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=135)
    avatar = Entity("UserRoleAvatar", [
        Attr("user_role_avatar_id", T, key=True), Attr("role_type", "RoleType"),
        Attr("avatar_url", T), Attr("createdAt", TS), Attr("updatedAt", TS),
    ], direction=180)
    entities = [user, role, rpd, account, gmail, oauth, susp, override, avatar]
    rels = [
        Rel("HAS_ROLE", user, "N", True, role, "1", False),
        Rel("CONNECTS_GMAIL", user, "1", False, gmail, "1", True),
        Rel("OWNS_ACCOUNT", user, "1", False, account, "N", True),
        Rel("LINKS_OAUTH_IDENTITY", user, "1", False, oauth, "N", True),
        Rel("HAS_SUSPENSION", user, "1", False, susp, "N", True),
        Rel("HAS_PERMISSION_OVERRIDE", user, "1", False, override, "N", True),
        Rel("HAS_ROLE_AVATAR", user, "1", False, avatar, "N", True),
    ]
    return entities, rels


if __name__ == "__main__":
    ents, rels = module01()
    build(ents, rels, ents[0])
    for p in report(ents, rels):
        print("!", p)
    for e in ents:
        print("ring %-24s r=%.0f" % (e.name, e.radius))
    svg = render(ents, rels,
                 "CARES — Module 01: Identity & Access",
                 "Entity-Relationship Diagram · Chen notation with crow's-foot cardinality · source: server/src/infastructures/prisma/schema.prisma (PostgreSQL) · 9 entities, 7 relationships",
                 ["Foreign-key columns (user_id, role_id) are not drawn as attributes; the relationship stands for them.",
                  "provisioned_by_user_id, granted_by_user_id, issued_by_user_id and lifted_by_user_id point at a User",
                  "but have no FK constraint in the database.",
                  "RolePermissionDefault has no FK; it is matched to Role on role_type = Role.type."])
    print("scale on page %.3f (attribute text %.1f pt)" % (render.scale, ATTR_FS * render.scale * 0.75))
    open(sys.argv[1], "w", encoding="utf-8").write(svg)
    print("wrote", sys.argv[1])
    import os
    import chen_drawio
    chen_drawio.to_drawio(ents, rels, os.path.splitext(sys.argv[1])[0] + ".drawio", "01-identity-access")
    print("wrote", os.path.splitext(sys.argv[1])[0] + ".drawio")
