// Сверяет цифры профиля с сайтом biz-com.kz и обновляет их в шапке и README.
// Если на сайте цифру найти не удалось — ничего не трогает.
const fs = require('fs');
const out = (k, v) => fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `${k}=${v}\n`);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

(async () => {
  const html = process.env.SITE_HTML_FILE
    ? fs.readFileSync(process.env.SITE_HTML_FILE, 'utf8')
    : await (await fetch('https://biz-com.kz/', { headers: { 'user-agent': 'barononlinekz-profile-sync' } })).text();
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ').replace(/\s+/g, ' ');

  const found = {
    years: (text.match(/(\d{1,2})\s*лет в рекламе/i) || [])[1],
    certs: (text.match(/(\d{1,3})\s*сертификат\S*\s*Anthropic/i) || [])[1],
    start: ((text.match(/СТАРТ\s*·\s*ОТ\s*([\d ]+?)\s*₸/i) || [])[1] || '').replace(/\s/g, ''),
  };
  const state = JSON.parse(fs.readFileSync('site-state.json', 'utf8'));
  const files = ['README.md', 'assets/header.svg', 'assets/header-light.svg', 'assets/acc-certs-main.svg'];
  const rules = {
    years: (o, n) => [[`опыт: ${o} лет в рекламе`, `опыт: ${n} лет в рекламе`], [`${o} лет в рекламе`, `${n} лет в рекламе`]],
    certs: (o, n) => [[`сертификатов Anthropic: ${o}`, `сертификатов Anthropic: ${n}`], [`${o} · Anthropic`, `${n} · Anthropic`], [`${o} сертификат Anthropic`, `${n} сертификат Anthropic`], [encodeURIComponent(`${o} сертификат Anthropic`), encodeURIComponent(`${n} сертификат Anthropic`)]],
    start: (o, n) => [[`от ${fmt(o)} ₸`, `от ${fmt(n)} ₸`]],
  };

  let changed = [];
  for (const key of Object.keys(rules)) {
    const n = found[key];
    if (!n || !/^\d+$/.test(n) || n === String(state[key])) continue;
    const pairs = rules[key](state[key], n);
    for (const f of files) {
      let s = fs.readFileSync(f, 'utf8');
      for (const [a, b] of pairs) s = s.split(a).join(b);
      fs.writeFileSync(f, s);
    }
    changed.push(`${key}: ${state[key]} → ${n}`);
    state[key] = n;
  }
  fs.writeFileSync('site-state.json', JSON.stringify(state, null, 2) + '\n');
  console.log('На сайте найдено:', found, '\nИзменено:', changed.length ? changed : 'ничего');
  out('changed', changed.length ? 'true' : 'false');
  out('summary', changed.join('; ') || 'без изменений');
})().catch(e => { console.error(e); out('changed', 'false'); });
