// Подсчёт голосов опроса. Входные данные — только из переменных окружения,
// вариант берётся строго из белого списка.
const fs = require('fs');
const OPTIONS = {
  meta: 'Meta · Instagram / Facebook',
  tiktok: 'TikTok',
  google: 'Google Ads',
  linkedin: 'LinkedIn B2B',
  whatsapp: 'WhatsApp API',
};
const out = (k, v) => fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<EOF\n${v}\nEOF\n`);
const title = (process.env.ISSUE_TITLE || '').toLowerCase();
const user = process.env.ISSUE_USER || '';
const key = title.replace(/^vote:\s*/, '').trim();

if (!OPTIONS[key]) {
  out('changed', 'false');
  out('message', 'Такого варианта нет — голос не засчитан. Выберите вариант кнопкой в профиле.');
  process.exit(0);
}

const db = fs.existsSync('poll.json') ? JSON.parse(fs.readFileSync('poll.json', 'utf8')) : { votes: {} };
const before = db.votes[user];
db.votes[user] = key; // один человек — один голос, повторный меняет выбор
fs.writeFileSync('poll.json', JSON.stringify(db, null, 2) + '\n');

const counts = Object.fromEntries(Object.keys(OPTIONS).map(k => [k, 0]));
for (const v of Object.values(db.votes)) if (counts[v] !== undefined) counts[v]++;
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const repo = process.env.GITHUB_REPOSITORY;
const body = encodeURIComponent('Нажмите «Submit new issue» — голос посчитается автоматически, Issue закроется сам.');

const rows = Object.entries(OPTIONS).map(([k, label]) => {
  const n = counts[k];
  const pct = total ? Math.round((n / total) * 100) : 0;
  const filled = Math.round(pct / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const link = `https://github.com/${repo}/issues/new?title=vote%3A+${k}&body=${body}`;
  return `| [\`▶ ${label}\`](${link}) | \`${bar}\` | ${n} · ${pct}% |`;
});
const table = [
  '**Какая площадка вам нужна?** Нажмите вариант → «Submit new issue». Голосов: ' + total,
  '',
  '| Вариант | | Голоса |',
  '|---|---|---|',
  ...rows,
].join('\n');

const readme = fs.readFileSync('README.md', 'utf8');
const re = /(<!-- POLL:START -->)[\s\S]*?(<!-- POLL:END -->)/;
fs.writeFileSync('README.md', readme.replace(re, `$1\n${table}\n$2`));

out('changed', 'true');
out('message', before && before !== key
  ? `Голос изменён: ${OPTIONS[before]} → ${OPTIONS[key]}. Спасибо!`
  : `Голос засчитан: ${OPTIONS[key]}. Спасибо!`);
