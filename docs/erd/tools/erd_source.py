"""Read a module's erd.dbml (tables, columns, FKs) and the relationship names from cares-erd-chen.puml."""
import os
import re

ERD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Column:
    def __init__(self, name, typ, pk, note):
        self.name, self.typ, self.pk, self.note = name, typ, pk, note


class Table:
    def __init__(self, name):
        self.name, self.columns, self.stub, self.stub_module = name, [], False, ""


class Ref:
    def __init__(self, child, fk, op, parent, pk, mandatory):
        self.child, self.fk, self.op, self.parent, self.pk = child, fk, op, parent, pk
        self.mandatory = mandatory               # FK column is NOT NULL
        self.name = None


def parse_dbml(path):
    text = open(path, encoding="utf-8").read()
    tables, refs = [], []
    for m in re.finditer(r"^Table (\w+) \{\n(.*?)^\}", text, re.S | re.M):
        t = Table(m.group(1))
        body = m.group(2)
        sm = re.search(r"Note: 'Stub - Defined in module (\d+)", body)
        if sm:
            t.stub, t.stub_module = True, sm.group(1)
        for line in body.split("\n"):
            cm = re.match(r"^  (\w+)\s+(\"[^\"]+\"|\S+)\s*(\[.*\])?\s*$", line)
            if not cm or cm.group(1) in ("Note", "indexes"):
                continue
            attrs = cm.group(3) or ""
            t.columns.append(Column(cm.group(1), cm.group(2).strip('"'), "pk" in re.split(r"[\[,\s]+", attrs), attrs))
        tables.append(t)
    for m in re.finditer(r"^Ref(?: \w+)?: (\w+)\.(\w+) ([<>-]) (\w+)\.(\w+).*?//\s*(\S+), (mandatory|optional)", text, re.M):
        refs.append(Ref(m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(7) == "mandatory"))
    return tables, refs


def puml_relationships():
    """[(name, {entity: (card, total)})] in file order."""
    text = open(os.path.join(ERD_DIR, "cares-erd-chen.puml"), encoding="utf-8").read()
    out = []
    for m in re.finditer(r"^relationship (\w+) \{\n\}\n((?:\1 [-=]\w[-=] \w+\n)+)", text, re.M):
        ends = []
        for line in m.group(2).strip().split("\n"):
            lm = re.match(r"\w+ ([-=])(\w)[-=] (\w+)", line)
            ends.append((lm.group(3), lm.group(2), lm.group(1) == "="))
        out.append((m.group(1), ends))
    return out


def name_refs(refs):
    """Give each FK the relationship name the full Chen diagram uses for it (matched in order)."""
    rels = puml_relationships()
    used = set()
    for r in refs:
        for i, (name, ends) in enumerate(rels):
            if i in used:
                continue
            ents = sorted(e[0] for e in ends)
            # the child end is drawn as total participation exactly when its FK is NOT NULL
            child_total = [e[2] for e in ends if e[0] == r.child and e[1] in ("N", "1")]
            if ents == sorted([r.child, r.parent]) and (r.child == r.parent or r.mandatory in child_total):
                r.name = name
                used.add(i)
                break
        if r.name is None:
            r.name = "REL_%s_%s" % (r.child.upper(), r.fk.upper())
    return refs


def load_module(folder):
    tables, refs = parse_dbml(os.path.join(ERD_DIR, "modules", folder, "erd.dbml"))
    return tables, name_refs(refs)


if __name__ == "__main__":
    for folder in sorted(os.listdir(os.path.join(ERD_DIR, "modules"))):
        if not folder[:2].isdigit() or not os.path.isdir(os.path.join(ERD_DIR, "modules", folder)):
            continue
        tables, refs = load_module(folder)
        print("==", folder)
        for t in tables:
            fks = {r.fk for r in refs if r.child == t.name}
            n = len([c for c in t.columns if c.name not in fks])
            print("   %-30s %s%d attrs" % (t.name, "STUB(%s) " % t.stub_module if t.stub else "", n))
        for r in refs:
            print("   %-28s %s.%s %s %s  %s" % (r.name, r.child, r.fk, r.op, r.parent, "mand" if r.mandatory else "opt"))
