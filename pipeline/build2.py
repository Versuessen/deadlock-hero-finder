import json,re,os
t=open('src/template2.html').read()
base=json.load(open('hero_base.json'))
edit=open('src/edit.js').read().replace('if (typeof module !== "undefined") module.exports = EDIT;','')
extra=open('src/extra.js').read()+'\n'+open('src/team.js').read()
model=re.sub(r'if \(typeof module !== "undefined"\) module\.exports = \{[^}]*\};','',open('src/model.js').read())
app=open('src/app2.js').read()
out=t.replace('/*__BASE__*/',json.dumps(base,ensure_ascii=False,separators=(',',':'))).replace('/*__EDIT__*/',edit).replace('/*__EXTRA__*/',extra).replace('/*__MODEL__*/',model).replace('/*__APP__*/',app)
assert '__' not in re.sub(r'__agentproxy','',out.split('<script>')[0]) 
def fix_html(seg):
    def style_fix(m):
        return re.sub(r'[^\x00-\x7f]', lambda c: '\\%X ' % ord(c.group()), m.group(0))
    seg=re.sub(r'<style>[\s\S]*?</style>', style_fix, seg)
    parts=re.split(r'(<style>[\s\S]*?</style>)', seg)
    return ''.join(p if p.startswith('<style>') else re.sub(r'[^\x00-\x7f]', lambda c: '&#x%X;' % ord(c.group()), p) for p in parts)
chunks=re.split(r'(<script>[\s\S]*?</script>)', out)
out=''.join(re.sub(r'[^\x00-\x7f]', lambda c: '\\u%04X' % ord(c.group()) if ord(c.group())<0x10000 else c.group(), c_) if c_.startswith('<script>') else fix_html(c_) for c_ in chunks)
assert all(ord(ch)<128 for ch in out), 'non-ascii left'
# artifact page: the host wraps it in a document skeleton
os.makedirs('artifact', exist_ok=True)
open('artifact/index.html','w').write(out)
# standalone site (GitHub / Vercel): a full document
SITE_URL = 'https://deadlock-soulmate.vercel.app/'
i = out.index('<div id="boot"')
head, body = out[:i], out[i:]
desc = re.search(r'<meta name="description" content="([^"]*)">', head).group(1)
meta = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="theme-color" content="#0b1413">\n<link rel="icon" type="image/png" href="favicon.png">\n'
        f'<meta property="og:type" content="website">\n<meta property="og:title" content="Deadlock Soulmate">\n'
        f'<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{SITE_URL}">\n'
        f'<meta property="og:image" content="{SITE_URL}og.jpg">\n<meta name="twitter:card" content="summary_large_image">\n')
full = '<!doctype html>\n<html lang="en">\n<head>\n' + meta + head.rstrip() + '\n</head>\n<body>\n' + body.rstrip() + '\n</body>\n</html>\n'
open('site/index.html','w').write(full)
print(len(out), len(full))
