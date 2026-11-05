// Renfo — positions de chaque exercice (voir schemas.js pour le dessin)
(function () {
'use strict';
const S = window.RENFO_SCHEMAS, D = window.RENFO_DESSIN, O = D.O, fl = D.fleche, rot = D.rotation, ondes = D.ondes, debout = D.debout, surDos = D.surDos, face = D.face, ik = D.ik;
const mil = (a, b, k = .5) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const dec = (p, dx, dy) => [p[0] + dx, p[1] + dy];
// petites flèches qui serrent (vers un point)
const serre = (c, r = 18) => fl(dec(c, -r - 8, -r), dec(c, -r * .55, -r * .45), 0) + fl(dec(c, r + 8, -r), dec(c, r * .55, -r * .45), 0);

// ---------- Sur le dos, genoux pliés, ballon entre les genoux ----------
const genouxBallon = J => O.foot(dec(J.genou1, -4, -6), 11);
const brasCroises = {b1: [110, -96, -92], b2: [106, -98, -95]};
S.p0 = {poses: [surDos()],
  fond: () => O.tapis(-80, 80), milieu: genouxBallon, avant: J => serre(dec(J.genou1, -4, -6)) + O.texte(dec(J.genou1, -4, -34), '3 s', 11),
  legendes: ['Serre fort 3 secondes, une seule fois, puis note la douleur sur 10']};
S.p8 = {poses: [surDos(), surDos()], seq: [0, 1], tenue: 1.6, duree: .5,
  fond: () => O.tapis(-80, 80), milieu: genouxBallon,
  avant: (J, i) => i === 1 ? serre(dec(J.genou1, -4, -6)) : '',
  legendes: ['Relâche complètement (périnée compris)', 'Serre le ballon entre les genoux et tiens']};

// ---------- Plancher pelvien : mollets sur une chaise ----------
const mainVentre = [80, 178, 112];
const ppPose = o => surDos(Object.assign({x: 0, b1: mainVentre, ls: {ab1: .78}, j1: [166, 90, 180], j2: [164, 88, 178], ve: 0}, o));
S.pp = {poses: [ppPose({ve: 4}), ppPose({ve: -.5})], duree: 2.2, tenue: 1.4,
  fond: J => O.tapis(-80, 70) + O.chaise(J.genou1[0] + 26, 1, -J.genou1[1] - 5.5),
  avant: (J, i) => i === 0 ? ondes(dec(J.bassin, -24, -26), 7) : '',
  legendes: ['Inspire 4 s par le nez : le ventre gonfle, le fond du bassin s\'ouvre', 'Expire 6 à 8 s, lèvres pincées : tout remonte seul, sans serrer']};
S.s1 = {poses: [surDos({b1: mainVentre, ls: {ab1: .78}, ve: 4}), surDos({b1: mainVentre, ls: {ab1: .78}, ve: -.5})], duree: 2, tenue: 1.2,
  fond: () => O.tapis(-80, 80),
  avant: (J, i) => i === 0 ? ondes(dec(J.bassin, -24, -26), 7) : '',
  legendes: ['Inspire 4 s par le nez : le ventre gonfle', 'Expire 6 s par la bouche : tout se relâche']};

// ---------- À quatre pattes ----------
const quatre = o => Object.assign({x: 0, y: -50, t: 97, h: 112, b1: [2, 0, 90], b2: [-2, -2, 90], j1: [-4, -90, 0], j2: [-6, -92, 2]}, o);
S.p1 = {poses: [quatre(), quatre({j1: [6, -78, 8], j2: [4, -80, 10], v: 7, h: 40, t: 99})], duree: 1.6, tenue: 1,
  fond: () => O.tapis(-75, 85), milieu: J => O.foot(dec(J.genou1, 1, -6), 10),
  avant: (J, i, Js) => { const m = mil(Js[0].bassin, Js[0].cou); return i === 1 ? fl(dec(m, 0, -16), dec(m, 0, -34), 0) : ''; },
  legendes: ['Dos plat, ballon serré entre les genoux : inspire', 'Genoux décollés, ventre rentré, dos rond : expire longuement']};
S.s2 = {poses: [quatre({v: -5, h: 140}), quatre({v: 7, h: 40})], duree: 2, tenue: 1,
  fond: () => O.tapis(-75, 85),
  legendes: ['Inspire : creuse doucement le dos, regard devant', 'Expire : arrondis le dos, menton vers la poitrine']};

// ---------- Pubalgie, suite ----------
// p2 : sur le dos, bras croisés, pied sur le gros ballon, l'autre jambe tendue au sol
const R2 = 30, surBallon = (cx, a = -145) => { const c = [cx, -R2]; return D.ik(surDos(Object.assign({x: 0, j2: [91, 90, 178]}, brasCroises)), 'cote', 'j1', D.add(c, D.dir(a), R2 + 6.5), 1, a - 90); };
S.p2 = {poses: [surBallon(52, -150), surBallon(104, -128)], duree: 1.8,
  fond: () => O.tapis(-80, 130), milieu: (J, i, Js, P) => O.klein([J.cheville1[0] - D.dir(P.j1[2] + 90)[0] * (R2 + 6.5), -R2], R2),
  avant: (J, i, Js) => i === 0 ? rot(dec(Js[0].cheville1, 8, -16), 17, 160, 470) : '',
  legendes: ['Genou plié, pied posé sur le ballon', 'Roule le ballon : ouvre sur le côté, tends, ramène vers l\'intérieur']};

// Bras de face : mains sur les hanches, bras croisés
const hanchesF = {b1: [-35, 47, 20], b2: [35, -47, -20]};
const croisesF = {b1: [-6, 108, 96], b2: [6, -108, -96], ordre: ['milieu', 'jambe1', 'jambe2', 'short', 'tronc', 'tete', 'bras2', 'bras1']};
const croisesC = {b1: [26, 166, 172], b2: [22, 164, 170], ls: {ab1: .72, ab2: .72, ma1: .6, ma2: .6}};

// p3 : debout, genou levé vers nous, le tibia bascule dehors puis dedans
const p3pose = a => face(Object.assign({j1: [178, a, a], ls: {cu1: .16}}, hanchesF));
S.p3 = [{titre: 'De profil : le genou levé haut', poses: [debout({b1: [20, 150, 150], b2: [16, 146, 146], ls: {ab1: .55, ab2: .55}, j1: [100, 0, 90]})], legendes: ['Debout, mains sur les hanches, un genou levé haut (tiens-toi au mur si besoin)']},
  {titre: 'De face : la rotation', vue: 'face', poses: [p3pose(-38), p3pose(30)], duree: 1.3,
  fond: () => '', avant: (J, i, Js) => i === 0 ? fl(dec(Js[0].cheville1, -2, 14), dec(Js[1].cheville1, 2, 14), .3, undefined, true) : '',
  legendes: ['Genou levé et fixe : le pied part vers l\'extérieur', 'Puis vers l\'intérieur. Seul le tibia bouge']}];

// p4 : passage de haie sur le côté
S.p4 = {vue: 'face', poses: [face(Object.assign({j2: [10, 4, 4]}, hanchesF)), face(Object.assign({t: 176, h: 178, j2: [104, 6, 10], ls: {cu2: .9}}, hanchesF))], duree: 1.5,
  fond: () => O.obstacle(44, 34, false),
  avant: (J, i, Js) => i === 0 ? fl(dec(Js[0].cheville2, 6, -14), dec(Js[1].genou2, 8, -18), -.45) : '',
  legendes: ['Debout, la haie basse sur le côté', 'Écarte la jambe et monte le genou haut pour passer par-dessus, puis reviens']};

// p5 : assis sur le gros ballon, le bassin roule
const p5pose = x => { let P = Object.assign({x, y: -76, t: 180, h: 180, sol: false, j1: [58, 0, 90], j2: [56, 2, 90]}, croisesC);
  P = ik(P, 'cote', 'j1', [40, -8], 1, 90); return ik(P, 'cote', 'j2', [38, -8], 1, 90); };
S.p5 = {poses: [p5pose(-9), p5pose(9)], duree: 1.4, tenue: .5,
  milieu: J => O.klein([J.bassin[0] - 3, -32], 32),
  avant: (J, i, Js) => i === 0 ? fl(dec(Js[0].bassin, -2, 40), dec(Js[1].bassin, 2, 40), 0, undefined, true) : '',
  legendes: ['Fais rouler le ballon avec le bassin vers l\'arrière (expire)…', '…puis vers l\'avant (inspire). Pareil à droite, à gauche, puis en cercles']};

// p6 : bascule du bassin sur une marche (de face)
const p6pose = (t, a2) => face(Object.assign({t, h: 180, j1: [0, 0, 0], j2: [a2, a2, a2], cale: ['cheville1', -26, -9.5]}, croisesF));
S.p6 = {vue: 'face', poses: [p6pose(180, 0), p6pose(170, -10)], duree: 1.5,
  fond: () => O.marche(-36, -1, 18),
  avant: (J, i, Js) => i === 1 ? fl(dec(Js[0].cheville2, 16, -2), dec(Js[1].cheville2, 16, 2), -4) : fl(dec(Js[1].cheville2, 16, 2), dec(Js[0].cheville2, 16, -2), 4),
  legendes: ['Debout sur la marche, jambe tendue dans le vide', 'Laisse descendre la jambe libre en basculant le bassin, puis remonte-la']};

// p6b : descente de marche lente sur la jambe gauche (de profil, on voit le côté gauche)
const p6bpose = (bas) => { let P = debout({b1: [62, 72], b2: [58, 70], cale: ['cheville1', -26, 0], sol: false});
  if (bas) { P = ik(P, 'cote', 'j1', [0, -26], 1, 90); P.y += 0; }
  return P; };
const p6b2 = () => { let P = debout({b1: [68, 80], b2: [64, 78], sol: false, y: -86, x: -12, t: 166, h: 172});
  P = ik(P, 'cote', 'j1', [0, -26], 1, 90); return ik(P, 'cote', 'j2', [30, -7], 1, 120); };
S.p6b = {poses: [debout({b1: [62, 72], b2: [58, 70], j2: [16, 8, 100], cale: ['cheville1', -26, 0]}), p6b2()], duree: 2.4,
  fond: () => O.marche(-22, 22, 18),
  legendes: ['Debout sur la marche, sur la jambe gauche', 'Plie le genou gauche en 4 s : le talon droit touche le sol devant']};

// p7 : passage sous la corde en fente latérale
const p7bas = face(Object.assign({x: 0, t: 186, h: 184, j1: [-56, -56, -56], j2: [52, -14, 0], sol: 0}, croisesF));
S.p7 = {vue: 'face', poses: [face(Object.assign({x: -55}, croisesF)), p7bas, face(Object.assign({x: 55}, croisesF))], seq: [0, 1, 2, 1], duree: 1.4, tenue: .6,
  fond: (J, i, Js) => O.obstacle(2, Math.round(-Js[1].tete[1] + 14), true),
  legendes: ['Debout à côté de la corde', 'Descends en fente latérale basse pour passer dessous', 'Remonte de l\'autre côté, puis reviens']};

// p8b : chaise contre le mur
S.p8b = {poses: [debout({x: 0, b1: [8, 4], b2: [4, 2]}), debout({x: 2, j1: [80, 0, 90], j2: [78, 2, 90], b1: [40, 76], b2: [36, 74]})], duree: 1.8, tenue: 1.2,
  fond: () => O.mur(-12.5, -1),
  legendes: ['Dos contre le mur', 'Descends (genoux entre 60° et 90°), genoux au-dessus des chevilles, et tiens']};

// p9 : glissé latéral à genoux (de face)
const p9pose = a2 => { let P = face({t: 180, j1: [-2, 0, 0], j2: [a2, -a2 * .3, 0], ls: {ja1: .1, ja2: .1}, cache: ['pied1', 'pied2'], sol: 6, b1: [-20, 20], b2: [20, -20]});
  P = Object.assign(P, {b2: hanchesF.b2}); return ik(P, 'face', 'b1', [-36, -92], 1); };
const prepare_ = P => P;
S.p9 = {vue: 'face', poses: [p9pose(2), p9pose(34)], duree: 2.2, tenue: .8,
  fond: (J) => O.coussin([J.genou1[0], -1], 24, 7) + O.disqueGlisse([J.genou2[0], 1]),
  milieu: () => O.baton([-36, 2], [-36, -132]), avant: (J, i, Js) => (i === 0 ? fl(dec(Js[0].genou2, 14, -4), dec(Js[1].genou2, 14, -4), -.3) : ''),
  legendes: ['À genoux, buste droit, un genou sur la mousse, l\'autre sur le disque', 'Laisse glisser lentement vers l\'extérieur en freinant, reviens en tirant sur le bâton']};

// p10 : Copenhague (vu de face, couché sur le côté droit, jambe du dessus sur le banc)
const copen = (bas) => { let P = face({x: 0, y: -40, t: -102, h: -100, cale: ['main1', -1], b1: [-4, -4, -90], b2: [74, 74, 74], j1: [bas ? 44 : 82, bas ? 44 : 82, bas ? 44 : 82], j2: [92, 92, 92], cache: [], ls: {}});
  return P; };
S.p10 = {vue: 'face', poses: [ik(copen(true), 'face', 'j1', [60, -9]), copen(false)], duree: 1.6, tenue: 1,
  fond: (J, i, Js) => O.bancBout(Js[0].cheville2[0] - 2, Math.round(-Js[0].cheville2[1] - 5), 30),
  legendes: ['Bassin en l\'air, corps droit. La jambe du dessous touche le sol', 'Elle remonte se coller sous le banc, tiens 2 s, redescends lentement']};

// p10b : adduction debout à l'élastique (de face)
const p10b = a => face(Object.assign({j1: [a, a, a], ordre: ['milieu', 'jambe2', 'jambe1', 'short', 'tronc', 'tete', 'bras1', 'bras2']}, hanchesF));
S.p10b = {vue: 'face', poses: [p10b(-26), p10b(12)], duree: 1.2, tenue: .6,
  fond: () => O.poteau(-82, 22),
  avant: (J) => O.elastique([-82, -18], dec(J.cheville1, 0, -2), 2),
  legendes: ['Élastique à la cheville, jambe écartée', 'Ramène-la devant l\'autre, puis laisse-la repartir lentement (3 s)']};

// p11 : gainage sur le dos, haut du dos sur le coussin, bras tendus avec 1 kg
const p11 = (b1, ls) => ({x: 0, y: -26, t: -101, h: -98, b1, b2: [178, 178, 178], j1: [83, 83, 172], j2: [84, 84, 174], ls});
S.p11 = {poses: [p11([180, 180, 180]), p11([20, 20, 20], {bh1: .55, ab1: .55, ma1: .7})], duree: 1.4, tenue: .7,
  fond: (J, i, Js) => O.tapis(-75, 105) + O.disque([Js[0].epaule1[0] + 2, -6], 38, 14),
  avant: (J) => O.haltere(J.main1, 90, .8),
  milieu: (J) => O.haltere(J.main2, 90, .8),
  legendes: ['Bassin décollé, corps en planche, bras tendus vers le plafond', 'Descends un bras sur le côté, reviens, alterne. Le bassin ne bouge pas']};

// p12 : à genoux sur le gros ballon
const p12 = (haut) => ({x: 0, y: -114, t: 180, h: 180, sol: false, cale: ['genou1', -68, 4], j1: [-2, -104, -40], j2: [-2, -102, -38],
  b1: haut ? [172, 176, 176] : [14, 30, 30], b2: haut ? [170, 174, 174] : [10, 26, 26]});
S.p12 = {poses: [p12(false), p12(true)], duree: 1.8, tenue: .8,
  fond: () => O.klein([0, -32], 32),
  avant: (J) => O.baton(dec(J.main1, -5, 4), dec(J.main1, 7, -6)),
  legendes: ['À genoux sur le ballon, buste droit, bâton dans les mains', 'Lève les bras au-dessus de la tête, sans que le bassin bouge, puis redescends']};

// ---------- ÉPAULE GAUCHE (de profil, on voit le côté gauche) ----------
// e0 : échauffement en 3 étapes (une planche par étape)
const cercle = a => debout({b1: [a, a, a], b2: [a + 180, a + 180, a + 180]});
const rotCoude = (a, ancre) => face(Object.assign({b2: [4, a, a], ls: {ab2: a < 30 ? .35 : 1}}, {b1: [-6, -3]}));
const rotExt = {vue: 'face', poses: [rotCoude(8), rotCoude(88)], duree: 1.3,
  fond: () => O.porte(-70), avant: J => O.elastique([-67, -100], J.main2, 4) + `<circle cx="${J.coude2[0] + 1}" cy="${J.coude2[1] - 4}" r="3.5" fill="#f28b82" stroke="#c4554c"/>`,
  legendes: ['Coude collé au corps (serviette roulée), avant-bras devant le ventre', 'Pivote l\'avant-bras vers l\'extérieur, le coude ne bouge pas']};
const rotInt = {vue: 'face', poses: [rotCoude(88), rotCoude(8)], duree: 1.3,
  fond: () => O.porte(80), avant: J => O.elastique([77, -100], J.main2, 4),
  legendes: ['Coude collé au corps, élastique tendu sur le côté', 'Ramène l\'avant-bras devant le ventre, lentement']};
S.e0 = [{titre: 'Cercles de bras', poses: [cercle(0), cercle(90), cercle(180), cercle(270)], duree: .7, tenue: 0,
  avant: (J, i, Js) => rot(Js[0].epaule1, 64, 200, 520, undefined, 1), legendes: ['Grands cercles de bras, vers l\'avant puis vers l\'arrière', '', '', '']},
  Object.assign({titre: 'Rotation externe à l\'élastique'}, rotExt), Object.assign({titre: 'Rotation interne à l\'élastique'}, rotInt)];

// e1 : push-up plus sur les genoux
const pompe = (hautBras, plus) => {
  let P = {x: 0, y: -40, t: hautBras ? 124 : 99, h: hautBras ? 140 : 108, j1: [hautBras ? -56 : -81, -124, -170], j2: [hautBras ? -58 : -83, -126, -172], sol: 0, v: plus ? 6 : 0};
  P.b1 = [0, 0, 90]; P.b2 = [0, 0, 90];
  return P; };
const pompeBras = (P, main) => { P = ik(P, 'cote', 'b1', main, -1, 90); return ik(P, 'cote', 'b2', [main[0] - 2, main[1]], -1, 90); };
const e1a = pompeBras(Object.assign(pompe(true), {y: -42, sol: false, cale: ['genou1', -5, -40]}), [24, -3]);
const e1b = pompeBras(Object.assign(pompe(false), {sol: false, cale: ['genou1', -5, -40]}), [24, -3]);
const e1c = pompeBras(Object.assign(pompe(true, true), {sol: false, cale: ['genou1', -5, -40], ls: {tr: .97}}), [24, -3]);
S.e1 = {poses: [e1a, e1b, e1a, e1c], legendes: ['Bras tendus, corps droit des genoux à la tête', 'Descends, coudes à environ 45° du corps', 'Remonte bras tendus', 'Le « plus » : pousse encore, le haut du dos s\'arrondit un peu, tiens 1 s'],
  fond: () => O.tapis(-60, 50), avant: (J, i, Js) => i === 3 ? fl(dec(Js[2].cou, -16, -18), dec(Js[2].cou, -16, -32), 0) : ''};

// e2 : Y à plat ventre
S.e2 = [{titre: 'Vu de dessus : les bras en Y', dessus: true, vue: 'face', poses: [face({x: 0, y: 0, t: 180, dos: 1, b1: [-148, -148, -148], b2: [148, 148, 148], j1: [-2, 0, 0], j2: [2, 0, 0]})],
  fond: () => '<rect x="-50" y="-160" width="100" height="270" rx="6" fill="#bfe3d6" opacity=".7"/>',
  legendes: ['Bras tendus en Y au-dessus de la tête, pouces vers le plafond']},
  {titre: 'De profil : on décolle de quelques centimètres', poses: [{x: 0, y: -10, t: 90, h: 86, b1: [94, 94, 94], b2: [95, 95, 95], j1: [-90, -90, 0], j2: [-91, -91, 2]}, {x: 0, y: -10, t: 90, h: 86, b1: [84, 84, 84], b2: [85, 85, 85], j1: [-90, -90, 0], j2: [-91, -91, 2]}], duree: 1, tenue: 1.4,
  fond: (J, i, Js) => O.tapis(-110, 120) + O.serviette([Js[0].tete[0] + 10, -5], 5),
  avant: (J, i, Js) => i === 1 ? fl(dec(Js[0].main1, -6, -6), dec(Js[0].main1, -6, -22), 0) : '',
  legendes: ['Front sur la serviette, omoplates tirées vers le bas et l\'arrière', 'Lève les bras de quelques centimètres, tiens 2 s, redescends lentement']}];

// e3 : rowing à l'élastique, face à la porte
const genouxF = {j1: [12, -10, 90], j2: [10, -12, 90]};
S.e3 = {poses: [debout(Object.assign({b1: [88, 90, 90], b2: [86, 88, 88]}, genouxF)), debout(Object.assign({b1: [-38, 88, 90], b2: [-40, 86, 88], m1: 'poing', m2: 'poing'}, genouxF))], duree: 1.2, tenue: .7,
  fond: () => O.porte(80), avant: J => O.elastique([77, -122], J.main1, 3),
  legendes: ['Face à la porte, bras tendus, élastique à hauteur de poitrine', 'Tire les coudes vers l\'arrière, collés au corps, serre les omoplates 1 s']};

// e4 / e4b : rotations à 90/90 (le bras levé sur le côté, vers nous)
const r90 = (a, o) => debout(Object.assign({b1: [90, a, a], ls: {bh1: .18}, b2: [-4, -2]}, o));
const f90 = (a, ls) => face({b2: [90, a, a], ls, b1: [-6, -3]});
const e4face = {titre: 'De face : le bras en position de bandeja', vue: 'face', poses: [f90(20, {ab2: .32, ma2: .5}), f90(180)], duree: 1, tenue: 1,
  legendes: ['Coude à hauteur d\'épaule, plié à 90°, l\'avant-bras pointe devant toi', 'L\'avant-bras pivote : la main monte vers le plafond, le coude ne bouge pas']};
S.e4 = [e4face, {titre: 'De profil, face à la porte', poses: [r90(90), r90(180)], duree: 1, tenue: 1, seq: [0, 1],
  fond: () => O.porte(85), avant: J => O.elastique([82, -140], J.main1, 3),
  legendes: ['Face à la porte, coude à hauteur d\'épaule plié à 90°, avant-bras vers la porte', 'Monte en 1 s : la main pointe vers le plafond. Redescends en 3-4 s']}];
S.e4b = [Object.assign({}, e4face, {poses: [f90(180), f90(20, {ab2: .32, ma2: .5})], legendes: ['Départ main vers le plafond', 'Ramène l\'avant-bras vers l\'avant jusqu\'à l\'horizontale, coude toujours haut']}), {titre: 'De profil, dos à la porte', poses: [r90(180), r90(90)], duree: 1.2, tenue: .8,
  fond: () => O.porte(-60), avant: J => O.elastique([-57, -150], J.main1, 3),
  legendes: ['Dos à la porte, main vers le plafond, élastique tendu derrière', 'Ramène l\'avant-bras vers l\'avant jusqu\'à l\'horizontale, coude toujours haut']}];

// e5 : rotation externe couché sur le côté droit (vu de face)
const e5 = (a, ls) => face({x: 0, y: -22, sol: false, t: -90, h: -90, b1: [-92, -92, -92], b2: [90, a, a], j1: [96, 52, 52], j2: [94, 50, 50], ls: Object.assign({}, ls)});
S.e5 = {vue: 'face', poses: [e5(4, {ab2: .45}), e5(180)], duree: 1.2, tenue: .9,
  fond: () => O.tapis(-110, 110),
  avant: J => O.haltere(J.main2, 0, .75) + `<circle cx="${J.coude2[0]}" cy="${J.coude2[1] + 5}" r="4" fill="#f28b82" stroke="#c4554c"/>`,
  legendes: ['Couché sur le côté droit, serviette sous le coude, haltère devant le ventre', 'Lève l\'avant-bras vers le plafond sans décoller le coude, redescends en 2-3 s']};

// e6 : planche, touches d'épaule (vu du côté droit)
const planche = () => ({x: 0, y: -50, t: 112, h: 120, b1: [0, 0, 90], b2: [-2, -2, 92], j1: [-68, -68, -10], j2: [-69, -69, -8]});
const e6a = planche(), e6b = ik(planche(), 'cote', 'b1', D.squelette(planche(), 'cote').epaule2.map((v, i) => v + [6, 4][i]), -1), e6c = ik(planche(), 'cote', 'b2', D.squelette(planche(), 'cote').epaule1.map((v, i) => v + [4, 2][i]), -1);
S.e6 = {miroir: true, poses: [e6a, e6b, e6c], seq: [0, 1, 0, 2], duree: .9, tenue: .6, fond: () => O.tapis(-100, 60),
  legendes: ['Planche bras tendus, pieds largeur de hanches', 'Une main touche l\'épaule opposée, revient', 'Puis l\'autre. Le bassin ne tangue pas']};

// e7 : ballon contre le mur, petits cercles
S.e7 = {poses: [debout({b1: [87, 87, 175], b2: [-4, -2]}), debout({b1: [93, 93, 182], b2: [-4, -2]})], seq: [0, 1], duree: .4, tenue: .05,
  fond: () => O.mur(84, 1), avant: (J, i, Js) => O.foot([73, Js[0].main1[1] + 1], 11) + rot([73, Js[0].main1[1] - 2], 18, 0, 300),
  legendes: ['Bras tendu à hauteur d\'épaule, main à plat sur le ballon contre le mur', 'Petits cercles rapides de la taille d\'une assiette']};

// e8 : kettlebell à l'envers en marchant
const pas_ = k => debout({b1: [84, 178, 178], m1: 'poing', b2: [k ? -16 : 16, k ? -10 : 22], j1: [k ? 18 : -14, k ? 8 : -24, 90], j2: [k ? -14 : 18, k ? -24 : 8, 90]});
S.e8 = {poses: [pas_(0), pas_(1)], duree: .8, tenue: .1,
  avant: J => O.kettle(dec(J.main1, -1, 2), 180),
  fond: (J, i, Js) => fl(dec(Js[0].bassin, 50, 60), dec(Js[0].bassin, 100, 60), 0),
  legendes: ['Kettlebell à l\'envers, coude à hauteur d\'épaule, poignet droit', 'Marche 20 m en la gardant bien verticale']};

// eD : lancer main gauche (armé, frappe, fin)
const lancer = (b1, t, j1, j2, b2) => debout({b1, t, h: t, j1, j2, b2});
S.eD = {poses: [lancer([-120, 170, 170], 186, [-14, -6, 90], [18, 4, 90], [60, 70, 70]), lancer([168, 150, 150], 182, [-6, -10, 90], [14, 6, 90], [30, 10, 10]), lancer([40, 30, 30], 166, [-22, -40, 70], [16, 10, 90], [-20, -10, -10])],
  seq: [0, 1, 2], duree: .45, tenue: .7,
  avant: (J, i) => i === 0 ? O.balle(dec(J.main1, 1, -2), 3.6) : '',
  legendes: ['Armé : coude haut, balle derrière la tête, poids sur la jambe arrière', 'Jambes, puis rotation du tronc, puis bras : frappe devant toi', 'Le bras finit sa course vers le bas']};

// e9 / s13 : bras croisé devant la poitrine (de face)
const croise = (k) => face({b2: [-88, -92, -92], b1: [-6, 120 + k, 120 + k], ordre: ['milieu', 'jambe1', 'jambe2', 'short', 'tronc', 'tete', 'bras2', 'bras1']});
S.e9 = {vue: 'face', poses: [croise(0)], avant: J => O.zone(dec(J.epaule2, 4, 0), 13), legendes: ['Bras gauche tendu devant la poitrine, la main droite tire doucement le coude. Étirement à l\'arrière de l\'épaule']};
S.s13 = S.e9;

// ---------- SOUPLESSE ----------
// s3 : livre ouvert (vu de dessus, couché sur le côté)
const s3 = a => ({x: 0, y: 0, t: -90, h: a < 90 ? -60 : -90, b1: [a, a, a], b2: [178, 178, 178], j1: [178, 92, 90], j2: [176, 90, 88]});
S.s3 = {dessus: true, poses: [s3(178), s3(4)], duree: 2.2, tenue: .9, ratio: 1.3,
  fond: () => '<rect x="-80" y="-60" width="160" height="110" rx="8" fill="#bfe3d6" opacity=".7"/>',
  avant: (J, i, Js) => i === 0 ? D.rotation(Js[0].epaule1, 40, 260, 450, undefined, 1) : '',
  legendes: ['Couché sur le côté, genoux pliés à 90°, bras tendus devant toi l\'un sur l\'autre', 'Ouvre le bras du dessus comme une page de livre, suis ta main des yeux. Les genoux restent collés']};
// s4 : posture de l'enfant
S.s4 = {poses: [{x: 0, y: -34, t: 74, h: 80, b1: [80, 90, 90], b2: [81, 91, 91], j1: [58, -92, -94], j2: [60, -92, -94], cuisseDevant: true}], fond: () => O.tapis(-60, 110),
  avant: J => ondes(dec(J.bassin, 10, -18), 7),
  legendes: ['Fesses vers les talons, bras allongés devant, front posé. Respire dans le ventre']};
// s5 : fente basse
const s5 = x => { let P = {x, y: -46, t: 180, h: 180, sol: false, b1: [40, 80], b2: [36, 78], j1: [80, 0, 90], j2: [-30, -90, -90]};
  P = ik(P, 'cote', 'j1', [42, -8], 1, 90); P = ik(P, 'cote', 'j2', [-84, -6], -1, -92);
  const J = D.squelette(P, 'cote'); P = ik(P, 'cote', 'b1', dec(J.genou1, -2, -8), -1, 100); return ik(P, 'cote', 'b2', dec(J.genou1, -4, -8), -1, 100); };
S.s5 = {poses: [s5(-3), s5(5)], duree: 2, tenue: 1, fond: (J, i, Js) => O.coussin([Js[0].genou2[0], -3], 26, 7),
  avant: (J, i, Js) => O.zone(dec(J.hanche2, 9, 2), 12),
  legendes: ['Genou arrière sur un coussin, l\'autre pied devant, genou à 90°', 'Serre la fesse arrière et avance un peu le bassin, sans creuser le dos']};
// s6 : quadriceps couché sur le côté (vu de dessus)
const s6 = () => { const P = {x: 0, y: 0, sol: false, t: -90, h: -90, b2: [-92, -92, -92], b1: [80, 60], j1: [102, -68, -150], j2: [91, 90, 90]};
  return ik(P, 'cote', 'b1', D.squelette(P, 'cote').cheville1, 1); };
S.s6 = {dessus: true, poses: [s6()], ratio: 1.6, fond: () => '<rect x="-110" y="-40" width="220" height="70" rx="8" fill="#bfe3d6" opacity=".7"/>',
  avant: J => O.zone(mil(J.hanche1, J.genou1), 14), legendes: ['Attrape la cheville du dessus, talon vers la fesse. Les genoux restent l\'un à côté de l\'autre']};
// s7 : arrière de la cuisse avec une sangle
const s7 = a => { let P = surDos({j1: [a, a, a - 90], j2: [91, 90, 178]}); const J = D.squelette(D.prepare(P, 'cote'), 'cote');
  const m = mil(J.epaule1, J.cheville1, .62); P = ik(P, 'cote', 'b1', m, 1); return ik(P, 'cote', 'b2', dec(m, -2, 2), 1); };
S.s7 = {poses: [s7(150), s7(172)], duree: 2.5, tenue: 1.2, fond: () => O.tapis(-80, 110),
  avant: J => O.sangle(J.main1, dec(J.orteil1, -3, -2), 6) + O.zone(mil(J.hanche1, J.genou1, .5), 13),
  legendes: ['Sangle sous le pied, jambe vers le plafond, genou très légèrement plié', 'Monte doucement, le bassin et le bas du dos restent posés']};
// s8 : fessier en 4
const s8 = a => { let P = surDos({j1: [a, 92, 100], j2: [150, 40, 90], cuisseDevant: true}); const J = D.squelette(D.prepare(P, 'cote'), 'cote');
  P.ls = {cu2: .78}; P = ik(P, 'cote', 'j2', dec(J.genou1, 2, -4), 1, 100); P = ik(P, 'cote', 'b1', mil(J.hanche1, J.genou1, .7), 1); return ik(P, 'cote', 'b2', mil(J.hanche1, J.genou1, .6), 1); };
S.s8 = {poses: [s8(150), s8(172)], duree: 2.2, tenue: 1, fond: () => O.tapis(-80, 90),
  legendes: ['Cheville droite posée sur le genou gauche', 'Ramène la cuisse gauche vers toi : tu sens la fesse droite']};
// s9 : mollets contre le mur
const s9 = (plie) => { let P = {x: 0, y: -90, t: 162, h: 170, j1: plie ? [-6, -34, 90] : [-24, -24, 90], j2: [24, -6, 90]};
  const J = D.squelette(P, 'cote'); P = ik(P, 'cote', 'b1', [J.epaule1[0] + 46, J.epaule1[1] + 4], -1, 180); return ik(P, 'cote', 'b2', [J.epaule1[0] + 46, J.epaule1[1] + 6], -1, 180); };
S.s9 = {poses: [s9(false), s9(true)], duree: 1.6, tenue: 1.4,
  fond: (J, i, Js) => O.mur(Js[0].main1[0] - 2, 1), avant: J => O.zone(mil(J.genou1, J.cheville1, .4), 12),
  legendes: ['Mains au mur, jambe arrière tendue, talon au sol : 30 s', 'Puis plie un peu le genou arrière, talon toujours au sol : 30 s']};
// s10 : côté de la hanche, jambes croisées (de face)
const s10 = k => face({t: 180 - 7 * k, h: 180 - 4 * k, x: -6 * k, j1: [10, 12, 12], j2: [-1, 0, 0], b1: hanchesF.b1, b2: k ? [168, -150, -150] : hanchesF.b2});
S.s10 = {vue: 'face', poses: [s10(0), s10(1)], duree: 2, tenue: 1.2,
  avant: (J, i, Js) => O.zone(dec(J.hanche1, -6, 4), 13) + (i === 0 ? fl(dec(Js[0].hanche1, -14, 0), dec(Js[0].hanche1, -30, 0), 0) : ''),
  legendes: ['Debout, croise la jambe droite derrière la gauche', 'Pousse doucement la hanche droite vers la droite, bras gauche au-dessus de la tête']};
// s11 : papillon (de face)
const s11 = () => { let P = face({y: -40, t: 180, j1: [-68, 62, 80], j2: [68, -62, -80], ls: {cu1: .9, cu2: .9}}); const J = D.squelette(D.prepare(P, 'face'), 'face');
  P = ik(P, 'face', 'b1', dec(J.cheville1, -1, -4), -1); return ik(P, 'face', 'b2', dec(J.cheville2, 1, -4), 1); };
S.s11 = {vue: 'face', poses: [s11()], avant: J => ondes(dec(J.bassin, 0, -40), 7), legendes: ['Plantes des pieds collées, genoux qui tombent tout seuls, dos droit. On ne pousse pas sur les genoux']};
// s12 : bébé heureux
const s12 = () => { let P = surDos({j1: [-150, 180, -90], j2: [-146, 178, -88], cuisseDevant: true}); const J = D.squelette(D.prepare(P, 'cote'), 'cote');
  P = ik(P, 'cote', 'b1', dec(J.cheville1, 2, 2), 1, 180); return ik(P, 'cote', 'b2', dec(J.cheville2, 1, 2), 1, 180); };
S.s12 = {poses: [s12()], fond: () => O.tapis(-80, 60), avant: J => ondes(dec(J.bassin, -24, -22), 6), legendes: ['Attrape tes pieds, genoux vers les aisselles, le bas du dos reste posé']};
// s14 : pectoraux contre une porte, bras bas
const s14 = k => debout({x: 6 * k, t: 180 - 6 * k, h: 178, b1: [-62, 180, 180], b2: [6, 4], j1: k ? [-10, -10, 90] : [0, 0, 90], j2: k ? [22, 4, 90] : [0, 0, 90]});
S.s14 = {poses: [s14(0), s14(1)], duree: 1.8, tenue: 1.2,
  fond: (J, i, Js) => O.porte(Js[0].main1[0] - 4), avant: J => O.zone(dec(J.epaule1, 4, 6), 13),
  legendes: ['Avant-bras contre le montant de la porte, coude plus bas que l\'épaule', 'Avance doucement le buste jusqu\'à sentir l\'étirement devant la poitrine']};
// s15 : mains sur une table
const s15 = k => { let P = debout({x: k ? -30 : 0, t: k ? 92 : 168, h: k ? 92 : 172}); return ik(ik(P, 'cote', 'b1', [64, -79], k ? -1 : -1, 95), 'cote', 'b2', [62, -79], -1, 95); };
S.s15 = {poses: [s15(0), s15(1)], duree: 2, tenue: 1.2, fond: () => O.table(56, 120, 75),
  legendes: ['Mains posées sur la table, recule les pieds', 'Laisse descendre la poitrine, fesses en arrière, dos long']};
// s16 : cou et trapèzes, assis
const s16 = k => face({y: -60, t: 180, h: 180 - 22 * k, j1: [-4, -2, 0], j2: [4, 2, 0], ls: {cu1: .2, cu2: .2}, b1: [-14, -4, -4], b2: [10, 4]});
S.s16 = {vue: 'face', poses: [s16(0), s16(1)], duree: 2, tenue: 1.2, milieu: () => O.marche(-26, 26, 44),
  avant: J => O.zone(dec(J.epaule1, 4, -8), 12),
  legendes: ['Assis, une main sous la fesse du même côté', 'Penche doucement l\'oreille opposée vers l\'épaule']};
// s17 : relâchement final, mollets sur le canapé
S.s17 = {poses: [ppPose({b1: [84, 88, 88], ve: 2})], fond: J => O.tapis(-80, 70) + O.canape(J.genou1[0] - 4, J.genou1[0] + 70, -J.genou1[1] - 5.5),
  avant: J => ondes(dec(J.bassin, -24, -24), 7), legendes: ['Mollets sur le canapé, respire lentement, laisse peser le corps dans le sol']};

// ---------- ÉCHAUFFEMENT PADEL (une planche par étape) ----------
const course = k => debout({t: 172, h: 174, b1: k ? [40, 140] : [-40, 70], b2: k ? [-40, 70] : [40, 140], j1: k ? [40, -50, 100] : [-20, -80, 40], j2: k ? [-20, -80, 40] : [40, -50, 100], sol: -4});
const fenteLat = k => face(Object.assign({t: 180 + 4 * k, j1: k > 0 ? [-48, -48, -48] : [-52, 12, 0], j2: k > 0 ? [52, -12, 0] : [48, 48, 48], x: 0}, hanchesF));
const balance = a => debout({j1: [a, a * .6, 90], b2: [40, 40], b1: [6, 4]});
S.w = [
  {titre: 'Trottinement et pas chassés', poses: [course(0), course(1)], duree: .35, tenue: .05, legendes: ['Trottine, puis pas chassés', '']},
  Object.assign({titre: 'Serrages de ballon, 5 s'}, S.p8),
  {titre: 'Fentes latérales douces', vue: 'face', poses: [fenteLat(1), fenteLat(-1)], duree: 1.4, tenue: .6, legendes: ['Fente latérale douce d\'un côté…', '…puis de l\'autre']},
  {titre: 'Balancements de jambe', poses: [balance(45), balance(-30)], duree: .8, tenue: .05, fond: (J, i, Js) => O.mur(Js[0].main2[0] + 2, 1), legendes: ['Balance la jambe vers l\'avant…', '…et vers l\'arrière, puis sur les côtés']},
  {titre: 'Accélérations', poses: [course(0), course(1)], duree: .25, tenue: 0, avant: (J, i, Js) => fl(dec(Js[0].bassin, 40, 70), dec(Js[0].bassin, 110, 70), 0), legendes: ['Accélérations et changements de direction à 50 %, puis 70 %', '']}
];
})();

