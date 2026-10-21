import re

TOK = re.compile(r'''
 (?P<ws>\s+|//[^\n]*|/\*.*?\*/|<!--.*?-->)
|(?P<ms>"""(?:.|\n)*?""")
|(?P<str>"(?:[^"\\]|\\.)*")
|(?P<punct>[{}\[\]=,])
|(?P<prefix>[A-Za-z_]+:(?=["{\[]))
|(?P<atom>[^\s{}\[\]=,"]+)
''', re.X | re.S)


def tokenize(s):
    out = []
    for m in TOK.finditer(s):
        k = m.lastgroup
        if k == 'ws':
            continue
        v = m.group()
        if k == 'ms':
            out.append(('s', v[3:-3]))
        elif k == 'str':
            out.append(('s', bytes(v[1:-1], 'utf-8').decode('unicode_escape') if '\\' in v else v[1:-1]))
        elif k == 'punct':
            out.append(('p', v))
        elif k == 'prefix':
            out.append(('x', v[:-1]))
        elif v.endswith(':') and len(v) > 1:
            out.append(('x', v[:-1]))
        else:
            out.append(('a', v))
    return out


def parse(s):
    toks = tokenize(s)
    i = 0

    def value():
        nonlocal i
        t, v = toks[i]
        if t == 'x':  # prefix like subclass:, resource_name:
            i += 1
            return value()
        if t == 'p' and v == '{':
            i += 1
            d = {}
            while not (toks[i] == ('p', '}')):
                kt, kv = toks[i]
                i += 1
                assert toks[i] == ('p', '='), (toks[i - 2:i + 2])
                i += 1
                d[kv] = value()
            i += 1
            return d
        if t == 'p' and v == '[':
            i += 1
            arr = []
            while toks[i] != ('p', ']'):
                arr.append(value())
                if toks[i] == ('p', ','):
                    i += 1
            i += 1
            return arr
        i += 1
        if t == 's':
            return v
        if v in ('true', 'false'):
            return v == 'true'
        if v == 'null':
            return None
        try:
            return float(v) if any(c in v for c in '.eE') else int(v)
        except ValueError:
            return v

    return value()
