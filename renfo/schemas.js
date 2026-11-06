// Renfo — schémas des exercices.
// Un personnage dessiné en SVG (vu de profil ou de face), posé dans des positions clés,
// et animé en douceur d'une position à l'autre. Les objets (ballon, élastique, banc…) sont dessinés autour.
(function () {
'use strict';
const RAD = Math.PI / 180;
const dir = a => [Math.sin(a * RAD), Math.cos(a * RAD)];          // 0 = vers le bas, 90 = vers l'avant (droite), 180 = vers le haut
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = v => Math.hypot(v[0], v[1]);
const lerp = (a, b, t) => a + (b - a) * t;
const f = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
const n1 = v => +v.toFixed(1);
const avant = d => [d[1], -d[0]];                                    // normale « devant » d'un membre (personnage tourné vers la droite)

// Contour lisse fermé passant par les points (Catmull-Rom → Bézier)
function lisse(P) {
  const n = P.length; let s = 'M' + f(P[0]);
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    s += 'C' + f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + f(p2);
  }
  return s + 'Z';
}
// Courbe ouverte lisse
function courbe(P) {
  if (P.length === 2) return 'M' + f(P[0]) + 'L' + f(P[1]);
  let s = 'M' + f(P[0]);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    s += 'C' + f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + f(p2);
  }
  return s;
}

