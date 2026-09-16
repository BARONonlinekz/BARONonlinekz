// Подсчёт голосов опроса. Входные данные — только из переменных окружения,
// вариант берётся строго из белого списка.
const fs = require('fs');
// ключ: [название, цвет значка, логотип simple-icons]
const OPTIONS = {
  meta: ['Meta · Instagram / Facebook', '0467DF', 'meta'],
  tiktok: ['TikTok Ads', '000000', 'tiktok'],
  google: ['Google Ads', '4285F4', 'googleads'],
  youtube: ['YouTube Ads', 'FF0000', 'youtube'],
  linkedin: ['LinkedIn B2B', '0A66C2', 'linkedin'],
  telegram: ['Telegram Ads', '26A5E4', 'telegram'],
  x: ['X Ads', '000000', 'x'],
  reddit: ['Reddit Ads', 'FF4500', 'reddit'],
  pinterest: ['Pinterest Ads', 'BD081C', 'pinterest'],
  snapchat: ['Snapchat Ads', 'FFFC00', 'snapchat'],
  microsoft: ['Microsoft Ads', '00A4EF', ''],
  whatsapp: ['WhatsApp API', '25D366', 'whatsapp'],
};
const out = (k, v) => fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `${k}<<EOF\n${v}\nEOF\n`);
const esc = s => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));
const key = (process.env.ISSUE_TITLE || '').toLowerCase().replace(/^vote:\s*/, '').trim();
const user = process.env.ISSUE_USER || '';
const repo = process.env.GITHUB_REPOSITORY || 'BARONonlinekz/BARONonlinekz';
const db = fs.existsSync('poll.json') ? JSON.parse(fs.readFileSync('poll.json', 'utf8')) : { votes: {} };

let changed = false, message = '';
if (process.env.POLL_RENDER_ONLY) {
  changed = true;
} else if (!OPTIONS[key]) {
  message = 'Такого варианта нет — голос не засчитан. Выберите вариант кнопкой в профиле.';
} else {
  const before = db.votes[user];
  db.votes[user] = key; // один человек — один голос, повторный меняет выбор
  changed = true;
  message = before && before !== key
    ? `Голос изменён: ${OPTIONS[before][0]} → ${OPTIONS[key][0]}. Спасибо!`
    : `Голос засчитан: ${OPTIONS[key][0]}. Спасибо!`;
}

if (changed) {
  fs.writeFileSync('poll.json', JSON.stringify(db, null, 2) + '\n');
  const counts = Object.fromEntries(Object.keys(OPTIONS).map(k => [k, 0]));
  for (const v of Object.values(db.votes)) if (counts[v] !== undefined) counts[v]++;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const body = encodeURIComponent('Нажмите «Submit new issue» — голос посчитается автоматически, Issue закроется сам.');
  const rows = Object.entries(OPTIONS).map(([k, [label, color, logo]]) => {
    const n = counts[k];
    const pct = total ? Math.round((n / total) * 100) : 0;
    const filled = Math.round(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const lc = color === 'FFFC00' ? 'black' : 'white';
    const img = `https://img.shields.io/badge/${esc(label)}-${esc(`${n} · ${pct}%`)}-${color}?style=for-the-badge${logo ? `&logo=${logo}&logoColor=${lc}` : ''}`;
    const link = `https://github.com/${repo}/issues/new?title=vote%3A+${k}&body=${body}`;
    return `| <a href="${link}"><img src="${img}" alt="${label}: ${n}"/></a> | \`${bar}\` |`;
  });
  const table = [
    `**Какая площадка вам нужна?** Нажмите значок → «Submit new issue» — голос посчитается сам. Голосов: **${total}**`,
    '',
    '| Площадка | |',
    '|---|---|',
    ...rows,
  ].join('\n');
  const readme = fs.readFileSync('README.md', 'utf8');
  fs.writeFileSync('README.md', readme.replace(/(<!-- POLL:START -->)[\s\S]*?(<!-- POLL:END -->)/, `$1\n${table}\n$2`));
}
out('changed', String(changed && !process.env.POLL_RENDER_ONLY));
out('message', message);
