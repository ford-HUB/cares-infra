"""CARES data dictionary, generated from the Prisma schema.

Usage:  cd docs/erd/tools && python data_dictionary.py [--no-pdf]

Reads   server/src/infastructures/prisma/schema.prisma   (columns, types, keys)
        docs/erd/modules/*/erd.dbml                      (table order, so related tables sit together)
        data_dictionary_text.py                          (column descriptions)
        data_dictionary_paragraphs.py                    (the paragraph under each table)
Writes  docs/erd/data-dictionary.md                      (the whole database in one file)
        docs/erd/data-dictionary.pdf                     (print-ready, short bond, needs Microsoft Edge)

Every table is listed as  Column | Data Type | Constraints | Description,  followed by a
paragraph that explains it. Columns or tables with no text are listed on stdout; the
generator still writes the files, with the text left blank.
"""
import datetime
import html
import os
import re
import subprocess
import sys

from erd_source import ERD_DIR, parse_dbml
from data_dictionary_paragraphs import PARAGRAPHS
from data_dictionary_text import ENUMS, TABLES

ROOT = os.path.dirname(os.path.dirname(ERD_DIR))
SCHEMA = os.path.join(ROOT, "server", "src", "infastructures", "prisma", "schema.prisma")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# short bond, same margins as the Chen diagrams
PAGE = "8.5in 11in"
MARGIN = "2.54cm 2.54cm 2.54cm 3.54cm"

# PostgreSQL types as Prisma creates them, in their short spelling (INT = INTEGER, FLOAT = DOUBLE PRECISION)
SCALARS = {"String": "TEXT", "Int": "INT", "Float": "FLOAT", "Boolean": "BOOLEAN",
           "DateTime": "TIMESTAMP", "Json": "JSONB", "BigInt": "BIGINT", "Decimal": "DECIMAL",
           "Bytes": "BYTEA"}


# ---------------------------------------------------------------- schema parsing
class Field:
    def __init__(self, name, typ, is_list, optional, attrs):
        self.name, self.typ, self.is_list, self.optional, self.attrs = name, typ, is_list, optional, attrs
        self.pk = "@id" in attrs
        self.unique = re.search(r"@unique\b", attrs) is not None
        self.fk = False


class Model:
    def __init__(self, name, doc):
        self.name, self.doc, self.fields = name, doc, []


class Enum:
    def __init__(self, name, doc):
        self.name, self.doc, self.values = name, doc, []


def _blocks(text, kind):
    for m in re.finditer(r"((?:^[ \t]*///[^\n]*\n)*)^%s (\w+) \{\n(.*?)^\}" % kind, text, re.M | re.S):
        yield m.group(2), _doc(m.group(1)), m.group(3)


def _doc(lines):
    return " ".join(l.strip()[3:].strip() for l in lines.strip().split("\n") if l.strip().startswith("///"))


def parse_schema(path=SCHEMA):
    text = open(path, encoding="utf-8").read()
    models, enums = {}, {}
    for name, doc, body in _blocks(text, "enum"):
        e = Enum(name, doc)
        e.values = [s for s in (l.strip() for l in body.split("\n")) if re.match(r"^\w+$", s)]
        enums[name] = e
    raw = {name: (doc, body) for name, doc, body in _blocks(text, "model")}
    for name, (doc, body) in raw.items():
        m, fk_cols = Model(name, doc), set()
        for line in body.split("\n"):
            fm = re.match(r"^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$", line.strip())
            if not fm:
                continue
            fname, typ, is_list, opt, attrs = fm.groups()
            if typ in raw:                    # relation field, not a column
                rm = re.search(r"fields:\s*\[([^\]]+)\]", attrs)
                if rm:
                    fk_cols.update(c.strip() for c in rm.group(1).split(","))
            else:
                m.fields.append(Field(fname, typ, bool(is_list), bool(opt), attrs))
        for f in m.fields:
            f.fk = f.name in fk_cols
        models[name] = m
    return models, enums