// Un segment du corps : profil [t, rayon devant, rayon derrière] le long de l'os
function forme(p, a, L, prof, sens = 1, caps = 3, courb = 0) {
  const d = dir(a), nv = avant(d).map(x => x * sens), F = [], B = [];
  // courb : le dos s'arrondit (>0, vers l'arrière) ou se creuse (<0)
  const ctr = t => add(add(p, d, L * t), nv, -courb * Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
  prof.forEach(([t, rf, rb]) => { const c = ctr(t); F.push(add(c, nv, rf)); B.push(add(c, nv, -rb)); });
  const [t0, f0, b0] = prof[0], [t1, f1, b1] = prof[prof.length - 1];
  const c0 = ctr(t0), c1 = ctr(t1), r0 = (f0 + b0) / 2, r1 = (f1 + b1) / 2;
  // caps : 1 = bout arrondi au début, 2 = à la fin, 3 = les deux ; sinon bord coupé droit (ourlet)
  const capF = caps & 2 ? [add(add(c1, nv, f1 * .72), d, r1 * .7), add(c1, d, r1), add(add(c1, nv, -b1 * .72), d, r1 * .7)]
    : [add(c1, nv, f1 * .5), add(c1, nv, (f1 - b1) / 2 * 0), add(c1, nv, -b1 * .5)];
  const capD = caps & 1 ? [add(add(c0, nv, -b0 * .72), d, -r0 * .7), add(c0, d, -r0), add(add(c0, nv, f0 * .72), d, -r0 * .7)]
    : [add(c0, nv, -b0 * .5), c0, add(c0, nv, f0 * .5)];
  return F.concat(capF, B.reverse(), capD);
}
const coupe = (prof, a, b) => prof.filter(x => x[0] >= a - 1e-6 && x[0] <= b + 1e-6);
const gonfle = (prof, k) => prof.map(([t, r1, r2]) => [t, r1 + k, r2 + k]);

// ---------- Proportions (≈ 1 unité = 1 cm, homme d'1,80 m) ----------
const LG = {tr: 54, ep: 46, bh: 30, ab: 26, ma: 16, cu: 45, ja: 44, cou: 17};
const P_COTE = {
  tronc: [[-.26, 5, 8], [-.13, 9.5, 12.5], [.03, 10.5, 11.5], [.13, 10.4, 10.2], [.22, 10.2, 9.6], [.38, 10.4, 8.4], [.6, 12.4, 10], [.78, 12.8, 11.2], [.92, 11, 10.6], [1.0, 7.5, 7.8]],
  cu: [[-.04, 8.5, 9.5], [.05, 8.8, 9.7], [.14, 9, 9.8], [.5, 8.2, 7.6], [.84, 6.4, 6], [1, 5.6, 5.4]],
  ja: [[0, 5.4, 5.4], [.18, 5.2, 7.2], [.42, 4.6, 6.4], [.78, 3.5, 3.7], [1, 3.4, 3.4]],
  bh: [[0, 5.6, 5.4], [.12, 6.2, 6], [.48, 5.1, 5.3], [.86, 4.1, 4.1], [1, 3.9, 3.9]],
  ab: [[0, 3.9, 3.9], [.24, 4.5, 4.3], [.78, 2.9, 2.9], [1, 2.6, 2.6]],
  ma: [[0, 2.7, 2.6], [.36, 3.9, 3.1], [.78, 3.2, 2.6], [1, 1.8, 1.6]],
  poing: [[0, 2.8, 2.8], [.5, 4.4, 4.2], [1, 3.6, 3.6]]
};
const P_FACE = {
  tronc: [[-.2, 11, 11], [-.1, 16.5, 16.5], [.04, 17, 17], [.13, 16.2, 16.2], [.36, 15, 15], [.62, 17, 17], [.8, 19, 19], [.9, 20, 20], [.97, 17, 17], [1.02, 8, 8]],
  cu: [[-.04, 8.4, 8.4], [.05, 8.5, 8.5], [.16, 8.6, 8.6], [.5, 7.4, 7.4], [.55, 7.2, 7.2], [.86, 5.6, 5.6], [1, 5.2, 5.2]],
  ja: [[0, 5.2, 5.2], [.22, 6.2, 6.2], [.5, 5, 5], [.8, 3.7, 3.7], [1, 3.4, 3.4]],
  bh: [[0, 5.8, 5.8], [.14, 6.2, 6.2], [.5, 5.1, 5.1], [.86, 4.1, 4.1], [1, 3.9, 3.9]],
  ab: P_COTE.ab, ma: P_COTE.ma, poing: P_COTE.poing
};
const COUL = {
  peau: ['#f2c3a0', '#dca684', '#a8714f'], cheveux: ['#3b2b22', '#2a1e18'],
  haut: ['#2f7fd6', '#2462ac', '#1a4b85'], short: ['#353b4c', '#2a2f3c', '#1e222c'],
  chaussure: ['#ffffff', '#e2e6ec', '#8a93a3'], semelle: '#ff7a3d', chaussette: '#f4f6f8'
};

// ---------- Squelette ----------
// Pose : x, y (bassin), t (tronc), h (tête), b1/b2 = [bras, avant-bras, main], j1/j2 = [cuisse, jambe, pied]
// b1/j1 = côté proche (profil) ou côté gauche de l'image (face).
function squelette(P, vue) {
  const J = {}, td = dir(P.t), dv = avant(td).map(x => -x), ls = P.ls || {};
  const L = k => LG[k] * (ls[k] == null ? 1 : ls[k]);
  J.bassin = [P.x, P.y]; J.td = td; J.ventre = dv;
  J.cou = add(J.bassin, td, L('tr'));
  const epC = add(J.bassin, td, LG.ep * (ls.tr == null ? 1 : ls.tr));
  if (vue === 'face') {
    const lat = avant(td);
    J.hanche1 = add(J.bassin, lat, 9.5); J.hanche2 = add(J.bassin, lat, -9.5);
    J.epaule1 = add(epC, lat, 16.5); J.epaule2 = add(epC, lat, -16.5);
  } else {
    J.hanche1 = add(J.bassin, dv, .5); J.hanche2 = add(J.bassin, dv, -1);
    J.epaule1 = add(epC, dv, .5); J.epaule2 = add(epC, dv, -2.5);
  }
  J.tete = add(J.cou, dir(P.h == null ? P.t : P.h), L('cou'));
  [1, 2].forEach(i => {
    const b = P['b' + i] || [0, 0], j = P['j' + i] || [0, 0, 90], s = i === 1 ? '1' : '2';
    J['coude' + s] = add(J['epaule' + s], dir(b[0]), L('bh') * (ls['bh' + s] == null ? 1 : ls['bh' + s]));
    J['poignet' + s] = add(J['coude' + s], dir(b[1]), L('ab') * (ls['ab' + s] == null ? 1 : ls['ab' + s]));
    J['main' + s] = add(J['poignet' + s], dir(b[2] == null ? b[1] : b[2]), 13 * (ls['ma' + s] == null ? 1 : ls['ma' + s]));
    J['genou' + s] = add(J['hanche' + s], dir(j[0]), L('cu') * (ls['cu' + s] == null ? 1 : ls['cu' + s]));
    J['cheville' + s] = add(J['genou' + s], dir(j[1]), L('ja') * (ls['ja' + s] == null ? 1 : ls['ja' + s]));
    J['orteil' + s] = add(J['cheville' + s], dir(j[2] == null ? 90 : j[2]), 20 * (ls['pi' + s] == null ? 1 : ls['pi' + s]));
  });
  return J;
}

// ---------- Dessin du personnage ----------
const chemin = (d, fill, st, w = 1.3) => `<path d="${d}" fill="${fill}"${st ? ` stroke="${st}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`;
// Groupe de formes avec un seul contour (pas de couture aux articulations)
const groupe = (formes, fill, st, w = 2.6) => formes.map(d => `<path d="${d}" fill="none" stroke="${st}" stroke-width="${w}" stroke-linejoin="round"/>`).join('') + formes.map(d => `<path d="${d}" fill="${fill}"/>`).join('');

function chaussure(J, s, P, vue, loin) {
  const a = (P['j' + s] || [0, 0, 90])[2], ch = J['cheville' + s], c = COUL.chaussure;
  const fill = loin ? c[1] : c[0], ls = (P.ls || {})['pi' + s];
  const k = ls == null ? 1 : ls;
  if (vue === 'face' && !P['pied' + s]) {
    // pied vu de face : chaussure ramassée sous la cheville
    const d = dir(a), nv = avant(d);
    const g = (u, v) => add(add(ch, d, u * k), nv, v);
    const pts = [g(-3, 4.3), g(2, 5.4), g(8, 5.6), g(12, 3.6), g(12.5, 0), g(12, -3.6), g(8, -5.6), g(2, -5.4), g(-3, -4.3)];
    return chemin(lisse(pts), fill, c[2], 1.2) + chemin(courbe([g(9.5, 4.6), g(11.8, 0), g(9.5, -4.6)]), 'none', COUL.semelle, 1.6);
  }
  const d = dir(a), so = avant(d).map(x => -x); // so = côté semelle
  const g = (u, v) => add(add(ch, d, u * k), so, v);
  const pts = [g(-3.5, -4.5), g(-6.5, .5), g(-6, 5.5), g(4, 6.5), g(17, 6.5), g(22, 4.5), g(21.5, 1), g(14, -1.6), g(6, -4.2), g(2.5, -6)];
  return chemin(courbe([g(-2.6, -5.6), g(.5, -7), g(3, -6.4)]), 'none', COUL.chaussette, 3.4) +
    chemin(lisse(pts), fill, c[2], 1.2) +
    chemin(courbe([g(-6.1, 4.6), g(4, 6.4), g(17, 6.3), g(21.6, 4)]), 'none', COUL.semelle, 1.8) +
    chemin(courbe([g(5, -3.4), g(9, -2.4), g(12.5, -1.2)]), 'none', c[2], .8);
}

function tete(J, P, vue, opts) {
  const h = P.h == null ? P.t : P.h, d = dir(h), fr = avant(d).map(x => -x), c = J.tete;
  const g = (u, v) => add(add(c, fr, u), d, v);
  const pk = COUL.peau, ch = COUL.cheveux;
  if (vue === 'face') {
    const lat = avant(d), gg = (u, v) => add(add(c, lat, u), d, v);
    const vis = [gg(0, -11.5), gg(5.5, -9.5), gg(8, -4), gg(8.4, 2.5), gg(6.5, 8.5), gg(0, 11.2), gg(-6.5, 8.5), gg(-8.4, 2.5), gg(-8, -4), gg(-5.5, -9.5)];
    const cheveux = [gg(-8.6, 2), gg(-8.4, 7), gg(-5.5, 11), gg(0, 12.4), gg(5.5, 11), gg(8.4, 7), gg(8.6, 2), gg(7.4, 4.6), gg(3, 7.6), gg(-3, 7.6), gg(-7.4, 4.6)];
    if (P.dos) return chemin(lisse([gg(-8.2, 1.5), gg(-10.2, .5), gg(-10, -3.5), gg(-7.8, -4.5)]), pk[1], pk[2], 1) +
      chemin(lisse([gg(8.2, 1.5), gg(10.2, .5), gg(10, -3.5), gg(7.8, -4.5)]), pk[1], pk[2], 1) +
      chemin(lisse(vis), pk[0], pk[2], 1.3) + chemin(lisse([gg(-8.6, 0), gg(-8.4, 7), gg(-5.5, 11), gg(0, 12.4), gg(5.5, 11), gg(8.4, 7), gg(8.6, 0), gg(7.6, -5), gg(4, -8.2), gg(0, -8.8), gg(-4, -8.2), gg(-7.6, -5)]), ch[0], ch[1], 1.1);
    return chemin(lisse([gg(-8.2, 1.5), gg(-10.2, .5), gg(-10, -3.5), gg(-7.8, -4.5)]), pk[1], pk[2], 1) +
      chemin(lisse([gg(8.2, 1.5), gg(10.2, .5), gg(10, -3.5), gg(7.8, -4.5)]), pk[1], pk[2], 1) +
      chemin(lisse(vis), pk[0], pk[2], 1.3) + chemin(lisse(cheveux), ch[0], ch[1], 1.1);
  }
  // profil, visage vers « fr »
  const crane = [g(-9.6, 1), g(-9, 7.4), g(-4.5, 11.6), g(2.5, 11.8), g(7.8, 8.4), g(9.4, 3.6), g(9.6, 1.5), g(11.6, -1.4), g(10, -2.6), g(9.7, -4.6), g(9.9, -5.6), g(8.8, -6.6), g(8.2, -9.4), g(4.5, -10.6), g(-.5, -8.6), g(-4, -6.6)];
  const cheveux = [g(-10.2, .6), g(-9.8, 7.8), g(-4.8, 12.6), g(3, 12.8), g(8.4, 9.4), g(9.2, 6.4), g(5.8, 7.4), g(1.5, 7), g(-2, 5.2), g(-4.6, 2.4), g(-6.8, -1.2), g(-8.6, -3)];
  return chemin(lisse(crane), pk[0], pk[2], 1.3) +
    chemin(lisse(cheveux), ch[0], ch[1], 1.1) +
    chemin(lisse([g(-3.2, 2.2), g(-1.2, 2.6), g(-.6, -1), g(-2, -2.8), g(-3.6, -1)]), pk[1], pk[2], .9) +
    `<circle cx="${n1(g(6.6, 1.6)[0])}" cy="${n1(g(6.6, 1.6)[1])}" r="1" fill="#2a1e18"/>` +
    chemin(courbe([g(5.2, 3.6), g(7, 4.1), g(8.6, 3.6)]), 'none', ch[1], 1.1);
}

function bras(J, s, P, vue, loin) {
  const b = P['b' + s] || [0, 0], pr = vue === 'face' ? P_FACE : P_COTE, ls = P.ls || {};
  const k = (n) => LG[n] * (ls[n + s] == null ? 1 : ls[n + s]) * (n === 'bh' || n === 'ab' ? 1 : 1);
  const pk = COUL.peau, hc = COUL.haut, fill = loin ? pk[1] : pk[0], hf = loin ? hc[1] : hc[0];
  const main = (P['m' + s] || '') === 'poing' ? forme(J['poignet' + s], b[2] == null ? b[1] : b[2], 8, pr.poing) : forme(J['poignet' + s], b[2] == null ? b[1] : b[2], LG.ma * (ls['ma' + s] == null ? 1 : ls['ma' + s]), pr.ma);
  const bh = forme(J['epaule' + s], b[0], k('bh'), pr.bh), ab = forme(J['coude' + s], b[1], k('ab'), pr.ab);
  return groupe([lisse(main), lisse(ab), lisse(bh)], fill, pk[2]) +
    chemin(lisse(forme(J['epaule' + s], b[0], k('bh'), gonfle(coupe(pr.bh, 0, .48), .7), 1, 1)), hf, hc[2], 1.2);
}

function jambe(J, s, P, vue, loin, avecShort) {
  const j = P['j' + s] || [0, 0, 90], pr = vue === 'face' ? P_FACE : P_COTE, ls = P.ls || {};
  const k = n => LG[n] * (ls[n + s] == null ? 1 : ls[n + s]);
  const pk = COUL.peau, sh = COUL.short, fill = loin ? pk[1] : pk[0];
  const cu = forme(J['hanche' + s], j[0], k('cu'), pr.cu), ja = forme(J['genou' + s], j[1], k('ja'), pr.ja);
  return groupe([lisse(ja), lisse(cu)], fill, pk[2]) +
    (avecShort ? chemin(lisse(pieceShort(J, s, P, vue)), loin ? sh[1] : sh[0], sh[2], 1.1) : '') +
    ((P.cache || []).includes('pied' + s) ? '' : chaussure(J, s, P, vue, loin));
}
const pieceShort = (J, s, P, vue) => { const pr = vue === 'face' ? P_FACE : P_COTE, ls = P.ls || {}, j = P['j' + s] || [0, 0, 90];
  return forme(J['hanche' + s], j[0], LG.cu * (ls['cu' + s] == null ? 1 : ls['cu' + s]), gonfle(coupe(pr.cu, .05, .5), .8), 1, 0); };
// Le short d'un seul tenant (bassin + haut des cuisses), sans couture intérieure
function short(J, P, vue, cuisses) {
  const sh = COUL.short, sens = vue === 'face' ? 1 : -1, L = LG.tr * ((P.ls || {}).tr == null ? 1 : P.ls.tr), v = vue === 'face' ? 0 : (P.v || 0);
  const formes = [lisse(forme(J.bassin, P.t, L, coupe(profTronc(P, vue), -.3, .34), sens, 1, v))].concat(cuisses.map(c => lisse(pieceShort(J, c, P, vue))));
  return groupe(formes, sh[0], sh[2], 2.4);
}
// Profil du tronc avec le ventre qui respire (P.ve) et le dos arrondi (P.v)
function profTronc(P, vue) {
  const pr = vue === 'face' ? P_FACE : P_COTE, ve = P.ve || 0;
  if (!ve || vue === 'face') return pr.tronc;
  return pr.tronc.map(([t, a, b]) => [t, a + ve * Math.max(0, Math.sin(Math.PI * (t - .05) / .5)) * (t > .05 && t < .55 ? 1 : 0), b]);
}
function tronc(J, P, vue) {
  const pr = vue === 'face' ? P_FACE : P_COTE, pk = COUL.peau, hc = COUL.haut, sh = COUL.short;
  const sens = vue === 'face' ? 1 : -1, L = LG.tr * ((P.ls || {}).tr == null ? 1 : P.ls.tr);
  const cou = forme(J.cou, P.h == null ? P.t : P.h, 12, [[-.3, 5.2, 5.4], [1, 4.6, 4.8]], sens);
  let s = chemin(lisse(cou), pk[0], pk[2], 1.3);
  const pt = profTronc(P, vue), v = vue === 'face' ? 0 : (P.v || 0);
  s += chemin(lisse(forme(J.bassin, P.t, L, gonfle(coupe(pt, .13, 1.02), .3), sens, 2, v)), hc[0], hc[2], 1.3);
  // col
  const col = add(J.cou, J.td, -1.5), nv = vue === 'face' ? avant(J.td) : J.ventre;
  if (vue === 'face') { if (!P.dos) s += chemin(courbe([add(col, nv, 6), add(add(col, nv, 0), J.td, -4.5), add(col, nv, -6)]), 'none', hc[2], 1.2); }
  else s += chemin(courbe([add(col, nv, 7.4), add(add(col, nv, 2), J.td, -1.2), add(col, nv, -5.5)]), 'none', hc[2], 1.1);
  return s;
}

function personnage(P, vue, milieu = '') {
  const J = squelette(P, vue);
  const parts = {
    bras2: () => bras(J, '2', P, vue, vue !== 'face'), bras1: () => bras(J, '1', P, vue, false),
    jambe2: () => jambe(J, '2', P, vue, vue !== 'face', vue !== 'face'), jambe1: () => jambe(J, '1', P, vue, false, P.cuisseDevant),
    short: () => short(J, P, vue, vue === 'face' ? ['1', '2'] : P.cuisseDevant ? [] : ['1']),
    tronc: () => tronc(J, P, vue), tete: () => tete(J, P, vue), milieu: () => milieu
  };
  const ordre = P.ordre || (vue === 'face' ? ['milieu', 'jambe1', 'jambe2', 'short', 'tronc', 'tete', 'bras1', 'bras2']
    : P.cuisseDevant ? ['bras2', 'jambe2', 'milieu', 'short', 'tronc', 'tete', 'jambe1', 'bras1'] : ['bras2', 'jambe2', 'milieu', 'jambe1', 'short', 'tronc', 'tete', 'bras1']);
  const svg = ordre.map(k => parts[k]()).join('');
  return {svg, J};
}

// Points du contour (pour cadrer et poser au sol)
function contour(P, vue) {
  const J = squelette(P, vue), pr = vue === 'face' ? P_FACE : P_COTE, pts = [];
  pts.push(...forme(J.bassin, P.t, LG.tr * ((P.ls || {}).tr == null ? 1 : P.ls.tr), profTronc(P, vue), vue === 'face' ? 1 : -1, 3, vue === 'face' ? 0 : (P.v || 0)));
  const ls = P.ls || {};
  [1, 2].forEach(i => {
    const b = P['b' + i] || [0, 0], j = P['j' + i] || [0, 0, 90];
    const k = n => LG[n] * (ls[n + i] == null ? 1 : ls[n + i]);
    pts.push(...forme(J['epaule' + i], b[0], k('bh'), pr.bh), ...forme(J['coude' + i], b[1], k('ab'), pr.ab), ...forme(J['poignet' + i], b[2] == null ? b[1] : b[2], LG.ma, pr.ma));
    pts.push(...forme(J['hanche' + i], j[0], k('cu'), pr.cu), ...forme(J['genou' + i], j[1], k('ja'), pr.ja));
    const a = j[2] == null ? 90 : j[2], d = dir(a), so = avant(d).map(x => -x), ch = J['cheville' + i];
    if (vue === 'face') pts.push(add(ch, d, 12.5), add(add(ch, d, 8), avant(d), 5.6), add(add(ch, d, 8), avant(d), -5.6));
    else pts.push(add(add(ch, d, -6), so, 5.5), add(add(ch, d, 17), so, 6.5), add(add(ch, d, 22), so, 4.5));
  });
  const h = dir(P.h == null ? P.t : P.h);
  for (let a = 0; a < 360; a += 30) pts.push(add(J.tete, [Math.cos(a * RAD), Math.sin(a * RAD)], 12));
  pts.push(add(J.tete, avant(h).map(x => -x), vue === 'face' ? 10 : 12));
  return {pts, J};
}

// Pose au sol automatiquement (le point le plus bas touche le sol y = 0)
function prepare(P, vue) {
  const Q = Object.assign({}, P);
  if (Q.cale) { const J = squelette(Q, vue); Q.y += Q.cale[1] - J[Q.cale[0]][1]; if (Q.cale[2] != null) Q.x += Q.cale[2] - J[Q.cale[0]][0]; }
  else if (Q.sol !== false && !prepare.dessus) { const {pts} = contour(Q, vue); const m = Math.max(...pts.map(p => p[1])); Q.y = Q.y - m + (Q.sol || 0); }
  return Q;
}
// Interpolation entre deux poses
const angle = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };
function melange(A, B, t) {
  const R = Object.assign({}, A, t > .5 ? {ordre: B.ordre, m1: B.m1, m2: B.m2} : {});
  R.x = lerp(A.x, B.x, t); R.y = lerp(A.y, B.y, t); R.t = angle(A.t, B.t, t);
  R.h = angle(A.h == null ? A.t : A.h, B.h == null ? B.t : B.h, t);
  ['b1', 'b2', 'j1', 'j2'].forEach(k => {
    const a = A[k] || (k[0] === 'b' ? [0, 0] : [0, 0, 90]), b = B[k] || (k[0] === 'b' ? [0, 0] : [0, 0, 90]);
    R[k] = [...Array(Math.max(3, a.length, b.length)).keys()].map(i => i === 1 && a.length > 3 || i === 3 ? lerp(a[i], b[i], t) : angle(a[i] == null ? a[1] : a[i], b[i] == null ? b[1] : b[i], t));
  });
  if (A.ls || B.ls) {
    R.ls = {}; const ks = new Set(Object.keys(A.ls || {}).concat(Object.keys(B.ls || {})));
    ks.forEach(k => { const a = (A.ls || {})[k], b = (B.ls || {})[k]; R.ls[k] = lerp(a == null ? 1 : a, b == null ? 1 : b, t); });
  }
  ['v', 've'].forEach(k => { if (A[k] != null || B[k] != null) R[k] = lerp(A[k] || 0, B[k] || 0, t); });
  return R;
}

