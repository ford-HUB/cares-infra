"""Chen ERD (radial attribute webs, crow's-foot ends) for any module, read from its erd.dbml.

Usage:
    python chen_modules.py 02-verification-school [03-security-audit ...]
    python chen_modules.py all          # every module except 01 (hand-tuned in chen_web.py)

Writes chen-web.svg, chen-web.png (300 dpi) and chen-web.pdf into docs/erd/modules/<module>/.
Needs Pillow and Microsoft Edge (for the PNG/PDF export).
"""
import math
import os
import random
import subprocess
import sys

import chen_drawio
import chen_web as cw
from erd_source import ERD_DIR, load_module

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
REL_MARGIN = 12      # space between a diamond and the webs on either side
# Webs are not full circles, so the layout treats each as a slightly smaller disc and lets the
# overlap clean-up separate anything that actually touches. Lower = entities sit closer.
DISC_FIT = 0.86
GAP = 10             # minimum space between two webs


# ---------------------------------------------------------------- model
def build_model(folder):
    tables, refs = load_module(folder)
    fks = {(r.child, r.fk) for r in refs}
    ents = {}
    for t in tables:
        attrs = [cw.Attr(c.name, c.typ, key=c.pk) for c in t.columns if (t.name, c.name) not in fks]
        attrs.sort(key=lambda a: not a.key)      # key first
        e = cw.Entity(t.name, attrs)
        e.stub = t.stub
        ents[t.name] = e
    rels = []
    for r in refs:
        child, parent = ents[r.child], ents[r.parent]
        card_child = "1" if r.op == "-" else "N"
        rels.append(cw.Rel(r.name, child, card_child, r.mandatory, parent, "1", False))
    # entities with many relationship lines get a wider box so the crow's feet stay apart
    for e in ents.values():
        deg = sum(1 for r in rels if e in (r.a, r.b))
        if deg >= 4:
            e.w, e.h = max(e.w, 170), max(e.h, 64)
        elif deg == 3:
            e.w = max(e.w, 130)
    return list(ents.values()), rels


# ---------------------------------------------------------------- geometry helpers
def web_radius(e):
    """Radius of the disc the entity's web occupies (relative to its centre)."""
    r = max(e.w, e.h) / 2
    for a in e.attrs:
        r = max(r, math.hypot(a.x - e.x, a.y - e.y) + max(a.rx, a.ry))
    return r


def parallel_groups(rels):
    groups = {}
    for r in rels:
        groups.setdefault(frozenset((r.a.name, r.b.name)), []).append(r)
    return groups


def _ell_r(a, b, ux, uy):
    """Radius of an axis-aligned ellipse (half-axes a, b) along unit direction (ux, uy)."""
    return a * b / math.hypot(b * ux, a * uy)


def place_diamonds(rels):
    for grp in parallel_groups(rels).values():
        m = len(grp)
        for k, r in enumerate(grp):
            a, b = grp[0].a, grp[0].b          # same orientation for the whole group
            dx, dy = b.x - a.x, b.y - a.y
            d = math.hypot(dx, dy) or 1
            ra = cw.outer_extent(a, math.degrees(math.atan2(dy, dx)))
            rb = cw.outer_extent(b, math.degrees(math.atan2(-dy, -dx)))
            t = (ra + (d - ra - rb) / 2) / d
            nx, ny = -dy / d, dx / d
            # side-by-side diamonds: step by their extent across the line, whatever its angle
            perp = math.degrees(math.atan2(ny, nx))
            # (measured on the ellipse the overlap check uses around each diamond)
            step = 2 * max(_ell_r(g.w / 2 + 4, g.h / 2 + 4, nx, ny) for g in grp) + 12
            off = (k - (m - 1) / 2) * step
            r.x = a.x + dx * t + nx * off
            r.y = a.y + dy * t + ny * off


def layout_rings(ents, rels, first=False):
    for e in ents:
        e.blocked = []
    for r in rels:
        for e in (r.a, r.b):
            e.blocked.append(math.degrees(math.atan2(r.y - e.y, r.x - e.x)))
    for e in ents:
        if e.blocked:
            mx = sum(math.cos(math.radians(b)) for b in e.blocked)
            my = sum(math.sin(math.radians(b)) for b in e.blocked)
            e.start = math.degrees(math.atan2(-my, -mx)) if (mx or my) else -90
        else:
            e.start = 90          # no relationship: key attribute ends up on top
        cx, cy = e.x, e.y
        e.x = e.y = 0.0
        cw.layout_ring(e)
        cw.shift(e, cx, cy)
        e.disc = web_radius(e) * DISC_FIT