def table_order(models):
    """Tables in the ERD's order (related tables stay together), with no module grouping."""
    order = []
    mod_dir = os.path.join(ERD_DIR, "modules")
    for folder in sorted(os.listdir(mod_dir)):
        path = os.path.join(mod_dir, folder, "erd.dbml")
        if folder[:2].isdigit() and os.path.isfile(path):
            order += [t.name for t in parse_dbml(path)[0] if not t.stub and t.name in models]
    return order + sorted(n for n in models if n not in order)


# ---------------------------------------------------------------- column presentation
def data_type(f, enums):
    if f.typ in enums:
        t = f.typ
    elif f.typ == "Int" and "autoincrement()" in f.attrs:
        t = "SERIAL"
    else:
        t = SCALARS.get(f.typ, f.typ)
    return t + "[]" if f.is_list else t


def column_constraints(f):
    if f.pk:
        return "PK"
    if f.fk:
        return "FK"
    if f.unique:
        return "UNIQUE"
    return "NULL" if f.optional else "NOT NULL"


def humanize(name):
    return re.sub(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", " ", name).lower()


def describe(model, f, missing):
    text = TABLES.get(model.name, ("", {}))[1].get(f.name)
    if text is not None:
        return text
    if f.pk:
        return "Unique identifier of the %s table." % humanize(model.name)
    if f.name == "createdAt":
        return "Date and time the record was created."
    if f.name == "updatedAt":
        return "Date and time the record was last updated."
    missing.append("%s.%s" % (model.name, f.name))
    return ""


def ordered_fields(model):
    return [f for f in model.fields if f.pk] + [f for f in model.fields if not f.pk]


def key_fields(model, limit=8):
    """PK, then FKs, then required columns, then the rest; timestamps left out."""
    cols = [f for f in model.fields if f.name not in ("createdAt", "updatedAt")]
    ranked = ([f for f in cols if f.pk] + [f for f in cols if f.fk and not f.pk] +
              [f for f in cols if not f.pk and not f.fk and not f.optional] +
              [f for f in cols if not f.pk and not f.fk and f.optional])
    pick = {f.name for f in ranked[:limit]}
    return [f.name for f in ordered_fields(model) if f.name in pick]


def paragraph(model, missing):
    if model.name not in PARAGRAPHS:
        missing.append(model.name + " (paragraph)")
        return ""
    opening, closing = PARAGRAPHS[model.name]
    names = key_fields(model)
    if len(names) == 1:
        middle = "The key field %s is identified along with its constraint and data type." % names[0]
    else:
        listed = (" and ".join(names) if len(names) == 2
                  else "%s, and %s" % (", ".join(names[:-1]), names[-1]))
        middle = "Key fields such as %s are identified along with their constraints and data types." % listed
    return " ".join([opening, middle, closing])


def table_desc(m):
    return TABLES.get(m.name, (m.doc, {}))[0] or m.doc


def enum_values(e):
    desc, notes = ENUMS.get(e.name, (e.doc, {}))
    return desc or e.doc, [(v, notes.get(v)) for v in e.values]


CONVENTIONS = [
    ("PK", "Primary key: uniquely identifies each record."),
    ("FK", "Foreign key: refers to the primary key of another table."),
    ("UNIQUE", "No two records may hold the same value."),
    ("NOT NULL", "A value is required."),
    ("NULL", "The column may be left empty."),
    ("TEXT", "Variable-length string (PostgreSQL). Identifiers generated as UUIDs are stored as TEXT."),
    ("INT / SERIAL", "Whole number; SERIAL is an INT that numbers itself automatically."),
    ("FLOAT", "Decimal number (double precision)."),
    ("TIMESTAMP", "Date and time."),
    ("JSONB", "Structured JSON document."),
    ("Type[]", "A list of values of that type."),
    ("Enum types", "A data type such as RoleType is a fixed list of allowed values, listed in the "
                   "Enumerated Types section."),
]


# ---------------------------------------------------------------- markdown
def md_cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def write_markdown(models, enums, order, today, missing):
    cols_total = sum(len(models[t].fields) for t in order)
    out = ["# CARES Data Dictionary", "",
           "Generated from `server/src/infastructures/prisma/schema.prisma` (PostgreSQL) on %s: "
           "%d tables, %d columns, %d enumerated types. Regenerate with "
           "`python docs/erd/tools/data_dictionary.py`; a print-ready copy is in "
           "[data-dictionary.pdf](data-dictionary.pdf)." % (today, len(order), cols_total, len(enums)), "",
           "## Conventions", "", "| Term | Meaning |", "|---|---|"]
    out += ["| %s | %s |" % (md_cell(t), md_cell(d)) for t, d in CONVENTIONS]
    out += ["", "## Tables", "", "| # | Table | Description |", "|---|---|---|"]
    for i, t in enumerate(order, 1):
        anchor = re.sub(r"[^a-z0-9]+", "-", ("table %d %s" % (i, t)).lower()).strip("-")
        out.append("| %d | [%s](#%s) | %s |" % (i, t, anchor, md_cell(table_desc(models[t]))))
    out.append("")
    for i, t in enumerate(order, 1):
        m = models[t]
        out += ["## Table %d. %s" % (i, t), "",
                "| Column | Data Type | Constraints | Description |", "|:---:|:---:|:---:|:---:|"]
        for f in ordered_fields(m):
            out.append("| %s | %s | %s | %s |" % (f.name, data_type(f, enums), column_constraints(f),
                                                 md_cell(describe(m, f, missing))))
        out += ["", paragraph(m, missing), ""]
    out += ["## Enumerated Types", "", "| Enum | Values | Description |", "|---|---|---|"]
    for name in sorted(enums):
        desc, values = enum_values(enums[name])
        vals = ", ".join("`%s`%s" % (v, " (%s)" % n if n else "") for v, n in values)
        out.append("| %s | %s | %s |" % (name, md_cell(vals), md_cell(desc)))
    with open(os.path.join(ERD_DIR, "data-dictionary.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(out) + "\n")


# ---------------------------------------------------------------- print (HTML -> PDF)
CSS = """
@page { size: %s; margin: %s;
  @bottom-center { content: counter(page); font: 11pt "Times New Roman", serif; } }
@page :first { @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { font: 12pt/1.5 "Times New Roman", Times, serif; color: #000; margin: 0; }
h1 { font-size: 20pt; margin: 0 0 6pt; }
h2 { font-size: 14pt; margin: 0 0 10pt; text-align: center; }
p { margin: 0; }
.cover { height: 9in; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.cover .sub { font-size: 13pt; margin-bottom: 18pt; }
.cover .meta { font-size: 11pt; }
.page { break-before: page; }
.caption { font-weight: bold; text-align: center; margin: 0 0 4pt; break-after: avoid; }
.entry { margin-bottom: 24pt; }
table { width: 100%%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 0.75pt solid #000; padding: 2pt 4pt; text-align: center; vertical-align: middle;
         font-size: 11pt; line-height: 1.6; overflow-wrap: anywhere; }
th { font-weight: bold; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
td.l { text-align: left; }
.explain { text-indent: 0.5in; text-align: justify; line-height: 2; margin-top: 12pt; }
.ref th, .ref td { font-size: 10.5pt; line-height: 1.35; vertical-align: top; }
"""

COLS = [("Column", "27%"), ("Data Type", "19%"), ("Constraints", "17%"), ("Description", "37%")]


def e(s):
    return html.escape(str(s))


def write_pdf(models, enums, order, today):
    cols_total = sum(len(models[t].fields) for t in order)
    h = ['<!doctype html><html><head><meta charset="utf-8"><title>CARES Data Dictionary</title>'
         '<style>%s</style></head><body>' % (CSS % (PAGE, MARGIN))]
    h.append('<div class="cover"><h1>CARES Data Dictionary</h1>'
             '<div class="sub">Database of the CARES volunteer, donor and beneficiary platform</div>'
             '<div class="meta">PostgreSQL schema: %d tables, %d columns, %d enumerated types.<br>'
             'Generated %s</div></div>' % (len(order), cols_total, len(enums), e(today)))
    h.append('<div class="page"><h2>Conventions</h2><table class="ref"><colgroup><col style="width:24%">'
             '<col></colgroup><thead><tr><th>Term</th><th>Meaning</th></tr></thead><tbody>')
    h += ['<tr><td><b>%s</b></td><td class="l">%s</td></tr>' % (e(t), e(d)) for t, d in CONVENTIONS]
    h.append('</tbody></table><h2 style="margin-top:18pt">Tables</h2><table class="ref"><colgroup>'
             '<col style="width:7%"><col style="width:30%"><col></colgroup><thead><tr><th>#</th><th>Table</th>'
             '<th>Description</th></tr></thead><tbody>')
    h += ['<tr><td>%d</td><td class="l">%s</td><td class="l">%s</td></tr>' % (i, e(t), e(table_desc(models[t])))
          for i, t in enumerate(order, 1)]
    h.append('</tbody></table></div><div class="page">')
    colgroup = "<colgroup>%s</colgroup>" % "".join('<col style="width:%s">' % w for _, w in COLS)
    thead = "<thead><tr>%s</tr></thead>" % "".join("<th>%s</th>" % e(n) for n, _ in COLS)
    for i, t in enumerate(order, 1):
        m = models[t]
        h.append('<div class="entry"><p class="caption">Table %d. %s</p><table>%s%s<tbody>'
                 % (i, e(t), colgroup, thead))
        for f in ordered_fields(m):
            h.append('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
                e(f.name), e(data_type(f, enums)), e(column_constraints(f)), e(describe(m, f, []))))
        h.append('</tbody></table><p class="explain">%s</p></div>' % e(paragraph(m, [])))
    h.append('</div><div class="page"><h2>Enumerated Types</h2><table class="ref"><colgroup>'
             '<col style="width:24%"><col style="width:46%"><col></colgroup><thead><tr><th>Enum</th>'
             '<th>Values</th><th>Description</th></tr></thead><tbody>')
    for name in sorted(enums):
        desc, values = enum_values(enums[name])
        vals = ", ".join("%s%s" % (e(v), " (%s)" % e(n) if n else "") for v, n in values)
        h.append('<tr><td class="l"><b>%s</b></td><td class="l">%s</td><td class="l">%s</td></tr>'
                 % (e(name), vals, e(desc)))
    h.append('</tbody></table></div></body></html>')

    page = os.path.join(ERD_DIR, ".data-dictionary.print.html")
    pdf = os.path.join(ERD_DIR, "data-dictionary.pdf")
    with open(page, "w", encoding="utf-8") as fh:
        fh.write("".join(h))
    if not os.path.isfile(EDGE):
        print("Microsoft Edge not found; PDF skipped (HTML left at %s)" % page)
        return
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--print-to-pdf=" + pdf, "file:///" + page.replace("\\", "/")],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    os.remove(page)


def main():
    models, enums = parse_schema()
    order = table_order(models)
    today = datetime.date.today().isoformat()
    missing = []
    write_markdown(models, enums, order, today, missing)
    if "--no-pdf" not in sys.argv:
        write_pdf(models, enums, order, today)
    stale = [t for t in TABLES if t not in models] + [n for n in ENUMS if n not in enums]
    stale += [t + " (paragraph)" for t in PARAGRAPHS if t not in models]
    stale += ["%s.%s" % (t, c) for t, (_, cols) in TABLES.items() if t in models
              for c in cols if c not in {f.name for f in models[t].fields}]
    print("%d tables, %d columns, %d enums" % (len(order), sum(len(m.fields) for m in models.values()), len(enums)))
    if missing:
        print("Missing text for: " + ", ".join(missing))
    if stale:
        print("Described but not in the schema: " + ", ".join(stale))


if __name__ == "__main__":
    main()