// ---------- Objets ----------
const O = {
  ombre: (x, w, y = 0) => `<ellipse cx="${n1(x)}" cy="${n1(y + 1.2)}" rx="${n1(w)}" ry="3.2" fill="#1d2b3a" opacity=".13"/>`,
  tapis: (x0, x1) => `<rect x="${x0}" y="-.6" width="${x1 - x0}" height="5" rx="2.5" fill="#9fd4c2" stroke="#6fb39c" stroke-width="1"/>`,
  klein: (c, r = 32) => `<g><ellipse cx="${n1(c[0])}" cy="${n1(c[1] + r + 1)}" rx="${n1(r * .8)}" ry="3.6" fill="#1d2b3a" opacity=".16"/>
    <circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}" fill="url(#g-klein)" stroke="#6b3fae" stroke-width="1.3"/>
    <path d="M${n1(c[0] - r * .92)} ${n1(c[1] + r * .2)}Q${n1(c[0])} ${n1(c[1] + r * .62)} ${n1(c[0] + r * .92)} ${n1(c[1] + r * .2)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/>
    <ellipse cx="${n1(c[0] - r * .38)}" cy="${n1(c[1] - r * .42)}" rx="${n1(r * .3)}" ry="${n1(r * .18)}" fill="#fff" opacity=".45" transform="rotate(-35 ${n1(c[0] - r * .38)} ${n1(c[1] - r * .42)})"/></g>`,
  foot: (c, r = 11) => `<g><circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}" fill="#fff" stroke="#30343c" stroke-width="1.2"/>
    <path d="M${n1(c[0])} ${n1(c[1] - r * .38)}l${n1(r * .36)} ${n1(r * .26)}l${n1(-r * .14)} ${n1(r * .42)}h${n1(-r * .44)}l${n1(-r * .14)} ${n1(-r * .42)}z" fill="#30343c"/>
    <path d="M${n1(c[0] - r * .95)} ${n1(c[1] - r * .1)}l${n1(r * .3)} ${n1(-r * .1)}M${n1(c[0] + r * .95)} ${n1(c[1] - r * .1)}l${n1(-r * .3)} ${n1(-r * .1)}M${n1(c[0] - r * .55)} ${n1(c[1] + r * .8)}l${n1(r * .2)} ${n1(-r * .25)}M${n1(c[0] + r * .55)} ${n1(c[1] + r * .8)}l${n1(-r * .2)} ${n1(-r * .25)}M${n1(c[0])} ${n1(c[1] - r)}v${n1(r * .62)}" stroke="#30343c" stroke-width="1"/></g>`,
  marche: (x0, x1, h = 18) => `<g><path d="M${x0} 0V${-h}h${x1 - x0}V0Z" fill="#cfd6df" stroke="#8d98a8" stroke-width="1.2"/><path d="M${x0} ${-h}h${x1 - x0}" stroke="#a9b3c1" stroke-width="3"/></g>`,
  banc: (x0, x1, h = 45) => `<g stroke="#8a5a2b" stroke-width="1.2"><rect x="${x0 + 4}" y="${-h + 5}" width="5" height="${h - 5}" fill="#b07a45"/><rect x="${x1 - 9}" y="${-h + 5}" width="5" height="${h - 5}" fill="#b07a45"/><rect x="${x0}" y="${-h}" width="${x1 - x0}" height="7" rx="2" fill="#d39a5c"/></g>`,
  // banc vu par le bout (perspective)
  bancBout: (x, h = 45, w = 26) => `<g stroke="#8a5a2b" stroke-width="1.2"><path d="M${x - w / 2 + 3} ${-h + 6}v${h - 6}h5v${-h + 6}zM${x + w / 2 - 8} ${-h + 6}v${h - 6}h5v${-h + 6}z" fill="#9c6a3a"/><path d="M${x - w / 2} ${-h}l7 -9h${w}l-7 9z" fill="#e2ad70"/><rect x="${x - w / 2}" y="${-h}" width="${w}" height="7" fill="#c98c4f"/></g>`,
  chaise: (x, sens = 1, h = 45) => { const s = sens; return `<g stroke="#6e4f36" stroke-width="1.3" fill="#8a6447"><rect x="${x - 21 * (s > 0 ? 1 : 0) - (s > 0 ? 0 : -1) * 0}" y="${-h}" width="42" height="5" rx="2" transform="translate(${s > 0 ? 0 : -42} 0)"/>` +
    `<rect x="${s > 0 ? x - 19 : x - 19 - 42 + 38}" y="${-h + 5}" width="4" height="${h - 5}"/><rect x="${s > 0 ? x + 15 : x + 15 - 42 + 4}" y="${-h + 5}" width="4" height="${h - 5}"/><rect x="${s > 0 ? x + 15 : x - 19 - 42 + 38}" y="${-h - 40}" width="4" height="40"/></g>`; },
  canape: (x0, x1, h = 42) => `<g stroke="#5f6b7d" stroke-width="1.3"><rect x="${x0}" y="${-h}" width="${x1 - x0}" height="${h - 6}" rx="6" fill="#8e9bb0"/><rect x="${x0 + 2}" y="${-h - 6}" width="${x1 - x0 - 4}" height="12" rx="6" fill="#a7b3c6"/><rect x="${x0 + 4}" y="-6" width="6" height="6" fill="#5f6b7d"/><rect x="${x1 - 10}" y="-6" width="6" height="6" fill="#5f6b7d"/></g>`,
  mur: (x, sens = 1, h = 220) => `<g><rect x="${sens > 0 ? x : x - 30}" y="${-h}" width="30" height="${h}" fill="#dde3ea"/><path d="M${x} ${-h}V0" stroke="#aeb8c5" stroke-width="2"/></g>`,
  porte: (x, h = 205) => `<g><rect x="${x - 3}" y="${-h}" width="6" height="${h}" fill="#d9c09a" stroke="#a98a5f" stroke-width="1.2"/><rect x="${x - 6}" y="${-h - 6}" width="12" height="6" fill="#c7a878" stroke="#a98a5f" stroke-width="1.2"/></g>`,
  poteau: (x, h = 30) => `<g><rect x="${x - 3}" y="${-h}" width="6" height="${h}" rx="2" fill="#8d98a8" stroke="#5f6b7d" stroke-width="1"/><rect x="${x - 9}" y="-3" width="18" height="3" rx="1.5" fill="#5f6b7d"/></g>`,
  elastique: (a, b, sag = 3) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag]; return `<path d="M${f(a)}Q${f(m)} ${f(b)}" fill="none" stroke="#e5484d" stroke-width="3" stroke-linecap="round"/><circle cx="${n1(a[0])}" cy="${n1(a[1])}" r="2.6" fill="#b3282d"/>`; },
  baton: (a, b) => `<path d="M${f(a)}L${f(b)}" stroke="#a87a45" stroke-width="3.6" stroke-linecap="round"/><path d="M${f(a)}L${f(b)}" stroke="#d4a76a" stroke-width="1.6" stroke-linecap="round"/>`,
  sangle: (a, b, sag = 0) => `<path d="M${f(a)}Q${f([(a[0] + b[0]) / 2 + sag, (a[1] + b[1]) / 2])} ${f(b)}" fill="none" stroke="#7b61ff" stroke-width="3" stroke-linecap="round"/>`,
  coussin: (c, w = 26, h = 7, coul = '#f6b84b') => `<rect x="${n1(c[0] - w / 2)}" y="${n1(c[1] - h / 2)}" width="${w}" height="${h}" rx="${h / 2}" fill="${coul}" stroke="#c58a24" stroke-width="1.1"/>`,
  disque: (c, w = 34, h = 9) => `<g><ellipse cx="${n1(c[0])}" cy="${n1(c[1])}" rx="${w / 2}" ry="${h / 2}" fill="#3dbb84" stroke="#23865b" stroke-width="1.2"/><ellipse cx="${n1(c[0])}" cy="${n1(c[1] - 1.5)}" rx="${w / 2 - 4}" ry="${h / 2 - 2.5}" fill="#5fd39f"/></g>`,
  serviette: (c, r = 4.5) => `<g><circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}" fill="#f28b82" stroke="#c4554c" stroke-width="1.1"/><circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r * .45}" fill="none" stroke="#c4554c" stroke-width=".9"/></g>`,
  haltere: (c, a = 0, k = 1) => { const d = dir(a), p = avant(d), e = (u, v) => add(add(c, d, u * k), p, v * k);
    return `<g stroke="#2d323b" stroke-width="1"><path d="M${f(e(-7, 0))}L${f(e(7, 0))}" stroke="#7d8696" stroke-width="2.4"/>` +
      [-7, 7].map(u => `<path d="M${f(e(u - 2.6, -5))}L${f(e(u + 2.6, -5))}L${f(e(u + 2.6, 5))}L${f(e(u - 2.6, 5))}Z" fill="#3b4250"/>`).join('') + '</g>'; },
  kettle: (c, a = 180) => { const d = dir(a), p = avant(d), e = (u, v) => add(add(c, d, u), p, v);
    return `<g><path d="M${f(e(0, -5))}C${f(e(7, -6))} ${f(e(7, 6))} ${f(e(0, 5))}" fill="none" stroke="#2b2f36" stroke-width="2.6"/>` +
      `<circle cx="${n1(e(13, 0)[0])}" cy="${n1(e(13, 0)[1])}" r="9" fill="#3a3f48" stroke="#1d2026" stroke-width="1.2"/><path d="M${f(e(5.5, -3))}L${f(e(5.5, 3))}" stroke="#1d2026" stroke-width="3"/><circle cx="${n1(e(15, -3)[0])}" cy="${n1(e(15, -3)[1])}" r="2.4" fill="#fff" opacity=".25"/></g>`; },
  balle: (c, r = 3.4) => `<g><circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}" fill="#d9f24a" stroke="#9db51c" stroke-width=".9"/><path d="M${n1(c[0] - r * .8)} ${n1(c[1] - r * .5)}Q${n1(c[0])} ${n1(c[1] + r * .2)} ${n1(c[0] + r * .8)} ${n1(c[1] - r * .5)}" fill="none" stroke="#fff" stroke-width=".8"/></g>`,
  table: (x0, x1, h = 75) => `<g stroke="#7b5634" stroke-width="1.2"><rect x="${x0}" y="${-h}" width="${x1 - x0}" height="5" rx="1.5" fill="#c08a58"/><rect x="${x0 + 4}" y="${-h + 5}" width="4" height="${h - 5}" fill="#9a6b3f"/><rect x="${x1 - 8}" y="${-h + 5}" width="4" height="${h - 5}" fill="#9a6b3f"/></g>`,
  // obstacle vu en perspective (haie basse ou corde), barre qui s'éloigne de nous
  obstacle: (x, h, corde) => { const dx = 16, dy = -12, c = corde ? '#e5484d' : '#ff8a3d';
    return `<g><path d="M${x + dx} ${dy}V${dy - h}" stroke="#9aa4b2" stroke-width="2.6"/><path d="M${x} 3V${-h + 3}" stroke="#7d8796" stroke-width="3"/>` +
      `<path d="M${x - 5} 3h10M${x + dx - 4} ${dy}h8" stroke="#7d8796" stroke-width="2.4"/>` +
      `<path d="M${x} ${-h + 3}L${x + dx} ${dy - h}" stroke="${c}" stroke-width="${corde ? 2.2 : 4.5}" stroke-linecap="round"/></g>`; },
  disqueGlisse: (c) => `<ellipse cx="${n1(c[0])}" cy="${n1(c[1])}" rx="13" ry="3.4" fill="#5aa9e6" stroke="#2c76b5" stroke-width="1.1"/>`,
  zone: (c, r = 12) => `<circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}" fill="url(#g-zone)"/>`,
  texte: (p, t, taille = 9, coul = '#d9480f') => `<text x="${n1(p[0])}" y="${n1(p[1])}" font-size="${taille}" font-weight="800" fill="${coul}" text-anchor="middle" font-family="system-ui,sans-serif">${t}</text>`
};
// Flèches de mouvement
function fleche(a, b, k = .25, coul = '#ff6b2c', double) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = sub(b, a), nn = [-d[1], d[0]], c = add(m, nn, k);
  const tete = (p, q) => { const v = sub(p, q), l = len(v) || 1, u = [v[0] / l, v[1] / l], w = [-u[1], u[0]];
    return `<path d="M${f(add(add(p, u, -7), w, 4.2))}L${f(p)}L${f(add(add(p, u, -7), w, -4.2))}" fill="none" stroke="${coul}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`; };
  return `<g class="fl"><path d="M${f(a)}Q${f(c)} ${f(b)}" fill="none" stroke="${coul}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${double === 'tirets' ? '5 4' : 'none'}"/>${tete(b, c)}${double === true ? tete(a, c) : ''}</g>`;
}
// Cercle de rotation (pour les cercles et rotations)
function rotation(c, r, a0, a1, coul = '#ff6b2c', ky = .55) {
  const P = []; for (let i = 0; i <= 24; i++) { const a = (a0 + (a1 - a0) * i / 24) * RAD; P.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * ky]); }
  const p = P[P.length - 1], q = P[P.length - 2];
  const v = sub(p, q), l = len(v) || 1, u = [v[0] / l, v[1] / l], w = [-u[1], u[0]];
  return `<g class="fl"><path d="${courbe(P)}" fill="none" stroke="${coul}" stroke-width="2.6" stroke-linecap="round"/><path d="M${f(add(add(p, u, -7), w, 4.2))}L${f(p)}L${f(add(add(p, u, -7), w, -4.2))}" fill="none" stroke="${coul}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
// Ondes de respiration / de tenue
const ondes = (c, r = 10) => `<g class="fl" fill="none" stroke="#38a3d1" stroke-width="2" stroke-linecap="round" opacity=".9"><path d="M${n1(c[0] - r)} ${n1(c[1] - r * .4)}a${r} ${r} 0 0 1 ${2 * r} 0"/><path d="M${n1(c[0] - r * 1.6)} ${n1(c[1] - r * .9)}a${r * 1.6} ${r * 1.6} 0 0 1 ${3.2 * r} 0" opacity=".55"/></g>`;

const DEFS = `<defs>
  <radialGradient id="g-klein" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#c7a6f5"/><stop offset=".6" stop-color="#9a6ae0"/><stop offset="1" stop-color="#7448bd"/></radialGradient>
  <radialGradient id="g-zone"><stop offset="0" stop-color="#ff3b3b" stop-opacity=".55"/><stop offset=".6" stop-color="#ff3b3b" stop-opacity=".22"/><stop offset="1" stop-color="#ff3b3b" stop-opacity="0"/></radialGradient>
  <linearGradient id="g-fond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f9fd"/><stop offset="1" stop-color="#e8eff7"/></linearGradient>