# ---------------------------------------------------------------- force layout
def force_layout(ents, rels, iters=3000, init=True, seed=0):
    n = len(ents)
    rng = random.Random(seed)
    if init:
        deg = {e.name: sum(1 for r in rels if e in (r.a, r.b)) for e in ents}
        order = sorted(ents, key=lambda e: -deg[e.name])
        hub = order[0]
        hub.x = hub.y = 0.0
        # breadth-first ring placement so neighbours start near each other
        seen, queue, rest = {hub.name}, [hub], []
        while queue:
            cur = queue.pop(0)
            for r in rels:
                if cur in (r.a, r.b):
                    o = r.b if r.a is cur else r.a
                    if o.name not in seen:
                        seen.add(o.name)
                        queue.append(o)
                        rest.append(o)
        rest += [e for e in order if e.name not in seen and e is not hub]
        if seed:
            rng.shuffle(rest)
        R0 = sum(e.disc for e in ents) / max(n, 1) * 2.2
        for i, e in enumerate(rest):
            ang = 2 * math.pi * i / max(len(rest), 1) - math.pi / 2 + (rng.uniform(-0.4, 0.4) if seed else 0)
            e.x, e.y = R0 * math.cos(ang) * 0.8, R0 * math.sin(ang) * 1.2
    pairs = parallel_groups(rels)
    for it in range(iters):
        fx = {e.name: 0.0 for e in ents}
        fy = {e.name: 0.0 for e in ents}
        # springs along relationships: rest length leaves room for the diamond(s)
        for grp in pairs.values():
            a, b = grp[0].a, grp[0].b
            dx, dy = b.x - a.x, b.y - a.y
            d = math.hypot(dx, dy) or 1
            ang = math.degrees(math.atan2(dy, dx))
            reach = max(cw.diamond_reach(r, ang) for r in grp)
            L = a.disc + b.disc + 2 * (reach + REL_MARGIN)
            f = 0.04 * (d - L)
            fx[a.name] += f * dx / d
            fy[a.name] += f * dy / d
            fx[b.name] -= f * dx / d
            fy[b.name] -= f * dy / d
        # discs must not overlap
        for i in range(n):
            for j in range(i + 1, n):
                a, b = ents[i], ents[j]
                dx, dy = b.x - a.x, b.y - a.y
                d = math.hypot(dx, dy) or 0.1
                need = a.disc + b.disc + GAP
                if d < need:
                    f = 0.25 * (need - d)
                    fx[a.name] -= f * dx / d
                    fy[a.name] -= f * dy / d
                    fx[b.name] += f * dx / d
                    fy[b.name] += f * dy / d
        # diamonds: keep each relationship's diamond clear of other webs and other diamonds
        mids = []
        for grp in pairs.values():
            a, b = grp[0].a, grp[0].b
            dx, dy = b.x - a.x, b.y - a.y
            d = math.hypot(dx, dy) or 1
            t = (a.disc + (d - a.disc - b.disc) / 2) / d
            reach = max(r.w for r in grp) / 2 + (len(grp) - 1) * 50
            mids.append((a, b, a.x + dx * t, a.y + dy * t, reach))
        for a, b, mx, my, reach in mids:
            for e in ents:
                if e is a or e is b:
                    continue
                dx, dy = e.x - mx, e.y - my
                d = math.hypot(dx, dy) or 0.1
                need = e.disc + reach + GAP
                if d < need:
                    f = 0.12 * (need - d)
                    fx[e.name] += f * dx / d
                    fy[e.name] += f * dy / d
                    for z in (a, b):
                        fx[z.name] -= 0.5 * f * dx / d
                        fy[z.name] -= 0.5 * f * dy / d
        for i in range(len(mids)):
            for j in range(i + 1, len(mids)):
                a1, b1, x1, y1, r1 = mids[i]
                a2, b2, x2, y2, r2 = mids[j]
                dx, dy = x2 - x1, y2 - y1
                d = math.hypot(dx, dy) or 0.1
                need = r1 + r2 + GAP
                if d < need:
                    f = 0.06 * (need - d)
                    for z in (a1, b1):
                        fx[z.name] -= 0.5 * f * dx / d
                        fy[z.name] -= 0.5 * f * dy / d
                    for z in (a2, b2):
                        fx[z.name] += 0.5 * f * dx / d
                        fy[z.name] += 0.5 * f * dy / d
        # gravity, stronger sideways: the page is portrait
        cx = sum(e.x for e in ents) / n
        cy = sum(e.y for e in ents) / n
        for e in ents:
            fx[e.name] -= 0.020 * (e.x - cx)
            fy[e.name] -= 0.008 * (e.y - cy)
        step = 1.0 if it < iters * 0.7 else 0.4
        for e in ents:
            dx, dy = fx[e.name] * step, fy[e.name] * step
            cw.shift(e, dx, dy)