// Les points importants, affichés en gros sous le schéma
window.RENFO_CLES = {
  p0: ['Une seule fois, 3 secondes, le plus fort possible', 'Note tout de suite la douleur sur 10'],
  p1: ['Ballon serré du début à la fin', 'Expire longuement en arrondissant le dos', 'Genoux à peine décollés'],
  p2: ['Le bassin reste posé au sol', 'Grands cercles, sans douleur'],
  p3: ['Le genou ne bouge pas', 'Seul le tibia bascule dehors puis dedans', 'Tiens-toi au mur si besoin'],
  p4: ['Jambe d\'appui et bassin immobiles', 'Reste grand, monte le genou haut'],
  p5: ['Buste droit, c\'est le bassin qui roule', 'Inspire vers l\'avant, expire vers l\'arrière'],
  p6: ['Genoux tendus', 'Seul le bassin bouge'],
  p6b: ['Descente lente : 4 secondes', 'Genou gauche dans l\'axe du 2e orteil', 'Douleur 3/10 maximum'],
  p7: ['Bras croisés, descends en fente latérale', 'Si ça tire dans l\'aine, monte la corde'],
  p8: ['Serre juste sous le seuil de douleur', 'Relâche tout entre chaque serrage'],
  p8b: ['Genoux au-dessus des chevilles', 'Moins bas si le genou fait mal'],
  p9: ['L\'aller est lent, tu freines', 'Le retour se fait avec les bras sur le bâton', 'Petite amplitude tant que ça fait mal'],
  p10: ['Corps droit, bassin fixe', 'Seule la jambe du dessous bouge', 'Si le bassin tombe : étape d\'avant'],
  p10b: ['Retour lent en 3 secondes', 'Le buste reste droit'],
  p11: ['Bassin haut, il ne tourne pas', 'Un bras après l\'autre, lentement'],
  p12: ['Près d\'un mur ou d\'un canapé', 'Le bassin ne bouge pas quand les bras montent'],
  pp: ['On relâche, on ne pousse pas', 'Expire plus long que l\'inspiration', 'Mâchoire et fesses détendues'],
  e0: ['Petits cercles puis grands', 'Élastique léger, coude au corps'],
  e1: ['Corps droit, pas de creux dans le dos', 'Le « plus » : bras tendus, pousse encore 2-3 cm'],
  e2: ['Omoplates « dans les poches arrière »', 'Pouces vers le plafond', 'On monte de quelques centimètres seulement'],
  e3: ['Coudes vers l\'arrière, collés au corps', 'Épaules basses, serre les omoplates 1 s'],
  e4: ['Le coude reste à hauteur d\'épaule', 'Monte en 1 s, redescends en 3-4 s', 'Pas de cambrure'],
  e4b: ['Coude toujours à hauteur d\'épaule', 'Le buste ne bouge pas'],
  e5: ['Le coude reste collé sur la serviette', 'Ne roule pas le buste en arrière'],
  e6: ['Lentement', 'Le bassin ne tangue pas (un verre d\'eau sur le dos)'],
  e7: ['Bras tendu, épaule basse', 'Petits cercles rapides'],
  e8: ['Kettlebell bien verticale', 'Poignet droit, serre fort'],
  eD: ['Jambes, puis tronc, puis bras', 'Frappe devant toi, sans forcer'],
  e9: ['Épaule basse', 'Étirement doux à l\'arrière. Si ça pince devant, arrête'],
  w: ['Manchons au genou gauche', 'Progressif : de 50 % à 70 %'],
  s1: ['Inspire 4 s, expire 6 s', 'Le ventre gonfle, la poitrine bouge peu'],
  s2: ['Lent, au rythme de la respiration', 'Sans forcer au bout'],
  s3: ['Les genoux restent collés', 'La rotation vient du haut du dos', 'Côté droit : bras sous la hauteur de l\'épaule'],
  s4: ['Genoux moins écartés si l\'aine tire', 'Respire dans le ventre et le bas du dos'],
  s5: ['Serre la fesse arrière', 'Jamais dans l\'aine, 3/10 maximum'],
  s6: ['Genoux l\'un à côté de l\'autre', 'Serviette autour de la cheville si besoin'],
  s7: ['Bassin et bas du dos posés', 'Doux, sans tirer'],
  s8: ['Si ça gêne dans l\'aine, ramène moins'],
  s9: ['Talon toujours au sol', '30 s jambe tendue, puis 30 s genou plié'],
  s10: ['Côté droit : main sur la hanche, pas le bras en l\'air'],
  s11: ['On ne pousse jamais sur les genoux', 'Dos droit, respire dans le ventre'],
  s12: ['Le bas du dos reste posé', 'Respire dans le ventre'],
  s13: ['Épaule basse', 'Si ça pince devant, arrête'],
  s14: ['Coude plus bas que l\'épaule', 'Doucement, sans forcer'],
  s15: ['Dos long, fesses en arrière', 'Arrête-toi avant la moindre gêne à droite'],
  s16: ['Tout doucement, l\'épaule reste basse'],
  s17: ['Laisse peser le corps', 'Respire lentement']
};