</defs>`;

// ---------- Les exercices ----------
// vue : 'cote' (profil, tourné vers la droite) ou 'face'. poses : positions clés. fond/avant(J, i) : objets.
// fl(Js) : flèches (Js = squelettes de chaque pose). legendes : une par pose. cles : les points importants.
const S = {};
const debout = (o = {}) => Object.assign({x: 0, y: -97, t: 180, h: 180, b1: [4, 2], b2: [-4, -2], j1: [0, 0, 90], j2: [0, 0, 90]}, o);
const face = (o = {}) => Object.assign({x: 0, y: -97, t: 180, h: 180, b1: [-8, -4], b2: [8, 4], j1: [-3, -1, 0], j2: [3, 1, 0]}, o);
const surDos = (o = {}) => Object.assign({x: 0, y: -12, t: -90, h: -86, b1: [84, 88, 88], b2: [86, 89, 89], j1: [148, 30, 100], j2: [146, 28, 98]}, o);


// ---------- Personnage debout vu de dessus (pour les rotations d'épaule) ----------
// c = centre de la tête, il regarde vers le bas de l'image (« devant »).
// o.b1 / o.b2 = [angle bras, longueur visible 0-1, angle avant-bras, longueur visible 0-1] (b1 = côté gauche de l'image)
// o.poing1 / o.poing2 : main fermée vue de dessus quand l'avant-bras est vertical.
function dessusDebout(c, o = {}) {
  const pk = COUL.peau, hc = COUL.haut, ch = COUL.cheveux, cs = COUL.chaussure, x = c[0], y = c[1];
  const P = (u, v) => [x + u, y + v];
  let s = '';
  // pieds qui dépassent devant
  [-9, 9].forEach(u => { const g = (a, b) => P(u + a, 16 + b);
    s += chemin(lisse([g(-5, -6), g(-5.4, 6), g(-3.4, 12.5), g(0, 14), g(3.4, 12.5), g(5.4, 6), g(5, -6)]), cs[0], cs[2], 1.1) + chemin(courbe([g(-3, 12), g(0, 13.4), g(3, 12)]), 'none', COUL.semelle, 1.5); });
  // épaules et dos (le t-shirt)
  const ep = [P(-22, -1), P(-20, -9), P(-10, -12), P(0, -12.5), P(10, -12), P(20, -9), P(22, -1), P(21, 6), P(12, 10.5), P(0, 11.5), P(-12, 10.5), P(-21, 6)];
  s += chemin(lisse(ep), hc[0], hc[2], 1.3) + chemin(courbe([P(-9, 8.5), P(0, 10.3), P(9, 8.5)]), 'none', hc[2], 1);
  // bras
  const bras = (side, b) => {
    if (!b || b.length < 4) return '';
    const e0 = P(side * 19, 0), e1 = add(e0, dir(b[0]), LG.bh * b[1]), w = add(e1, dir(b[2]), LG.ab * b[3]);
    let t = '';
    const parts = [];
    if (b[1] > .25) parts.push(lisse(forme(e0, b[0], LG.bh * b[1], P_FACE.bh)));
    if (b[3] > .25) { parts.push(lisse(forme(e1, b[2], LG.ab * b[3], P_FACE.ab))); parts.push(lisse(forme(w, b[2], LG.ma * Math.max(.5, b[3]), P_FACE.ma))); }
    else parts.push(`M${f(add(e1, [4.8, 0]))}A4.8 4.8 0 1 1 ${f(add(e1, [-4.8, 0]))}A4.8 4.8 0 1 1 ${f(add(e1, [4.8, 0]))}Z`);
    t += groupe(parts, pk[0], pk[2]);
    if (b[3] <= .25) t += `<circle cx="${n1(e1[0])}" cy="${n1(e1[1])}" r="4.4" fill="${pk[0]}" stroke="${pk[2]}" stroke-width="1.1"/><path d="M${n1(e1[0] - 2.6)} ${n1(e1[1] - 1)}h5.2M${n1(e1[0] - 2.6)} ${n1(e1[1] + 1.2)}h5.2" stroke="${pk[2]}" stroke-width=".7"/>`;
    // manche
    t += chemin(lisse(forme(e0, b[0], Math.max(5, Math.min(10, LG.bh * b[1] * .4)), [[0, 7, 7], [1, 6.4, 6.4]], 1, 1)), hc[0], hc[2], 1.2);
    return t;
  };
  const hautBras = (side, b) => b && b[0] != null && Math.abs(((b[0] % 360) + 360) % 360 - 180) < 90; // bras qui part vers l'arrière : sous le buste
  s = (hautBras(-1, o.b1) ? bras(-1, o.b1) : '') + (hautBras(1, o.b2) ? bras(1, o.b2) : '') + s +
    (hautBras(-1, o.b1) ? '' : bras(-1, o.b1)) + (hautBras(1, o.b2) ? '' : bras(1, o.b2));
  // tête : cheveux, oreilles, bout du nez
  s += chemin(lisse([P(-2.4, 9.5), P(0, 12.6), P(2.4, 9.5)]), pk[0], pk[2], 1) +
    `<ellipse cx="${n1(x - 9.4)}" cy="${n1(y + 1.5)}" rx="2" ry="3.4" fill="${pk[1]}" stroke="${pk[2]}" stroke-width="1"/><ellipse cx="${n1(x + 9.4)}" cy="${n1(y + 1.5)}" rx="2" ry="3.4" fill="${pk[1]}" stroke="${pk[2]}" stroke-width="1"/>` +
    `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="9.4" ry="10.4" fill="${pk[0]}" stroke="${pk[2]}" stroke-width="1.2"/>` +
    chemin(lisse([P(-9.6, 2), P(-8.6, -6.5), P(-4, -10.8), P(0, -11.4), P(4, -10.8), P(8.6, -6.5), P(9.6, 2), P(7, 5.5), P(0, 4.2), P(-7, 5.5)]), ch[0], ch[1], 1.1);
  return s;
}

// ---------- Mise en scène ----------
// Mesure la place prise par un dessin (navigateur seulement)
function mesure(contenu) {
  if (typeof document === 'undefined' || !document.body) return null;
  let m = mesure.svg;
  if (!m || !m.isConnected) { m = mesure.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); m.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden'); document.body.appendChild(m); }
  m.innerHTML = DEFS + '<g>' + contenu + '</g>';
  try { const b = m.lastChild.getBBox(); return b.width ? [b.x, b.y, b.x + b.width, b.y + b.height] : null; } catch (e) { return null; }
}
function scene(def) {
  const vue = def.vue || 'cote';
  prepare.dessus = !!def.dessus;
  const poses = def.custom ? def.poses : def.poses.map(p => prepare(p, vue));
  prepare.dessus = false;
  const Js = def.custom ? poses.map(() => ({})) : poses.map(p => squelette(p, vue));
  const sc = {vue, poses, Js, def};
  const pts = def.custom ? [[0, 0]] : []; if (!def.custom) poses.forEach(p => pts.push(...contour(p, vue).pts));
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(def.custom ? 0 : 4, ...pts.map(p => p[1]));
  const b = mesure(poses.map((p, i) => contenu(sc, p, i)).join(''));
  if (b) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, def.custom || def.dessus ? b[3] : Math.min(b[3], 12)); }
  if (def.cadre) { x0 = Math.min(x0, def.cadre[0]); y0 = Math.min(y0, def.cadre[1]); x1 = Math.max(x1, def.cadre[2]); y1 = Math.max(y1, def.cadre[3]); }
  const m = 12; x0 -= m; x1 += m; y0 -= m + (def.vueTxt === '' ? 0 : Math.max(10, (x1 - x0) * .07)); y1 += def.dessus ? m : 8;
  // format au moins 5/4 en largeur, au plus 2,1/1
  let w = x1 - x0, h = y1 - y0;
  if (w / h < (def.ratio || 1.25)) { const nw = h * (def.ratio || 1.25); x0 -= (nw - w) / 2; w = nw; }
  if (w / h > 2.1) { const nh = w / 2.1; if (def.dessus) y0 -= (nh - h) / 2; else y0 -= (nh - h); h = nh; }
  sc.box = [x0, y0, w, h];
  return sc;
}
// Le dessin d'une pose : objets derrière, personnage, objets devant, flèches
function contenu(sc, P, i) {
  const def = sc.def;
  if (def.custom) return (def.fond ? def.fond({}, i, sc.Js, P) : '') + (def.fantome != null && P !== sc.poses[def.fantome] ? `<g opacity=".24">${def.custom(sc.poses[def.fantome], def.fantome)}</g>` : '') + def.custom(P, i) + (def.avant ? def.avant({}, i, sc.Js, P) : '');
  const J0 = squelette(P, sc.vue);
  const {svg, J} = personnage(P, sc.vue, def.milieu ? def.milieu(J0, i, sc.Js, P) : '');
  const {pts} = contour(P, sc.vue);
  const bas = pts.filter(p => p[1] > -5 && p[1] < 5);
  let c = def.fond ? def.fond(J, i, sc.Js, P) : '';
  if (bas.length && !def.sansOmbre && !def.dessus) { const a = Math.min(...bas.map(p => p[0])), b = Math.max(...bas.map(p => p[0])); c = O.ombre((a + b) / 2, (b - a) / 2 + 6) + c; }
  // fantôme : la position de départ en transparence, pour voir le chemin parcouru
  if (def.fantome != null && P !== sc.poses[def.fantome]) c += `<g opacity=".24">${personnage(sc.poses[def.fantome], sc.vue).svg}</g>`;
  c += svg + (def.avant ? def.avant(J, i, sc.Js, P) : '');
  return c;
}
function image(sc, P, i) {
  const def = sc.def, [x0, y0, w, h] = sc.box;
  let s = `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(w)}" height="${n1(h)}" fill="url(#g-fond)"/>` +
    (def.dessus ? `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(w)}" height="${n1(h)}" fill="#e6edf5"/>` : `<rect x="${n1(x0)}" y="0" width="${n1(w)}" height="${n1(y0 + h)}" fill="#dfe7f0"/><path d="M${n1(x0)} 0H${n1(x0 + w)}" stroke="#c3cedb" stroke-width="1.4"/>`);
  let c = contenu(sc, P, i);
  if (def.miroir) c = `<g transform="translate(${n1(2 * x0 + w)} 0) scale(-1 1)">${c}</g>`;
  // l'angle de vue, toujours écrit en haut à gauche
  const vt = def.vueTxt != null ? def.vueTxt : def.dessus ? 'vu de dessus' : sc.vue === 'face' ? (def.poses[0].dos ? 'vu de dos' : 'vu de face') : 'vu de côté';
  if (vt) { const tw = vt.length * 5.1 + 12, fs = w / 27;
    c += `<g font-family="system-ui,sans-serif"><rect x="${n1(x0 + 5)}" y="${n1(y0 + 5)}" width="${n1(tw * fs / 9)}" height="${n1(fs + 6)}" rx="${n1((fs + 6) / 2)}" fill="#fff" opacity=".85"/><text x="${n1(x0 + 5 + tw * fs / 18)}" y="${n1(y0 + 5 + fs + 1.5)}" font-size="${n1(fs)}" font-weight="700" fill="#5d6b7d" text-anchor="middle">${vt}</text></g>`; }
  return s + c;
}
const ease = t => .5 - Math.cos(Math.PI * t) / 2;
// Dessine le(s) schéma(s) animé(s) et les vignettes numérotées dans un élément.
// S[id] peut être une planche ou une liste de planches (opts.planche : n'en montrer qu'une).
const planches = id => { const d = S[id]; return !d ? [] : Array.isArray(d) ? d : [d]; };
function afficher(el, id, opts = {}) {
  let ps = planches(id); if (!ps.length) return null;
  if (opts.planche != null) ps = [ps[Math.min(opts.planche, ps.length - 1)]];
  const anims = [];
  el.innerHTML = ps.map((def, k) => {
    const sc = scene(def), [x0, y0, w, h] = sc.box, vb = `${n1(x0)} ${n1(y0)} ${n1(w)} ${n1(h)}`, n = sc.poses.length;
    anims.push(sc);
    const leg = def.legendes || [];
    return `<div class="sch-planche">${def.titre ? `<div class="sch-titre">${def.titre}</div>` : ''}<div class="sch-grand"><svg viewBox="${vb}" role="img" aria-label="Schéma de l'exercice">${DEFS}<g class="sch-anim">${image(sc, sc.poses[0], 0)}</g></svg>` +
      (n > 1 ? `<button type="button" class="sch-pause" aria-label="Pause">⏸</button>` : '') +
      (leg[0] ? `<div class="sch-leg">${n > 1 ? '<b>1</b>' : ''}${leg[0]}</div>` : '') + `</div>` +
      (n > 1 && opts.vignettes !== false ? `<div class="sch-vignettes">${sc.poses.map((p, i) => `<figure data-i="${i}"><svg viewBox="${vb}">${DEFS}${image(sc, p, i)}</svg><figcaption><b>${i + 1}</b>${leg[i] || ''}</figcaption></figure>`).join('')}</div>` : '') + '</div>';
  }).join('');
  const reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stops = [...el.querySelectorAll('.sch-planche')].map((pl, k) => {
    const sc = anims[k], def = sc.def, n = sc.poses.length; if (n < 2) return () => {};
    const seq = def.seq || [...Array(n).keys()], g = pl.querySelector('.sch-anim'), bouton = pl.querySelector('.sch-pause'), leg = pl.querySelector('.sch-leg');
    const vig = pl.querySelectorAll('.sch-vignettes figure');
    const tr = (def.duree || 1.3) * 1000, tenue = (def.tenue || .9) * 1000, cycle = tr + tenue;
    let t0 = performance.now(), arret = false, pause = reduit, tp = t0, raf = 0, der = 0, cour = -1;
    const montre = i => { if (i === cour) return; cour = i; vig.forEach((v, j) => v.classList.toggle('on', j === i)); if (leg && def.legendes) { let j = i; while (j > 0 && !def.legendes[j]) j--; leg.innerHTML = `<b>${i + 1}</b>${def.legendes[j] || ''}`; } };
    montre(0);
    const pas = () => {
      if (arret) return;
      raf = requestAnimationFrame(pas);
      const now = performance.now(); if (pause || now - der < 33 || !g.isConnected) return; der = now;
      const T = (now - t0) % (cycle * seq.length), q = Math.floor(T / cycle), r = T - q * cycle;
      const a = seq[q], b = seq[(q + 1) % seq.length], u = r < tenue ? 0 : ease((r - tenue) / tr);
      const i = u > .5 ? b : a;
      g.innerHTML = image(sc, u ? melange(sc.poses[a], sc.poses[b], u) : sc.poses[a], i);
      montre(i);
    };
    raf = requestAnimationFrame(pas);
    if (bouton) { bouton.textContent = pause ? '▶' : '⏸'; bouton.onclick = () => { pause = !pause; bouton.textContent = pause ? '▶' : '⏸'; if (pause) tp = performance.now(); else t0 += performance.now() - tp; }; }
    vig.forEach((v, i) => v.onclick = () => { if (!pause) tp = performance.now(); pause = true; if (bouton) bouton.textContent = '▶'; g.innerHTML = image(sc, sc.poses[i], i); montre(i); });
    return () => { arret = true; cancelAnimationFrame(raf); };
  });
  return {stop() { stops.forEach(f => f()); }};
}
// Image fixe d'une pose (pour les tests et les aperçus)
function fixe(id, i = 0, k = 0) { const def = planches(id)[k], sc = scene(def), [x0, y0, w, h] = sc.box; return `<svg viewBox="${n1(x0)} ${n1(y0)} ${n1(w)} ${n1(h)}" xmlns="http://www.w3.org/2000/svg">${DEFS}${image(sc, sc.poses[i], i)}</svg>`; }