# ---------------------------------------------------------------- clean-up
def fix_overlaps(ents, rels, rounds=70):
    by = {e.name: e for e in ents}
    relby = {r.name: r for r in rels}

    def ent_of(tok):
        if tok.startswith("A:"):
            return by.get(tok[2:].split(".")[0])
        if tok.startswith("E:"):
            return by.get(tok[2:])
        return None

    def push_apart(x, y, amt=5.0):
        dx, dy = y.x - x.x, y.y - x.y
        d = math.hypot(dx, dy) or 1
        cw.shift(x, -amt * dx / d, -amt * dy / d)
        cw.shift(y, amt * dx / d, amt * dy / d)

    def push_from(e, px, py, amt=5.0):
        dx, dy = e.x - px, e.y - py
        d = math.hypot(dx, dy) or 1
        cw.shift(e, amt * dx / d, amt * dy / d)

    for k in range(rounds):
        if k and k % 15 == 0:            # entities moved: re-aim the attribute gaps at the diamonds
            layout_rings(ents, rels)
            place_diamonds(rels)
        probs = [p for p in cw.report(ents, rels) if "N:" not in p]
        if not probs:
            return []
        for p in probs:
            if p.startswith("overlap "):
                t1, t2 = p[len("overlap "):].split(" <-> ")
                toks = [t1, t2]
                es = [ent_of(t) for t in toks]
                rs = [relby.get(t[2:]) for t in toks if t.startswith("R:")]
                if es[0] and es[1] and es[0] is not es[1]:
                    push_apart(es[0], es[1])
                elif rs:
                    r = rs[0]
                    e = es[0] or es[1]
                    if len(rs) == 2:
                        push_apart(rs[0].a, rs[0].b)
                        push_apart(rs[1].a, rs[1].b)
                    elif e in (r.a, r.b):
                        push_apart(r.a, r.b)
                    elif e is not None:
                        push_from(e, r.x, r.y)
            else:  # "line X-Y crosses Z"
                body, z = p[len("line "):].split(" crosses ")
                ez = ent_of(z)
                s1 = body.split("-")[0]
                e1 = ent_of(s1)
                if ez is not None and e1 is not None and ez is not e1:
                    push_apart(e1, ez)
                elif ez is None and z.startswith("R:"):
                    r = relby.get(z[2:])
                    if r and e1:
                        push_from(e1, r.x, r.y)
        place_diamonds(rels)
    return [p for p in cw.report(ents, rels) if "N:" not in p]


def recentre_hub(ents):
    """Nothing to do for the drawing itself; kept for symmetry with module 01."""
    return ents


# ---------------------------------------------------------------- export
def export(folder_path):
    svg = os.path.join(folder_path, "chen-web.svg")
    png = os.path.join(folder_path, "chen-web.png")
    pdf = os.path.join(folder_path, "chen-web.pdf")
    html = os.path.join(folder_path, ".print.html")
    with open(html, "w", encoding="utf-8") as f:
        f.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:%gin %gin;margin:0}'
                'html,body{margin:0;padding:0}img{display:block;width:%gin;height:%gin}</style></head>'
                '<body><img src="chen-web.svg"></body></html>' % (cw.PAGE_IN * 2))
    w, h = int(cw.PAGE_IN[0] * 96), int(cw.PAGE_IN[1] * 96)
    common = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars"]
    subprocess.run(common + ["--force-device-scale-factor=3.125", "--window-size=%d,%d" % (w, h),
                             "--screenshot=" + png, "file:///" + svg.replace("\\", "/")],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    subprocess.run(common + ["--no-pdf-header-footer", "--print-to-pdf=" + pdf, "file:///" + html.replace("\\", "/")],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    os.remove(html)


def attempt(folder, seed):
    ents, rels = build_model(folder)
    # 1. rings without relationship gaps, to size each web
    for e in ents:
        e.blocked = []
        e.start = -90
        cw.layout_ring(e)
        e.disc = web_radius(e) * DISC_FIT
    # 2. place the webs, then redo the rings with gaps facing the diamonds
    force_layout(ents, rels, seed=seed)
    for _ in range(2):
        place_diamonds(rels)
        layout_rings(ents, rels)
        force_layout(ents, rels, iters=600, init=False)
    place_diamonds(rels)
    layout_rings(ents, rels)
    place_diamonds(rels)
    left = fix_overlaps(ents, rels)
    cw.render(ents, rels, "", "", [])
    return (len(left), -cw.render.scale), ents, rels, left


def generate(folder, seeds=8, max_seeds=40):
    best = None
    for seed in range(max_seeds):
        if seed >= seeds and best[0][0] == 0:
            break                       # clean layout found; stop searching
        res = attempt(folder, seed)
        if best is None or res[0] < best[0]:
            best = res
    _, ents, rels, left = best
    svg = cw.render(ents, rels, "", "", [])
    out_dir = os.path.join(ERD_DIR, "modules", folder)
    with open(os.path.join(out_dir, "chen-web.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    chen_drawio.to_drawio(ents, rels, os.path.join(out_dir, "chen-web.drawio"), folder)
    export(out_dir)
    print("%-32s %d entities, %d relationships, attribute text %.1f pt%s"
          % (folder, len(ents), len(rels), cw.ATTR_FS * cw.render.scale * 0.75,
             "" if not left else "  UNRESOLVED: %s" % left))


if __name__ == "__main__":
    folders = sys.argv[1:]
    if folders == ["all"]:
        folders = sorted(f for f in os.listdir(os.path.join(ERD_DIR, "modules"))
                         if f[:2].isdigit() and f[:2] != "01" and os.path.isdir(os.path.join(ERD_DIR, "modules", f)))
    for f in folders:
        generate(f)
