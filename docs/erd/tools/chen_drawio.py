"""Write a laid-out Chen diagram as an editable draw.io file (.drawio).

Shapes are real draw.io cells and every line is a connector glued to its two shapes, so
dragging an entity, attribute or relationship keeps the lines attached. Crow's-foot ends use
draw.io's own ER markers. The page is short bond paper with the same margins as the PDF.
"""
import math
from xml.sax.saxutils import escape

import chen_web as cw

UNITS_PER_IN = 100.0          # draw.io page units: Letter is 850 x 1100


def _q(s):
    return escape(s, {'"': "&quot;"})


def _marker(many, mandatory):
    if many:
        return "ERoneToMany" if mandatory else "ERzeroToMany"
    return "ERmandOne" if mandatory else "ERzeroToOne"


def to_drawio(entities, rels, path, name):
    xs, ys = [], []
    for s in cw.shapes_of(entities, rels):
        xs += [s[1] - s[3], s[1] + s[3]]
        ys += [s[2] - s[4], s[2] + s[4]]
    minx, maxx, miny, maxy = min(xs) - 4, max(xs) + 4, min(ys) - 4, max(ys) + 4
    W, H = maxx - minx, maxy - miny
    cm = UNITS_PER_IN / 2.54
    pw, ph = cw.PAGE_IN[0] * UNITS_PER_IN, cw.PAGE_IN[1] * UNITS_PER_IN
    ml, mt = cw.MARGIN_CM["left"] * cm, cw.MARGIN_CM["top"] * cm
    aw = pw - ml - cw.MARGIN_CM["right"] * cm
    ah = ph - mt - cw.MARGIN_CM["bottom"] * cm
    k = min(aw / W, ah / H)
    oy = mt + (ah - H * k) / 2

    def X(x):
        return ml + (x - minx) * k

    def Y(y):
        return oy + (y - miny) * k

    def fs(px):
        return round(px * k, 2)

    edges, verts = [], []
    ids = {}
    n = [0]

    def new_id(prefix):
        n[0] += 1
        return "%s%d" % (prefix, n[0])

    def vertex(cid, value, style, cx, cy, w, h):
        verts.append('<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">'
                     '<mxGeometry x="%.2f" y="%.2f" width="%.2f" height="%.2f" as="geometry"/></mxCell>'
                     % (cid, _q(value), style, X(cx) - w * k / 2, Y(cy) - h * k / 2, w * k, h * k))

    def edge(src, dst, style):
        edges.append('<mxCell id="%s" style="%s" edge="1" parent="1" source="%s" target="%s">'
                     '<mxGeometry relative="1" as="geometry"/></mxCell>' % (new_id("l"), style, src, dst))

    font = "fontFamily=Arial;whiteSpace=wrap;html=1;"
    ent_style = (font + "rounded=0;fillColor=#dcf2e1;strokeColor=#1e6b34;fontColor=#0e3a1c;fontStyle=1;"
                 "strokeWidth=%.2f;fontSize=%s;" % (2 * k, fs(cw.ENT_FS)))
    att_style = (font + "ellipse;fillColor=#ffffff;strokeColor=#4a5a70;fontColor=#1d2733;"
                 "strokeWidth=%.2f;fontSize=%s;" % (1.3 * k, fs(cw.ATTR_FS)))
    key_style = (font + "ellipse;fillColor=#fff8e1;strokeColor=#8a6d1a;fontColor=#1d2733;fontStyle=5;"
                 "strokeWidth=%.2f;fontSize=%s;" % (1.6 * k, fs(cw.ATTR_FS)))
    rel_style = (font + "rhombus;fillColor=#fdeee3;strokeColor=#8a3b12;fontColor=#5a2408;fontStyle=1;"
                 "strokeWidth=%.2f;fontSize=%s;" % (2 * k, fs(cw.REL_FS)))
    aline = "endArrow=none;startArrow=none;html=1;rounded=0;strokeColor=#9aa6b5;strokeWidth=%.2f;" % (1.1 * k)

    for e in entities:
        eid = new_id("e")
        ids[e.name] = eid
        style = ent_style + ("dashed=1;" if getattr(e, "stub", False) else "")
        vertex(eid, e.name, style, e.x, e.y, e.w, e.h)
        for a in e.attrs:
            aid = new_id("a")
            vertex(aid, a.name, key_style if a.key else att_style, a.x, a.y, a.rx * 2, a.ry * 2)
            edge(eid, aid, aline)
        if e.note:
            tid = new_id("t")
            text = "<br>".join(_q(line) for line in e.note)
            verts.append('<mxCell id="%s" value="%s" style="text;html=1;align=center;verticalAlign=top;'
                         'fontFamily=Arial;fontStyle=2;fontColor=#6b7787;fontSize=%s;" vertex="1" parent="1">'
                         '<mxGeometry x="%.2f" y="%.2f" width="%.2f" height="%.2f" as="geometry"/></mxCell>'
                         % (tid, _q(text), fs(16), X(e.x) - 170 * k, Y(e.y + e.h / 2 + 6), 340 * k, 46 * k))

    for r in rels:
        rid = new_id("r")
        vertex(rid, r.name, rel_style, r.x, r.y, r.w, r.h)
        for ent, card, other_total in ((r.a, r.card_a, r.total_b), (r.b, r.card_b, r.total_a)):
            style = ("endArrow=none;html=1;rounded=0;strokeColor=#1d2733;strokeWidth=%.2f;"
                     "startArrow=%s;startFill=0;startSize=%.2f;"
                     % (1.6 * k, _marker(card == "N", other_total), 16 * k))
            edge(ids[ent.name], rid, style)

    xml = ('<mxfile host="CARES chen generator">'
           '<diagram id="%s" name="%s">'
           '<mxGraphModel grid="0" gridSize="5" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
           'page="1" pageScale="1" pageWidth="%d" pageHeight="%d" math="0" shadow="0">'
           '<root><mxCell id="0"/><mxCell id="1" parent="0"/>%s%s</root></mxGraphModel></diagram></mxfile>\n'
           % (_q(name.lower().replace(" ", "-")), _q(name), pw, ph, "".join(edges), "".join(verts)))
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
