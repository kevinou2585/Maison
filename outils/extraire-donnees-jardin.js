const {chromium} = require('playwright'); const fs = require('fs');
(async () => {
  const br = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const c = await br.newContext({serviceWorkers: 'block'}); const p = await c.newPage();
  await p.goto('http://localhost:8765/maison/jardin/'); await p.waitForTimeout(1500);
  const noms = ['N','M','F','O','GO','OG','GC','RF','SV','TR','PGC','LG','VI','PM','PLT','CMC','CTT','SEED','ST1','ST2','FI','OI','AUTO'];
  const out = await p.evaluate(noms => { const o = {}; for (const n of noms) { try { const v = eval(n); o[n] = JSON.parse(JSON.stringify(v, (k, x) => x instanceof RegExp ? {re: x.source, f: x.flags} : x)); } catch (e) { o[n] = 'ERR ' + e.message; } } return o; }, noms);
  for (const n of noms) console.log(n, typeof out[n] === 'string' ? out[n] : (Array.isArray(out[n]) ? 'array ' + out[n].length : 'obj ' + Object.keys(out[n]).length), JSON.stringify(out[n]).length);
  fs.writeFileSync(__dirname + '/../donnees.json', JSON.stringify(out));
  await br.close();
})();
