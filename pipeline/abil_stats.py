"""Build abil_stats.json from Deadlock abilities.vdata + localization (GameTracking build 6701)."""
import copy, html, json, os, pickle, re
import kv3

HERE = os.getcwd()  # run from the repo root
VD = os.path.join(HERE, 'gt/game/citadel/pak01_dir/scripts/abilities.vdata')
LOC = os.path.join(HERE, 'gt/game/citadel/resource/localization')

# ---------------- vdata + inheritance ----------------
pk = os.path.join(HERE, 'abil_vdata.pkl')
if os.path.exists(pk) and os.path.getmtime(pk) > os.path.getmtime(VD):
    V = pickle.load(open(pk, 'rb'))
else:
    V = kv3.parse(open(VD, encoding='utf-8').read())


def deep_merge(base, over):
    out = copy.deepcopy(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


_resolved = {}


def resolve(name, stack=()):
    if name in _resolved:
        return _resolved[name]
    e = V[name]
    bases = list(e.get('_multibase') or [])
    if e.get('_base'):
        bases.insert(0, e['_base'])
    acc = {}
    for b in bases:
        if b in V and b not in stack:
            acc = deep_merge(acc, resolve(b, stack + (name,)))
    acc = deep_merge(acc, {k: v for k, v in e.items() if k not in ('_multibase', '_base')})
    _resolved[name] = acc
    return acc


# ---------------- localization ----------------
LTOK = re.compile(r'"((?:[^"\\]|\\.)*)"|//[^\n]*|([{}])')
loc = {}
LOC_FILES = ['citadel_main/citadel_main_english.txt',
             'citadel_mods/citadel_mods_english.txt',
             'citadel_attributes/citadel_attributes_english.txt',
             'citadel_heroes/citadel_heroes_english.txt']


def _read_loc(f):
    p = os.path.join(LOC, f)
    if os.path.exists(p):
        return open(p, encoding='utf-8', errors='replace').read()
    try:  # sparse clone: read straight from git object store
        import subprocess
        return subprocess.run(['git', '-C', os.path.join(HERE, 'gt'), 'show',
                               'HEAD:game/citadel/resource/localization/' + f],
                              capture_output=True, check=True).stdout.decode('utf-8', 'replace')
    except Exception:
        return ''


# later files override earlier; heroes file is most specific for ability props
for f in LOC_FILES:
    pend = None
    for m in LTOK.finditer(_read_loc(f)):
        if m.group(1) is None:  # comment or brace
            pend = None
            continue
        if pend is None:
            pend = m.group(1)
        else:
            loc[pend] = m.group(1).replace('\\"', '"').replace('\\n', ' ')
            pend = None


def camel_words(s):
    s = re.sub(r'(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])', ' ', s)
    return s.replace('_', ' ').strip()


def strip_html(s):
    s = re.sub(r'<br\s*/?>', '; ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\s*;\s*;', ';', s).strip(' ;')
    s = s.replace(' ;', ';').replace('.;', '.').replace('&;', '&').replace(':;', ':')
    return html.unescape(s)


# ---------------- value helpers ----------------
def num(v):
    """-> (float|None, had_m_suffix)"""
    if isinstance(v, bool):
        return float(v), False
    if isinstance(v, (int, float)):
        return float(v), False
    if v is None:
        return None, False
    s = str(v).strip()
    m = re.fullmatch(r'([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(m|s|%)?', s)
    if not m:
        return None, False
    return float(m.group(1)), m.group(2) == 'm'


def fmt(x):
    if x is None:
        return ''
    r = round(x, 2)
    if abs(r - round(r)) < 1e-9:
        return str(int(round(r)))
    return ('%.2f' % r).rstrip('0').rstrip('.')


SCALE_STAT = {
    'ETechPower': 'Spirit', 'EWeaponPower': 'Weapon', 'EBaseWeaponDamageIncrease': 'Weapon',
    'ELightMeleeDamage': 'Light Melee', 'EHeavyMeleeDamage': 'Heavy Melee', 'ELevelUpBoons': 'Boon',
}


def scaling(prop):
    f = prop.get('m_subclassScaleFunction')
    if not isinstance(f, dict) or 'm_flStatScale' not in f:
        return None
    cls = f.get('_class') or ''
    st = f.get('m_eSpecificStatScaleType')
    if not st and cls in ('scale_function_tech_damage', 'scale_function_healing_spirit_scale'):
        st = 'ETechPower'
    name = SCALE_STAT.get(st)
    if not name:
        return None
    x, _ = num(f['m_flStatScale'])
    if not x or abs(x) < 0.01:
        return None
    return {'x': round(x, 3), 'stat': name}


def token_of(pname, prop):
    return prop.get('m_strLocTokenOverride') or pname


def label_of(pname, prop):
    tok = token_of(pname, prop)
    for k in (tok + '_label', tok + '_postvalue_label', pname + '_label', pname + '_postvalue_label'):
        if loc.get(k):
            return strip_html(loc[k]).rstrip(':'), True
    return camel_words(pname), False


def unit_of(pname, prop, had_m):
    tok = token_of(pname, prop)
    if prop.get('m_eDisplayUnits') == 'EDisplayUnit_MetersPerSecond':
        return 'm/s'
    for k in (tok + '_postfix', pname + '_postfix'):
        if k in loc:
            u = loc[k].strip()
            if u or not (had_m or prop.get('m_eDisplayUnits')):
                return u
    du = prop.get('m_eDisplayUnits', '')
    if du == 'EDisplayUnit_MetersPerSecond':
        return 'm/s'
    if du == 'EDisplayUnit_Meters' or had_m:
        return 'm'
    css = prop.get('m_strCSSClass') or ''
    if css in ('duration', 'cooldown', 'charge_cooldown', 'time'):
        return 's'
    return ''


def prop_value(prop):
    x, had_m = num(prop.get('m_strValue'))
    return x, had_m


def is_off(prop):
    x, _ = prop_value(prop)
    if x is None:
        return True
    if prop.get('m_bIsHidden'):
        return True
    dv, _ = num(prop.get('m_strDisableValue'))
    if dv is not None and abs(x - dv) < 1e-9:
        return True
    if x == 0:
        return True
    if prop.get('m_bReturnZeroIfUnupgraded'):
        return True
    return False


# properties that are header fields / internals we never list as stats
SKIP = {'AbilityCooldown', 'AbilityCharges', 'AbilityUnitTargetLimit', 'AbilityPostCastDuration',
        'AbilityResourceCost', 'TechPower', 'WeaponPower', 'TickRate', 'ChannelMoveSpeed',
        'AbilityCastDelay'}
HEADERISH = ['AbilityDuration', 'AbilityCastRange', 'AbilityChannelTime']
MAX_STATS = 7


def stat_entry(pname, props, label_override=None):
    prop = props.get(pname)
    if prop is None or is_off(prop):
        return None
    x, had_m = prop_value(prop)
    lab, ok = label_of(pname, prop)
    if pname == 'AbilityCooldownBetweenCharge' and x < 0:
        return None
    u = unit_of(pname, prop, had_m)
    lab = label_override or lab
    if u == 'm' and re.search(r'speed|velocity', lab, re.I):
        u = 'm/s'
    if u and u[0].isascii() and u[0].isalpha() and u not in ('m', 's', 'm/s', 'x'):
        u = ' ' + u
    e = {'k': lab, 'v': fmt(x), 'u': u}
    sc = scaling(prop)
    if sc:
        if abs(x) <= 0.01:  # placeholder base; value is entirely stat-driven (e.g. 100% of light melee)
            e['v'], e['u'] = fmt(sc['x'] * 100), '% of ' + sc['stat'] + ' Damage'
        else:
            e['sc'] = sc
    e['_p'] = pname
    e['_lab_ok'] = ok or bool(label_override)
    return e


def build(aid, hero_name=''):
    a = resolve(aid)
    props = a.get('m_mapAbilityProperties', {}) or {}
    tt = a.get('m_AbilityTooltipDetails', {}) or {}

    def pv(n):
        p = props.get(n)
        return None if p is None else prop_value(p)[0]

    cd = pv('AbilityCooldown')
    cd = cd if cd and cd > 0 else None
    ch = pv('AbilityCharges')
    ch = int(ch) if ch and ch > 1 else None

    ordered = []  # (pname, label_override)
    important, basic = [], []
    for sec in tt.get('m_vecAbilityInfoSections', []) or []:
        for blk in sec.get('m_vecAbilityPropertiesBlock', []) or []:
            for pr in blk.get('m_vecAbilityProperties', []) or []:
                if pr.get('m_bRequiresAbilityUpgrade'):
                    continue
                ip = pr.get('m_strImportantProperty')
                sv = pr.get('m_strStatusEffectValue')
                if ip and ip.startswith('StatusEffect'):
                    if sv:
                        lab = loc.get('Citadel_' + ip) or camel_words(ip[len('StatusEffect'):])
                        important.append((sv, lab))
                elif ip:
                    important.append((ip, None))
        for bp in sec.get('m_vecBasicProperties', []) or []:
            basic.append((bp, None))
    header = [(p, None) for p in (tt.get('m_vecAdditionalHeaderProperties') or [])]
    header += [(p, None) for p in HEADERISH]
    # untooltipped radius/range props: only if players can see a localized label for them
    radius_like = [(p, None) for p, v in props.items()
                   if re.search(r'Radius|Range', p) and p not in SKIP and label_of(p, v)[1]
                   and (num(v.get('m_strValue'))[1] or v.get('m_eDisplayUnits') == 'EDisplayUnit_Meters'
                        or v.get('m_strCSSClass') in ('distance', 'range', 'radius'))
                   and not re.search(r'Camera|Sound|Visual|Particle|Search|Override', p)]
    if ch:
        header.append(('AbilityCooldownBetweenCharge', None))
    ordered = important + header + radius_like + basic

    stats, seen, seen_lab = [], set(), set()
    for pname, lo in ordered:
        if pname in seen or pname in ('AbilityCooldown', 'AbilityCharges'):
            continue
        if pname in SKIP and lo is None:
            continue
        seen.add(pname)
        e = stat_entry(pname, props, lo)
        if not e:
            continue
        key = e['k'].lower()
        if key in seen_lab:
            continue
        seen_lab.add(key)
        stats.append(e)
        if len(stats) >= MAX_STATS:
            break

    # ---------- upgrades ----------
    ups = []
    cum = {n: prop_value(p)[0] for n, p in props.items()}
    for ti, u in enumerate(a.get('m_vecAbilityUpgrades', []) or [], 1):
        pus = u.get('m_vecPropertyUpgrades', []) or []
        bon, gen = {}, []
        for pu in pus:
            pn = pu.get('m_strPropertyName') or pu.get('m_StrPropertyNAme')
            b, had_m = num(pu.get('m_strBonus'))
            if pn is None or b is None:
                continue
            ut = pu.get('m_eUpgradeType', 'EAddToBase')
            prop = props.get(pn, {})
            tok = token_of(pn, prop)
            lab, _ = label_of(pn, prop)
            if ut == 'EAddToScale' or ut == 'EMultiplyScale':
                bon.setdefault(tok + '_scale', b); bon.setdefault(pn + '_scale', b)
                stat = SCALE_STAT.get(pu.get('m_eScaleStatFilter'), 'Spirit')
                if ut == 'EAddToScale':
                    gen.append('%s%s %s scaling on %s' % ('+' if b >= 0 else '', fmt(b), stat, lab))
                else:
                    gen.append('x%s %s scaling on %s' % (fmt(b), stat, lab))
                continue
            bon[tok] = b; bon[pn] = b
            unit = unit_of(pn, prop, had_m)
            if ut == 'EMultiplyBase':
                gen.append('x%s %s' % (fmt(b), lab))
                if cum.get(pn) is not None:
                    cum[pn] *= b
            else:
                gen.append('%s%s%s %s' % ('+' if b >= 0 else '', fmt(b), unit, lab))
                if pn in cum and cum[pn] is not None:
                    cum[pn] += b
                else:
                    cum[pn] = b
        text = None
        for key in ('%s_t%d_desc' % (aid, ti),):
            raw = loc.get(key)
            if not raw:
                continue
            ok = True

            def sub(m):
                nonlocal ok
                t = m.group(1)
                if t in bon:
                    return fmt(abs(bon[t])) if _neg_ctx(raw, m) else fmt(bon[t])
                # fall back to (upgraded) property value, by token name or override
                for pn, p in props.items():
                    if pn == t or p.get('m_strLocTokenOverride') == t:
                        if cum.get(pn) is not None:
                            return fmt(abs(cum[pn]) if _neg_ctx(raw, m) else cum[pn])
                ok = False
                return m.group(0)

            s = raw.replace('{s:hero_name}', hero_name) if hero_name else raw
            s = re.sub(r'\{s:([A-Za-z0-9_]+)\}', sub, s)
            s = re.sub(r"\{g:citadel_inline_attribute:'([A-Za-z0-9_]+)'\}",
                       lambda m: loc.get('InlineAttribute_' + m.group(1)).title()
                       if loc.get('InlineAttribute_' + m.group(1)) else m.group(0), s)
            if re.search(r'\{[a-z]:', s):
                ok = False
            if ok:
                s = strip_html(s).replace('+-', '-').replace('++', '+')
                text = s
        ups.append('T%d: %s' % (ti, text or ', '.join(gen) or '(no data)'))

    return {'cd': float(fmt(cd)) if cd else None, 'charges': ch, 'stats': stats, 'up': ups}


def _neg_ctx(raw, m):
    """template writes '-{s:X}' itself -> insert absolute value"""
    i = m.start()
    pre = re.sub(r'<[^>]+>$', '', raw[:i])
    while True:
        p2 = re.sub(r'<[^>]+>$', '', pre)
        if p2 == pre:
            break
        pre = p2
    return pre.endswith('-')


if __name__ == '__main__':
    hb = json.load(open(os.path.join(HERE, 'hero_base.json')))
    out, rep = {}, []
    for hid, h in hb.items():
        for nm, aid in h['ab']:
            r = build(aid, h.get('name', ''))
            for s in r['stats']:
                if not s.pop('_lab_ok'):
                    rep.append('unlocalized label: %s %s -> %s' % (aid, s['_p'], s['k']))
                s.pop('_p')
            out[aid] = r
    json.dump(out, open(os.path.join(HERE, 'abil_stats.json'), 'w'), indent=1, ensure_ascii=False)
    print('\n'.join(rep))
    print('entries', len(out))