// Place une cheville (ou un poignet) sur un point précis en pliant le membre (cinématique inverse à 2 segments)
function ik(P, vue, m, cible, sens = 1, fin) {
  const Q = prepare(P, vue), J = squelette(Q, vue), dy = Q.y - P.y, b = m[0] === 'b';
  const base = J[(b ? 'epaule' : 'hanche') + m[1]], ls = P.ls || {};
  const L1 = (b ? LG.bh : LG.cu) * (ls[(b ? 'bh' : 'cu') + m[1]] || 1), L2 = (b ? LG.ab : LG.ja) * (ls[(b ? 'ab' : 'ja') + m[1]] || 1);
  const v = sub(cible, base), d = Math.min(len(v), L1 + L2 - .01), ang = Math.atan2(v[0], v[1]) / RAD;
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))) / RAD;
  const a1 = ang + sens * al, k = add(base, dir(a1), L1), w = sub(cible, k), a2 = Math.atan2(w[0], w[1]) / RAD;
  const R = Object.assign({}, P); R[m] = [a1, a2, fin == null ? (P[m] || [])[2] : fin];
  if (dy && P.sol !== false && !P.cale) R.y = P.y; // l'ancrage au sol est refait ensuite
  return R;
}
window.RENFO_SCHEMAS = S;
window.RENFO_SCHEMA = {afficher, fixe, existe: id => !!S[id], planches};
window.RENFO_DESSIN = {dessusDebout, ik, dir, add, squelette, personnage, prepare, melange, contour, O, fleche, rotation, ondes, debout, surDos, face, DEFS, LG};
})();