// ---------- DÉTENTE DU PLANCHER PELVIEN ----------
(function () {
const S = window.RENFO_SCHEMAS, D = window.RENFO_DESSIN, O = D.O, fl = D.fleche, ondes = D.ondes, surDos = D.surDos, face = D.face, ik = D.ik, C = window.RENFO_CLES;
const dec = (p, dx, dy) => [p[0] + dx, p[1] + dy], mil = (a, b, k = .5) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const avec = (id, o) => Object.assign({}, S[id], o);
const canape = J => O.tapis(-80, 70) + O.canape(J.genou1[0] - 4, J.genou1[0] + 70, -J.genou1[1] - 5.5);
const allonge = (o) => surDos(Object.assign({b1: [80, 178, 112], ls: {ab1: .78}, j1: [166, 90, 180], j2: [164, 88, 178]}, o));
S.d1 = {poses: [allonge({ve: 4}), allonge({ve: -.5})], duree: 2.2, tenue: 1.4, fond: canape,
  avant: (J, i) => i === 0 ? ondes(dec(J.bassin, -24, -26), 7) : '',
  legendes: ['Inspire 4 s par le nez : le ventre gonfle', 'Expire 6 s par la bouche : le corps se pose dans le sol']};
S.d2 = {poses: [allonge({ve: 4}), allonge({ve: -.5})], duree: 2.2, tenue: 1.4, fond: canape,
  avant: (J, i) => O.zone(dec(J.bassin, 6, 6), i === 0 ? 15 : 9) + (i === 0 ? fl(dec(J.bassin, 10, -6), dec(J.bassin, 10, 6), 0, '#38a3d1') : ''),
  legendes: ['Inspire : le ventre gonfle, le fond du bassin descend et s\'ouvre (sans pousser)', 'Expire lèvres pincées : il remonte tout seul, sans serrer']};
const bascule = v => surDos({v, b1: [84, 88, 88]});
S.d3 = {poses: [bascule(-2.5), bascule(2)], duree: 2.4, tenue: .6, fond: () => O.tapis(-80, 80),
  avant: (J, i, Js) => D.rotation(dec(Js[0].bassin, -2, -4), 14, 200, 330, '#ff6b2c', .6),
  legendes: ['Inspire : petit creux sous le bas du dos', 'Expire : le bas du dos s\'enfonce doucement dans le sol']};
const genou = () => { let P = surDos({j2: [91, 90, 178], j1: [-158, 12, 90], cuisseDevant: true}); const J = D.squelette(D.prepare(P, 'cote'), 'cote');
  P = ik(P, 'cote', 'b1', dec(J.genou1, 4, 4), 1); return ik(P, 'cote', 'b2', dec(J.genou1, 2, 6), 1); };
S.dK = {poses: [genou()], fond: () => O.tapis(-80, 100), avant: J => ondes(dec(J.bassin, -26, -22), 6), legendes: ['Une jambe allongée, ramène doucement l\'autre genou vers la poitrine']};
S.d4 = avec('s12', {});
// papillon couché, vu de dessus, coussins sous les genoux
const papillon = () => face({x: 0, y: 0, sol: false, t: 180, h: 180, b1: [-14, -8, -8], b2: [14, 8, 8], j1: [-52, 58, 30], j2: [52, -58, -30], ls: {cu1: .9, cu2: .9, ja1: .9, ja2: .9}});
S.d5 = {dessus: true, vue: 'face', poses: [papillon()],
  fond: (J) => '<rect x="-60" y="-110" width="120" height="200" rx="8" fill="#bfe3d6" opacity=".7"/>' + O.coussin(dec(J.genou1, -6, 0), 22, 14) + O.coussin(dec(J.genou2, 6, 0), 22, 14),
  legendes: ['Plantes des pieds collées, genoux posés sur des coussins, bras relâchés']};
S.d6 = avec('s8', {});
// essuie-glace : vu de dessus, genoux pliés vers le plafond qui basculent
const essuie = k => face({x: 0, y: 0, sol: false, t: 180, h: 180, b1: [-92, -92, -92], b2: [92, 92, 92], j1: [-80 * k, 40 * k, 30 * k], j2: [-64 * k, 54 * k, 40 * k], ls: k ? {cu1: .9, cu2: .9, ja1: .85, ja2: .85} : {cu1: .32, cu2: .32, ja1: .25, ja2: .25}, cache: k ? [] : ['pied1', 'pied2'], ordre: k > 0 ? ['milieu', 'jambe2', 'jambe1', 'short', 'tronc', 'tete', 'bras1', 'bras2'] : undefined});
S.dW = {dessus: true, vue: 'face', poses: [essuie(1), essuie(0), essuie(-1)], seq: [0, 1, 2, 1], duree: 1.2, tenue: .4,
  fond: () => '<rect x="-95" y="-110" width="190" height="180" rx="8" fill="#bfe3d6" opacity=".7"/>',
  avant: (J, i, Js) => i === 0 ? fl(dec(Js[0].genou1, -4, 14), dec(Js[1].genou2, 4, 14), .35, undefined, true) : '',
  legendes: ['Les genoux tombent doucement d\'un côté…', 'Genoux pliés vers le plafond, bras en croix', '…puis de l\'autre. Les épaules restent posées']};
S.d7 = avec('s4', {});
// accroupi sur un petit tabouret
const tabouret = () => { let P = {x: 0, y: -36, sol: false, t: 158, h: 166, j1: [112, 0, 90], j2: [110, -2, 90], b1: [20, 80], b2: [16, 78]};
  P = ik(P, 'cote', 'j1', [38, -8], 1, 92); P = ik(P, 'cote', 'j2', [36, -8], 1, 92); const J = D.squelette(P, 'cote');
  P = ik(P, 'cote', 'b1', dec(J.genou1, -2, -6), -1, 60); return ik(P, 'cote', 'b2', dec(J.genou1, -4, -6), -1, 60); };
S.d8 = {poses: [tabouret()], fond: () => O.marche(-16, 16, 24), avant: J => ondes(dec(J.bassin, 26, -26), 6) + O.zone(dec(J.bassin, 4, 6), 11),
  legendes: ['Assis sur un tabouret bas, genoux plus hauts que les hanches, avant-bras sur les cuisses. Respire']};
S.d9 = avec('s2', {});
S.d10 = {poses: [allonge({b1: [84, 88, 88], ve: 2})], fond: canape, avant: J => ondes(dec(J.bassin, -24, -24), 7),
  legendes: ['À chaque expiration, relâche une zone : mâchoire, épaules, ventre, fesses, puis le fond du bassin']};
Object.assign(C, {
  d1: ['Mollets sur le canapé, main sur le ventre', 'Inspire 4 s, expire 6 s'],
  d2: ['Inspire : le fond du bassin s\'ouvre, sans pousser', 'Expire : il remonte tout seul, sans serrer', 'Jamais de Kegel'],
  d3: ['Tout petit mouvement, au rythme du souffle', 'Les fesses restent posées'],
  dK: ['Doux, sans tirer', 'Si l\'aine pince, genou un peu vers l\'extérieur'],
  d4: ['Le bas du dos reste posé', 'Si l\'aine tire : mains derrière les genoux'],
  d5: ['Les coussins portent les genoux', 'On n\'étire pas, on se pose'],
  d6: ['Si ça gêne dans l\'aine, ramène moins'],
  dW: ['Lentement, épaules posées', 'Amplitude sans douleur'],
  d7: ['Genoux moins écartés si l\'aine tire', 'Respire dans le bas du dos'],
  d8: ['Le tabouret porte ton poids', 'On relâche, on ne pousse pas'],
  d9: ['Le plus lentement possible'],
  d10: ['Commence par la mâchoire', 'Finis par le fond du bassin']
});
})();
