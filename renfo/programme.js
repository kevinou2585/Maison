// Renforcement : tout le programme de Kevin (exercices, doses par niveau, séances, routines de la semaine).
// Source : renfo/recap-programme-kevin.md (projet « Santé et bien être », novembre 2026).
// Doses : d = texte affiché, s = séries, r = répétitions, t = tenue en secondes (0 = compteur),
// rel = relâchement entre deux tenues, p = repos entre les séries, c = 2 si on fait gauche puis droite,
// m = minutes, installation et repos compris (sert à estimer la durée : une séance ne dépasse jamais 45 min).
const VIDEO = 'https://www.youtube.com/watch?v=kA8b7uPPZ6E';

const NIVEAUX = {
  douce: {nom: 'Douce', ico: '🌱', txt: "J'ai un peu mal : je fais du bien sans en rajouter."},
  normale: {nom: 'Normale', ico: '💪', txt: 'Ça va : la séance prévue.'},
  forte: {nom: 'À fond', ico: '🔥', txt: 'Aucune douleur : je suis prêt à travailler.'}
};

const COULEURS = {
  vert: ['🟢', 'Facile'], orange: ['🟠', 'Moyen'], rouge: ['🔴', 'Difficile'], option: ['🔵', 'Option'],
  epaule: ['🔷', 'Épaule'], souple: ['🟣', 'Souplesse'], calme: ['⚪', 'Calme']
};

const EX = {
  // ---------------- PUBALGIE ----------------
  p0: {nom: 'Test du ballon', coul: 'option', type: 'test',
    quoi: "Ce n'est pas un exercice, c'est le baromètre de ta pubalgie.",
    comment: ['Sur le dos, genoux pliés, ballon (ou coussin ferme) entre les genoux.', 'Serre le plus fort possible pendant 3 secondes, une seule fois.', 'Note la douleur sur 10.'],
    conseil: '0-2 : feu vert · 3-4 : prudence, pas de hausse de charge · 5 et plus : on allège · +2 points par rapport à la dernière fois : alerte.',
    niv: {douce: {d: '1 × 3 s', m: 1}, normale: {d: '1 × 3 s', m: 1}, forte: {d: '1 × 3 s', m: 1}}},
  p1: {nom: 'Dos plat / dos rond à quatre pattes', coul: 'rouge', video: 1,
    comment: ['À quatre pattes, orteils retournés, ballon serré entre les genoux.', 'Départ dos plat, tête dans l\'alignement (inspire).', 'Décolle légèrement les genoux du sol, ballon toujours serré, rentre le bas du ventre et arrondis le dos (expire).'],
    conseil: 'Expire longuement en arrondissant le dos : le muscle profond du ventre travaille avec les adducteurs pour verrouiller le pubis.',
    niv: {douce: {d: '8 répétitions, genoux posés au sol (petite amplitude)', s: 1, r: 8, m: 1.5},
      normale: {d: '10 répétitions', s: 1, r: 10, m: 2}, forte: {d: '12 répétitions, 2 s en haut', s: 1, r: 12, m: 2}}},
  p2: {nom: 'Cercles de jambe, pied sur le ballon de Klein', coul: 'vert', video: 1,
    comment: ['Sur le dos, bras croisés sur la poitrine, une jambe tendue au sol.', 'Le pied de l\'autre jambe est posé sur le gros ballon.', 'Fais rouler le ballon avec le pied : plie le genou, ouvre sur le côté, tends, ramène vers l\'intérieur.'],
    conseil: 'Va au maximum de l\'amplitude sans douleur. Le bassin reste posé au sol.',
    niv: {douce: {d: '6 cercles dans chaque sens, par jambe', s: 2, r: 6, c: 2, p: 5, m: 3},
      normale: {d: '6 cercles dans chaque sens, par jambe', s: 2, r: 6, c: 2, p: 5, m: 3}, forte: {d: '8 cercles dans chaque sens, par jambe', s: 2, r: 8, c: 2, p: 5, m: 3}}},
  p3: {nom: 'Rotations de hanche debout, genou levé', coul: 'orange', video: 1,
    comment: ['Debout, mains sur les hanches, un genou levé haut.', 'Le genou reste fixe : seuls le tibia et le pied basculent vers l\'extérieur puis vers l\'intérieur.'],
    conseil: 'Tiens-toi à un mur si l\'équilibre gêne : la rotation compte plus que l\'équilibre.',
    niv: {douce: {d: '6 par côté, tenu au mur', s: 1, r: 6, c: 2, m: 1.5}, normale: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2}, forte: {d: '10 par côté, sans appui', s: 1, r: 10, c: 2, m: 2}}},
  p4: {nom: 'Passage de haie (ou de chaise basse)', coul: 'rouge', video: 1,
    comment: ['Debout, mains sur les hanches, haie basse (ou chaise d\'enfant) sur le côté.', 'Écarte la jambe, monte le genou bien haut, passe par-dessus, reviens par le même chemin.'],
    conseil: 'La jambe d\'appui et le bassin restent immobiles. Reste grand.',
    niv: {douce: {d: '6 par côté, obstacle plus bas', s: 1, r: 6, c: 2, m: 2}, normale: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2.5}, forte: {d: '10 par côté, lentement', s: 1, r: 10, c: 2, m: 2.5}}},
  p5: {nom: 'Bassin dans toutes les directions, assis sur le ballon', coul: 'vert', video: 1,
    comment: ['Assis sur le ballon de Klein, pieds au sol, bras croisés.', 'Fais rouler le ballon avec le bassin : avant/arrière, droite/gauche, puis des cercles. Buste droit.'],
    conseil: 'Inspire quand le bassin part vers l\'avant, expire vers l\'arrière.',
    niv: {douce: {d: '8 dans chaque direction, puis 4 cercles dans chaque sens', s: 1, r: 8, m: 2}, normale: {d: '8 dans chaque direction, puis 4 cercles dans chaque sens', s: 1, r: 8, m: 2},
      forte: {d: '10 dans chaque direction, puis 5 cercles dans chaque sens', s: 1, r: 10, m: 2}}},
  p6: {nom: 'Bascule du bassin sur une marche', coul: 'orange', video: 1,
    comment: ['Debout sur une marche, bras croisés sur la poitrine, une jambe tendue dans le vide.', 'Genoux tendus : laisse descendre la jambe libre en basculant le bassin, puis remonte-la lentement.'],
    conseil: 'Seul le bassin bouge. Très utile avec ta différence de longueur de jambes.',
    niv: {douce: {d: '8 par côté', s: 1, r: 8, c: 2, m: 1.5}, normale: {d: '10 par côté', s: 1, r: 10, c: 2, m: 2}, forte: {d: '12 par côté, 2 s en haut', s: 1, r: 12, c: 2, m: 2}}},
  p6b: {nom: 'Descente de marche lente (genou gauche)', coul: 'option', option: 1, suivi: 'marche',
    quoi: 'Pour le syndrome rotulien.',
    comment: ['Debout sur la marche, sur la jambe gauche.', 'Plie lentement le genou gauche pour aller toucher le sol devant avec le talon droit, en 4 secondes, puis remonte.', 'Le genou gauche reste dans l\'axe du 2e orteil, il ne rentre pas vers l\'intérieur.'],
    conseil: 'Progression : marche de 10 cm → 15 cm → 20 cm. Douleur 3/10 maximum. Note la douleur du genou après.',
    niv: {douce: {d: '2 × 8, jambe gauche, marche plus basse', s: 2, r: 8, p: 30, m: 2.5}, normale: {d: '3 × 8, jambe gauche', s: 3, r: 8, p: 30, m: 3.5}, forte: {d: '3 × 10, jambe gauche (la droite aussi si tu veux)', s: 3, r: 10, p: 30, m: 3.5}}},
  p7: {nom: 'Passage sous la haie (ou la corde)', coul: 'rouge', video: 1,
    comment: ['Haie ou corde à environ 1 m.', 'Bras croisés : descends en fente latérale basse pour passer dessous, remonte de l\'autre côté, puis reviens.'],
    conseil: '⚠ Exigeant pour l\'adducteur droit. Si ça tire, monte la corde pour descendre moins bas.',
    niv: {douce: {d: '6 passages de chaque côté, corde plus haute', s: 1, r: 6, c: 2, m: 2}, normale: {d: '8 passages de chaque côté', s: 1, r: 8, c: 2, m: 2.5}, forte: {d: '10 passages de chaque côté', s: 1, r: 10, c: 2, m: 3}}},
  p8: {nom: 'Serrage du ballon entre les genoux', coul: 'vert', video: 1,
    comment: ['Sur le dos, genoux pliés, ballon de foot entre les genoux.', 'Serre, tiens, relâche complètement.'],
    conseil: 'Serre juste en dessous du seuil de douleur. Relâche bien entre chaque, périnée compris.',
    niv: {douce: {d: '15 × 5 s, en douceur', s: 1, r: 15, t: 5, rel: 5, m: 3}, normale: {d: '12 × 5 s', s: 1, r: 12, t: 5, rel: 5, m: 2.5}, forte: {d: '10 × 10 s', s: 1, r: 10, t: 10, rel: 5, m: 3}}},
  p8b: {nom: 'Chaise contre le mur (genou)', coul: 'option', option: 1,
    quoi: 'Pour le syndrome rotulien.',
    comment: ['Dos au mur, descends jusqu\'à ce que les genoux soient pliés entre 60° et 90° (moins bas si ça fait mal).', 'Genoux au-dessus des chevilles. Tiens sans bouger.', 'Bonus : un ballon entre les genoux, serré doucement.'],
    conseil: 'Le statique calme la douleur rotulienne. Possible juste avant le padel les jours où le genou est sensible.',
    niv: {douce: {d: '3 × 30 s, pas trop bas', s: 3, r: 1, t: 30, p: 30, m: 3}, normale: {d: '3 × 30 s', s: 3, r: 1, t: 30, p: 30, m: 3}, forte: {d: '3 × 45 s, ballon serré', s: 3, r: 1, t: 45, p: 30, m: 3.5}}},
  p9: {nom: 'Glissé latéral à genoux', coul: 'orange', video: 1,
    comment: ['À genoux, buste droit. Un genou sur un coussin en mousse (fixe), l\'autre sur un disque glissant (ou un torchon sur le carrelage).', 'Tiens un bâton planté au sol.', 'Laisse glisser le genou vers l\'extérieur lentement, en freinant.', 'Pour revenir, tire avec les bras sur le bâton.'],
    conseil: '⚠ La vidéo dit « retour assisté » : l\'adducteur travaille seulement à l\'aller. C\'est au retour que ta hanche droite bloque, donc reviens avec les bras. Amplitude réduite tant que ça fait mal.',
    niv: {douce: {d: '8 par côté, petite amplitude', s: 1, r: 8, c: 2, m: 2.5}, normale: {d: '10 par côté', s: 1, r: 10, c: 2, m: 3}, forte: {d: '12 par côté', s: 1, r: 12, c: 2, m: 3}}},
  p10: {nom: 'Copenhague sur banc', coul: 'rouge', video: 1, copenhague: 1,
    comment: ['Sur le côté, main au sol bras tendu (plus facile : sur le coude).', 'Bassin en l\'air et fixe, corps droit des épaules aux pieds.', 'Jambe du dessus posée sur le banc (par le genou au niveau 1, par la cheville au niveau 2) : c\'est elle qui travaille le plus.', 'Jambe du dessous libre : la seule qui bouge. Elle descend toucher le sol, puis remonte se coller sous le banc.'],
    conseil: 'Monte, tiens 2 s, redescends lentement. Si le bassin tombe, reviens à l\'étape d\'avant. On passe à l\'étape suivante quand la précédente ne fait plus mal, ni pendant ni le lendemain.',
    niv: {normale: {m: 4}, forte: {m: 4.5}}},
  p10b: {nom: 'Adduction debout à l\'élastique', coul: 'option', option: 1,
    comment: ['Élastique attaché à un poteau bas, sur le côté, et à la cheville.', 'Pars jambe écartée, ramène-la devant l\'autre, puis laisse-la repartir lentement (3 s).'],
    conseil: 'Alternative plus douce au Copenhague les jours où ça tire.',
    niv: {douce: {d: '2 × 12 par côté, retour en 3 s', s: 2, r: 12, c: 2, p: 20, m: 3}, normale: {d: '1 × 12 par côté', s: 1, r: 12, c: 2, m: 1.5}, forte: {d: '1 × 15 par côté', s: 1, r: 15, c: 2, m: 1.5}}},
  p11: {nom: 'Gainage sur le dos, haut du dos sur un coussin instable', coul: 'vert', video: 1,
    comment: ['Haut du dos sur un coussin d\'équilibre gonflable (ou le ballon), jambes tendues, talons au sol, bassin décollé : le corps forme une planche.', 'Bras tendus vers le haut avec 1 kg : descends un bras sur le côté, reviens, alterne.'],
    conseil: 'Le bassin ne tourne pas et ne descend pas. Pour corser, quelqu\'un pousse légèrement aux épaules.',
    niv: {douce: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2}, normale: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2}, forte: {d: '10 par côté', s: 1, r: 10, c: 2, m: 2}}},
  p12: {nom: 'Équilibre à genoux sur le ballon', coul: 'rouge', video: 1,
    comment: ['À genoux sur le ballon de Klein (ou un ballon cacahuète, plus stable), buste droit.', 'Lève les bras au-dessus de la tête (avec ou sans bâton) puis redescends, sans que le bassin bouge.'],
    conseil: 'Fais-le près d\'un mur ou d\'un canapé.',
    niv: {douce: {d: '6 montées', s: 1, r: 6, m: 1.5}, normale: {d: '8 montées', s: 1, r: 8, m: 1.5}, forte: {d: '10 montées ou 45 s', s: 1, r: 10, m: 1.5}}},
  pp: {nom: 'Relâcher le plancher pelvien', coul: 'calme', type: 'pp',
    quoi: 'Le but est l\'inverse d\'un exercice de muscu : apprendre à relâcher le « hamac » du fond du bassin (entre les bourses et l\'anus).',
    comment: ['Sur le dos, mollets sur une chaise ou le canapé (ou genoux pliés écartés). Une main sur le ventre. Mâchoire et fesses relâchées.', 'Inspire par le nez 4 s en gonflant le ventre : le fond du bassin s\'ouvre et descend un peu, comme au tout début d\'un pipi. Sans pousser.', 'Expire par la bouche 6 à 8 s, lèvres un peu pincées : le périnée remonte tout seul, sans le serrer.', '10 respirations, puis 1 min de bébé heureux et 1 min de papillon en respirant pareil.'],
    conseil: 'À éviter : pousser comme aux toilettes, bloquer la respiration, serrer fesses, cuisses ou mâchoire, faire des Kegel.',
    niv: {douce: {d: '10 respirations + 2 min', m: 5}, normale: {d: '10 respirations + 2 min', m: 5}, forte: {d: '10 respirations + 2 min', m: 5}}},

  // ---------------- ÉPAULE GAUCHE ----------------
  e0: {nom: 'Échauffement de l\'épaule', coul: 'epaule', bloc: 'Échauffement', type: 'etapes',
    comment: ['Cercles de bras, petits puis grands, dans les deux sens.', 'Rotations légères à l\'élastique, bras le long du corps.'],
    etapes: [['Cercles de bras, vers l\'avant puis vers l\'arrière', 60], ['Rotations externes légères à l\'élastique, coude au corps', 60], ['Rotations internes légères à l\'élastique', 60]],
    niv: {douce: {d: '3 min', m: 3}, normale: {d: '3 min', m: 3}, forte: {d: '3 min', m: 3}}},
  e1: {nom: 'Push-up plus', coul: 'epaule', bloc: 'A. Omoplate',
    quoi: 'Grand dentelé : plaque l\'omoplate contre les côtes et la fait tourner quand tu lèves le bras pour smasher.',
    comment: ['Position de pompe contre un mur les 2-3 premières semaines, puis au sol (sur les genoux, puis sur les pieds).', 'Descends en pompe normale, coudes à environ 45° du corps. Remonte bras tendus.', 'Le « plus » : bras déjà tendus, pousse ENCORE pour arrondir légèrement le haut du dos (omoplates qui s\'écartent de 2-3 cm). Tiens 1 s, relâche.'],
    eviter: 'Creuser le bas du dos, ou faire le « plus » en pliant les coudes. Le mouvement est petit, c\'est normal.',
    niv: {douce: {d: '2 × 10, contre le mur', s: 2, r: 10, p: 45, m: 2}, normale: {d: '3 × 12', s: 3, r: 12, p: 45, m: 3}, forte: {d: '3 × 12, version plus dure (genoux → pieds)', s: 3, r: 12, p: 45, m: 3}}},
  e2: {nom: 'Y à plat ventre', coul: 'epaule', bloc: 'A. Omoplate',
    quoi: 'Trapèze inférieur : tire l\'omoplate vers le bas, stabilise l\'épaule bras en l\'air.',
    comment: ['Couché sur le ventre, front sur une serviette roulée. Bras tendus en Y au-dessus de la tête, pouces vers le plafond.', 'Avant de lever, tire les omoplates vers le bas et l\'arrière (« dans les poches arrière »).', 'Lève les bras de quelques centimètres, tiens 2 s, redescends lentement.'],
    eviter: 'Hausser les épaules vers les oreilles, cambrer le dos pour monter plus haut.',
    niv: {douce: {d: '2 × 8, sans poids', s: 2, r: 8, p: 45, m: 2}, normale: {d: '3 × 10, tenue 2 s', s: 3, r: 10, p: 45, m: 3}, forte: {d: '3 × 10, 0,5 à 1 kg par main', s: 3, r: 10, p: 45, m: 3}}},
  e3: {nom: 'Rowing à l\'élastique', coul: 'epaule', bloc: 'A. Omoplate',
    quoi: 'Rhomboïdes et trapèze moyen : ramènent l\'omoplate en arrière.',
    comment: ['Élastique accroché à la porte à hauteur de poitrine, face à la porte, genoux légèrement fléchis.', 'Tire les coudes vers l\'arrière, collés au corps, serre les omoplates 1 s.', 'Reviens lentement bras tendus.'],
    eviter: 'Tirer avec les poignets en haussant les épaules. Pense « coudes vers l\'arrière ».',
    niv: {douce: {d: '2 × 12, élastique léger', s: 2, r: 12, p: 45, m: 2}, normale: {d: '3 × 15', s: 3, r: 15, p: 45, m: 2.5}, forte: {d: '3 × 15, élastique plus fort', s: 3, r: 15, p: 45, m: 2.5}}},
  e4: {nom: 'Rotation externe à 90/90 (le plus important)', coul: 'epaule', bloc: 'B. Coiffe des rotateurs',
    quoi: 'Infra-épineux et petit rond : freinent le bras pendant et après le smash. La descente lente est la clé.',
    comment: ['Élastique à la porte à hauteur d\'épaule, face à la porte.', 'Bras gauche levé sur le côté, coude à hauteur d\'épaule, plié à 90°, avant-bras vers la porte (position de bandeja).', 'Montée en 1 s : l\'avant-bras pivote jusqu\'à ce que la main pointe vers le plafond (le coude ne bouge pas).', 'Descente en 3-4 s en retenant l\'élastique.'],
    eviter: 'Laisser le coude descendre sous la hauteur de l\'épaule, cambrer le dos pour aider.',
    niv: {douce: {d: '2 × 10, élastique léger', s: 2, r: 10, p: 45, m: 2.5}, normale: {d: '3 × 10', s: 3, r: 10, p: 45, m: 3.5}, forte: {d: '3 × 12, élastique plus fort', s: 3, r: 12, p: 45, m: 3.5}}},
  e4b: {nom: 'Rotation interne à 90/90', coul: 'epaule', bloc: 'B. Coiffe des rotateurs',
    quoi: 'Sous-scapulaire : l\'avant de la coiffe, équilibre l\'exercice précédent.',
    comment: ['Même position de bras, mais dos à la porte. Départ main vers le plafond, élastique tendu derrière.', 'Ramène l\'avant-bras vers l\'avant jusqu\'à l\'horizontale, coude toujours à hauteur d\'épaule.', 'Reviens lentement vers le haut.'],
    eviter: 'Avancer l\'épaule ou le buste pour finir le mouvement.',
    niv: {douce: {d: '1 × 12', s: 1, r: 12, m: 1}, normale: {d: '2 × 12', s: 2, r: 12, p: 45, m: 2}, forte: {d: '3 × 12', s: 3, r: 12, p: 45, m: 2.5}}},
  e5: {nom: 'Rotation externe couché sur le côté', coul: 'epaule', bloc: 'B. Coiffe des rotateurs',
    comment: ['Couché sur le côté droit, tête sur un coussin. Serviette roulée entre le coude gauche et les côtes, coude plié à 90°.', 'Petit haltère (ou bouteille d\'1 L), avant-bras devant le ventre.', 'Lève l\'avant-bras vers le plafond sans décoller le coude, redescends en 2-3 s.'],
    eviter: 'Rouler le buste vers l\'arrière pour monter plus haut. Mieux vaut plus petit et propre.',
    niv: {douce: {d: '1 × 12', s: 1, r: 12, m: 1.5}, normale: {d: '2 × 12', s: 2, r: 12, p: 45, m: 2.5}, forte: {d: '3 × 12', s: 3, r: 12, p: 45, m: 3}}},
  e6: {nom: 'Planche avec touches d\'épaule', coul: 'epaule', bloc: 'C. Stabilité',
    comment: ['Planche haute (bras tendus), pieds écartés largeur de hanches.', 'La main droite touche l\'épaule gauche, revient au sol. Pareil de l\'autre côté, alterne.', 'Le bassin ne tangue pas (un verre d\'eau sur le bas du dos).'],
    eviter: 'Écarter les pieds trop large, aller vite. Trop dur : sur les genoux.',
    niv: {douce: {d: '2 × 20 s, sur les genoux', s: 2, r: 1, t: 20, p: 45, m: 1.5}, normale: {d: '3 × 20 s, lentement', s: 3, r: 1, t: 20, p: 45, m: 2}, forte: {d: '3 × 30 s, lentement', s: 3, r: 1, t: 30, p: 45, m: 2.5}}},
  e7: {nom: 'Ballon contre le mur', coul: 'epaule', bloc: 'C. Stabilité',
    quoi: 'Stabilité réactive : la coiffe garde l\'épaule centrée (ce qui manque la nuit du « cloc »).',
    comment: ['Face au mur, bras gauche tendu à hauteur d\'épaule, main à plat sur un ballon plaqué au mur.', 'Petits cercles rapides de la taille d\'une assiette pendant 20 s, puis change de sens.', 'Après 3-4 semaines : ballon au-dessus de la tête, bras en position de smash.'],
    eviter: 'Plier le coude, hausser l\'épaule.',
    niv: {douce: {d: '2 × 20 s', s: 2, r: 1, t: 20, p: 30, m: 1.5}, normale: {d: '3 × 20 s (change de sens à chaque série)', s: 3, r: 1, t: 20, p: 30, m: 2}, forte: {d: '3 × 20 s, ballon au-dessus de la tête', s: 3, r: 1, t: 20, p: 30, m: 2}}},
  e8: {nom: 'Kettlebell à l\'envers en marchant', coul: 'epaule', bloc: 'C. Stabilité',
    comment: ['Kettlebell légère (4 à 8 kg) à l\'envers : poignée dans la main, boule vers le plafond.', 'Bras plié à 90°, coude à hauteur d\'épaule (ou un peu plus bas), poignet droit, serre fort.', 'Marche 20 m en la gardant verticale. Si elle penche : arrête-toi, recentre, repars.'],
    eviter: 'Prendre trop lourd. Sans kettlebell : un marteau tenu tête en haut, par le bout du manche.',
    niv: {douce: {d: '2 × 20 m', s: 2, r: 1, p: 30, m: 1.5}, normale: {d: '3 × 20 m', s: 3, r: 1, p: 30, m: 2.5}, forte: {d: '3 × 20 m, un peu plus lourd', s: 3, r: 1, p: 30, m: 2.5}}},
  eD: {nom: 'Lancers main gauche', coul: 'epaule', bloc: 'D. Lancers', lancers: 1,
    quoi: 'Ton bras gauche n\'a jamais lancé : on apprend le geste avant les smashs puissants.',
    comment: ['Jambes → rotation du tronc → bras, frappe devant toi.'],
    conseil: 'Semaines 3-4 : smash à vide. Semaines 4-6 : balle de tennis contre un mur à 50 %. Ensuite +10 % par semaine, puis medecine-ball 1-2 kg à deux mains.',
    niv: {normale: {m: 3}, forte: {m: 4}}},
  e9: {nom: 'Étirement bras croisé', coul: 'epaule', bloc: 'E. Étirement', option: 1,
    quoi: 'Seulement si la rotation interne gauche est plus raide que la droite.',
    comment: ['Bras gauche tendu devant la poitrine, main droite sur le coude gauche.', 'Tire doucement vers l\'épaule droite, épaule gauche basse. Tiens 30 s.'],
    eviter: 'Un pincement à l\'avant : on doit sentir un étirement doux à l\'arrière. Si ça pince, arrête.',
    niv: {douce: {d: '2 × 30 s', s: 2, r: 1, t: 30, p: 10, m: 1.5}, normale: {d: '3 × 30 s', s: 3, r: 1, t: 30, p: 10, m: 2}, forte: {d: '3 × 30 s', s: 3, r: 1, t: 30, p: 10, m: 2}}},

  // ---------------- ÉCHAUFFEMENT PADEL ----------------
  w: {nom: 'Échauffement padel', coul: 'vert', type: 'etapes',
    comment: ['Avant chaque padel, manchons au genou gauche.'],
    etapes: [['Trottinement et pas chassés', 120], ['10 serrages de ballon (ou de poings entre les genoux) de 5 s', 100], ['10 fentes latérales douces par côté', 90], ['Balancements de jambes avant/arrière et sur les côtés', 90], ['Accélérations et changements de direction à 50 %, puis 70 %', 120]],
    niv: {douce: {d: '10 min', m: 10}, normale: {d: '10 min', m: 10}, forte: {d: '10 min', m: 10}}},


  // ---------------- DÉTENTE DU PLANCHER PELVIEN (20-30 min, à la demande) ----------------
  // But : relâcher et étirer autour, jamais renforcer (pas de Kegel). Les jours de douleur : niveau Douce
  // (plus de respiration, ouvertures de hanche plus courtes, sans l'accroupi).
  d1: {nom: 'Installation et respiration ventrale', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, mollets posés sur le canapé (ou une chaise), une main sur le ventre.', 'Inspire 4 s par le nez en gonflant le ventre, expire 6 s par la bouche.', 'Laisse peser le corps dans le sol : mâchoire, épaules et fesses relâchées.'],
    conseil: 'Ici, rien à réussir : on laisse le corps se poser.',
    niv: {douce: {d: '4 min', s: 1, r: 1, t: 240, m: 4}, normale: {d: '3 min', s: 1, r: 1, t: 180, m: 3}, forte: {d: '3 min', s: 1, r: 1, t: 180, m: 3}}},
  d2: {nom: 'Le périnée qui s\'ouvre', coul: 'calme', souffle: 1,
    quoi: 'Le cœur de la séance : sentir le fond du bassin descendre et s\'ouvrir à l\'inspiration.',
    comment: ['Même position, mollets sur le canapé.', 'Inspire 4 s : le ventre gonfle et le fond du bassin (entre les bourses et l\'anus) descend un peu, s\'ouvre, comme au tout début d\'un pipi. Sans pousser.', 'Expire 6 s, lèvres pincées : il remonte tout seul, sans le serrer.', 'Pour sentir : le bout des doigts sur le périnée, par-dessus le caleçon, il bombe très légèrement à l\'inspiration.'],
    conseil: 'Si tu ne sens rien, c\'est normal au début : l\'intention suffit, la sensation vient avec les séances.',
    eviter: 'Pousser comme aux toilettes, bloquer la respiration, serrer les fesses ou le périnée.',
    niv: {douce: {d: '6 min', s: 1, r: 1, t: 360, m: 6}, normale: {d: '4 min', s: 1, r: 1, t: 240, m: 4}, forte: {d: '4 min', s: 1, r: 1, t: 240, m: 4}}},
  d3: {nom: 'Bascule douce du bassin', coul: 'calme',
    comment: ['Sur le dos, genoux pliés, pieds au sol.', 'En expirant, le bas du dos s\'enfonce doucement dans le sol (le bassin bascule vers toi). En inspirant, il revient, petit creux sous le bas du dos.', 'Mouvement tout petit, au rythme de la respiration.'],
    conseil: 'Ça décoince le bassin sans aucun effort. Les fesses restent posées.',
    niv: {douce: {d: '8 bascules lentes', s: 1, r: 8, m: 1.5}, normale: {d: '10 bascules lentes', s: 1, r: 10, m: 1.5}, forte: {d: '12 bascules lentes', s: 1, r: 12, m: 2}}},
  dK: {nom: 'Un genou vers la poitrine', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, une jambe allongée (ou pliée, pied au sol).', 'Ramène doucement l\'autre genou vers la poitrine, mains sous le genou.', 'Respire dans le ventre, puis change de côté.'],
    conseil: 'Doux, sans tirer : si l\'aine pince, éloigne un peu le genou vers l\'extérieur.',
    niv: {douce: {d: '45 s par côté', s: 1, r: 1, t: 45, c: 2, m: 1.5}, normale: {d: '1 min par côté', s: 1, r: 1, t: 60, c: 2, m: 2}, forte: {d: '1 min par côté', s: 1, r: 1, t: 60, c: 2, m: 2}}},
  dW: {nom: 'Essuie-glace allongé', coul: 'calme',
    comment: ['Sur le dos, genoux pliés, pieds au sol plus écartés que le bassin, bras en croix.', 'Laisse tomber lentement les deux genoux d\'un côté, puis de l\'autre, comme un essuie-glace.', 'Les épaules restent posées, amplitude sans douleur.'],
    conseil: 'Ça détend les hanches et le bas du dos en douceur.',
    niv: {douce: {d: '6 de chaque côté, petite amplitude', s: 1, r: 6, m: 1.5}, normale: {d: '8 de chaque côté', s: 1, r: 8, m: 1.5}, forte: {d: '10 de chaque côté', s: 1, r: 10, m: 2}}},
  d4: {nom: 'Bébé heureux', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, attrape tes pieds (ou l\'arrière des genoux), genoux vers les aisselles.', 'Laisse le bas du dos posé, respire dans le ventre : à chaque inspiration, le fond du bassin s\'ouvre.'],
    conseil: 'La posture la plus efficace pour relâcher le plancher pelvien. Si l\'aine tire : mains derrière les genoux, genoux moins écartés.',
    niv: {douce: {d: '1 min, mains derrière les genoux', s: 1, r: 1, t: 60, m: 1}, normale: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, forte: {d: '2 min 30', s: 1, r: 1, t: 150, m: 2.5}}},
  d5: {nom: 'Papillon couché, genoux soutenus', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, plantes des pieds collées, genoux qui s\'ouvrent sur les côtés.', 'Un coussin sous chaque genou : les jambes sont portées, rien ne tire.', 'Mains sur le ventre, respire lentement.'],
    conseil: 'On ne cherche pas à étirer : les coussins font le travail. Plus les coussins sont hauts, plus c\'est doux.',
    eviter: 'Laisser les genoux pendre dans le vide ou appuyer dessus.',
    niv: {douce: {d: '2 min, coussins hauts', s: 1, r: 1, t: 120, m: 2}, normale: {d: '3 min', s: 1, r: 1, t: 180, m: 3}, forte: {d: '3 min', s: 1, r: 1, t: 180, m: 3}}},
  d6: {nom: 'Fessier en « 4 »', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, genoux pliés. Pose la cheville droite sur le genou gauche.', 'Attrape la cuisse gauche et ramène-la doucement vers toi : tu sens la fesse droite.', 'Puis l\'autre côté.'],
    conseil: 'Les muscles profonds de la fesse sont collés au plancher pelvien : quand ils lâchent, il lâche aussi.',
    niv: {douce: {d: '45 s par côté, sans ramener la cuisse', s: 1, r: 1, t: 45, c: 2, m: 1.5}, normale: {d: '1 min par côté', s: 1, r: 1, t: 60, c: 2, m: 2}, forte: {d: '1 min 15 par côté', s: 1, r: 1, t: 75, c: 2, m: 2.5}}},
  d7: {nom: 'Posture de l\'enfant, genoux écartés', coul: 'calme', souffle: 1,
    comment: ['À genoux, gros orteils qui se touchent, genoux écartés.', 'Fesses vers les talons, bras allongés devant, front posé (sur un coussin si besoin).', 'Respire dans le bas du dos et le bassin : le fond du bassin s\'ouvre à l\'inspiration.'],
    conseil: 'Genoux moins écartés si l\'aine tire. Un coussin entre les fesses et les talons si les genoux sont raides.',
    niv: {douce: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, normale: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, forte: {d: '2 min 30', s: 1, r: 1, t: 150, m: 2.5}}},
  d8: {nom: 'Accroupi sur un petit tabouret', coul: 'calme', souffle: 1,
    quoi: 'La position « toilettes » : celle où le bassin s\'ouvre le plus naturellement.',
    comment: ['Assis sur un petit tabouret bas (ou une pile de livres), pieds à plat, un peu écartés, genoux plus hauts que les hanches.', 'Avant-bras posés sur les cuisses, dos long, penché un peu en avant.', 'Respire dans le ventre et laisse le fond du bassin descendre et s\'ouvrir.'],
    conseil: 'Le tabouret porte ton poids : le genou gauche ne travaille pas. C\'est aussi la bonne position aux toilettes, pieds sur un petit marchepied.',
    eviter: 'Pousser. Ici on relâche seulement.',
    niv: {normale: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, forte: {d: '2 min 30', s: 1, r: 1, t: 150, m: 2.5}}},
  d9: {nom: 'Chat-vache très lent', coul: 'calme',
    comment: ['À quatre pattes, mains sous les épaules, genoux sous les hanches.', 'Inspire en creusant doucement le dos : le bassin bascule, le fond du bassin s\'ouvre.', 'Expire en arrondissant le dos, sans serrer.'],
    conseil: 'Le plus lentement possible, en suivant la respiration.',
    niv: {douce: {d: '6 lentement', s: 1, r: 6, m: 1}, normale: {d: '8 lentement', s: 1, r: 8, m: 1.5}, forte: {d: '10 lentement', s: 1, r: 10, m: 2}}},
  d10: {nom: 'Relâchement final, de la tête au bassin', coul: 'calme', souffle: 1,
    comment: ['Sur le dos, mollets sur le canapé, yeux fermés.', 'Relâche une zone à chaque expiration : la mâchoire (dents qui ne se touchent pas), les épaules, le ventre, les fesses, puis le fond du bassin.', 'Reste à respirer tranquillement jusqu\'à la fin.'],
    conseil: 'Le plancher pelvien se relâche souvent en même temps que la mâchoire : commence toujours par elle.',
    niv: {douce: {d: '4 min', s: 1, r: 1, t: 240, m: 4}, normale: {d: '3 min', s: 1, r: 1, t: 180, m: 3}, forte: {d: '4 min', s: 1, r: 1, t: 240, m: 4}}},

  // ---------------- SOUPLESSE ----------------
  // Pensée pour : pubalgie (pas d'étirement forcé des adducteurs), genou rotulien (quadriceps, hanche, mollets),
  // plancher pelvien (postures de relâchement), lésion SLAP à droite (pas d'étirement bras en arrière ni au-dessus de la tête en force),
  // épaule gauche en apprentissage (arrière de l'épaule, haut du dos).
  s1: {nom: 'Respiration ventrale', coul: 'souple', comment: ['Sur le dos, genoux pliés, une main sur le ventre.', 'Inspire 4 s par le nez en gonflant le ventre, expire 6 s par la bouche. Laisse tout se relâcher.'],
    niv: {douce: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, normale: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, forte: {d: '1 min', s: 1, r: 1, t: 60, m: 1}}},
  s2: {nom: 'Chat-vache à quatre pattes', coul: 'souple', comment: ['À quatre pattes, mains sous les épaules, genoux sous les hanches.', 'Inspire en creusant doucement le dos (regard devant), expire en l\'arrondissant (menton vers la poitrine).'],
    conseil: 'Lent, sans forcer, en suivant la respiration.',
    niv: {douce: {d: '10 lentement', s: 1, r: 10, m: 1.5}, normale: {d: '10 lentement', s: 1, r: 10, m: 1.5}, forte: {d: '10 lentement', s: 1, r: 10, m: 1.5}}},
  s3: {nom: 'Livre ouvert (haut du dos)', coul: 'souple', comment: ['Couché sur le côté, genoux pliés à 90°, bras tendus devant toi l\'un sur l\'autre.', 'Ouvre le bras du dessus comme une page de livre en suivant ta main des yeux, jusqu\'à ce qu\'il se pose de l\'autre côté. Les genoux restent collés.', 'Reviens lentement.'],
    conseil: 'Bon pour le smash : la rotation vient du haut du dos, pas de l\'épaule. Côté droit (SLAP) : bras en dessous de la hauteur d\'épaule, sans forcer au bout.',
    niv: {douce: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2}, normale: {d: '8 par côté', s: 1, r: 8, c: 2, m: 2}, forte: {d: '10 par côté, 3 s ouvert', s: 1, r: 10, c: 2, m: 2.5}}},
  s4: {nom: 'Posture de l\'enfant, genoux écartés', coul: 'souple', comment: ['À genoux, gros orteils qui se touchent, genoux écartés.', 'Fesses vers les talons, bras allongés devant, front posé.', 'Respire dans le ventre et le bas du dos : le fond du bassin s\'ouvre à l\'inspiration.'],
    conseil: 'Relâche le dos et le plancher pelvien. Genoux moins écartés si l\'aine tire.',
    niv: {douce: {d: '1 min 30', s: 1, r: 1, t: 90, m: 1.5}, normale: {d: '1 min 30', s: 1, r: 1, t: 90, m: 1.5}, forte: {d: '1 min 30', s: 1, r: 1, t: 90, m: 1.5}}},
  s5: {nom: 'Fente basse, devant de la hanche', coul: 'souple', comment: ['Un genou au sol sur un coussin, l\'autre pied devant (genou à 90°).', 'Rentre légèrement le bas du ventre et serre la fesse de la jambe arrière : tu sens l\'étirement devant la hanche.', 'Avance un peu le bassin, sans creuser le dos.'],
    conseil: 'Les fléchisseurs de hanche raides tirent sur le bassin et le pubis. Doux : 3/10 maximum, jamais dans l\'aine.',
    niv: {douce: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 40 s par côté', s: 2, r: 1, t: 40, c: 2, p: 10, m: 3}}},
  s6: {nom: 'Quadriceps couché sur le côté', coul: 'souple', comment: ['Couché sur le côté, attrape la cheville du dessus et amène le talon vers la fesse.', 'Les genoux restent l\'un à côté de l\'autre, le bassin un peu en avant.'],
    conseil: 'Pour le genou rotulien : un quadriceps souple tire moins sur la rotule. Ne force pas sur le genou : une serviette autour de la cheville si besoin.',
    niv: {douce: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 40 s par côté', s: 2, r: 1, t: 40, c: 2, p: 10, m: 3}}},
  s7: {nom: 'Arrière de la cuisse, avec une sangle', coul: 'souple', comment: ['Sur le dos, une jambe tendue au sol (ou pliée).', 'Sangle ou serviette sous le pied de l\'autre jambe, monte-la vers le plafond, genou très légèrement plié.'],
    conseil: 'Le bassin reste posé, le bas du dos aussi. Doux, sans tirer.',
    niv: {douce: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 40 s par côté', s: 2, r: 1, t: 40, c: 2, p: 10, m: 3}}},
  s8: {nom: 'Fessier en « 4 » sur le dos', coul: 'souple', comment: ['Sur le dos, genoux pliés. Pose la cheville droite sur le genou gauche.', 'Attrape la cuisse gauche et ramène-la vers toi : tu sens la fesse droite.'],
    conseil: 'Si ça gêne dans l\'aine ou la hanche droite, ramène moins.',
    niv: {douce: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 40 s par côté', s: 2, r: 1, t: 40, c: 2, p: 10, m: 3}}},
  s9: {nom: 'Mollets contre le mur', coul: 'souple', comment: ['Mains au mur, une jambe derrière, talon au sol, jambe tendue : 30 s.', 'Puis plie un peu le genou arrière, talon toujours au sol : 30 s (le bas du mollet).'],
    conseil: 'Des mollets raides font rentrer le genou vers l\'intérieur à la réception.',
    niv: {douce: {d: '30 s tendu + 30 s plié, par côté', s: 2, r: 1, t: 30, c: 2, p: 5, m: 2.5}, normale: {d: '30 s tendu + 30 s plié, par côté', s: 2, r: 1, t: 30, c: 2, p: 5, m: 2.5}, forte: {d: '40 s tendu + 40 s plié, par côté', s: 2, r: 1, t: 40, c: 2, p: 5, m: 3}}},
  s10: {nom: 'Côté de la hanche, debout jambes croisées', coul: 'souple', comment: ['Debout, croise la jambe droite derrière la gauche.', 'Pousse doucement la hanche droite vers la droite, bras gauche au-dessus de la tête ou main sur la hanche.'],
    conseil: 'Étire le côté de la cuisse, souvent raide avec un genou rotulien. Côté droit (SLAP) : garde la main sur la hanche, pas le bras en l\'air.',
    niv: {douce: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}}},
  s11: {nom: 'Papillon doux', coul: 'souple', comment: ['Assis, plantes des pieds collées, genoux qui tombent tout seuls.', 'Dos droit (contre un mur si besoin), respire dans le ventre.'],
    conseil: 'On ne pousse pas sur les genoux : pas d\'étirement forcé des adducteurs tant que la pubalgie est là.',
    niv: {douce: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, normale: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, forte: {d: '1 min', s: 1, r: 1, t: 60, m: 1}}},
  s12: {nom: 'Bébé heureux', coul: 'souple', comment: ['Sur le dos, attrape tes pieds (ou l\'arrière des genoux), genoux vers les aisselles.', 'Laisse le bas du dos posé, respire dans le ventre.'],
    conseil: 'La meilleure posture pour relâcher le plancher pelvien.',
    niv: {douce: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, normale: {d: '1 min', s: 1, r: 1, t: 60, m: 1}, forte: {d: '1 min', s: 1, r: 1, t: 60, m: 1}}},
  s13: {nom: 'Arrière de l\'épaule, bras croisé', coul: 'souple', comment: ['Bras tendu devant la poitrine, l\'autre main sur le coude.', 'Tire doucement vers l\'autre épaule, épaule basse.'],
    conseil: 'Étirement doux à l\'arrière. Si ça pince à l\'avant, arrête.',
    niv: {douce: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}}},
  s14: {nom: 'Pectoraux contre une porte, bras bas', coul: 'souple', comment: ['Avant-bras contre le montant d\'une porte, coude plus bas que l\'épaule.', 'Avance doucement le buste jusqu\'à sentir l\'étirement devant la poitrine.'],
    conseil: 'Bras bas exprès : pour ton épaule droite (SLAP), jamais le bras à hauteur d\'épaule ou au-dessus en tirant vers l\'arrière.',
    niv: {douce: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}, normale: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}, forte: {d: '2 × 30 s par côté', s: 2, r: 1, t: 30, c: 2, p: 10, m: 2.5}}},
  s15: {nom: 'Haut du dos et grand dorsal, mains sur une table', coul: 'souple', comment: ['Mains posées sur une table ou le dossier d\'un canapé, recule les pieds.', 'Laisse descendre la poitrine, fesses en arrière, dos long.'],
    conseil: 'Côté droit (SLAP) : sans forcer au bout, tu t\'arrêtes avant la moindre gêne.',
    niv: {douce: {d: '45 s', s: 1, r: 1, t: 45, m: 1}, normale: {d: '2 × 30 s', s: 2, r: 1, t: 30, p: 10, m: 1.5}, forte: {d: '2 × 40 s', s: 2, r: 1, t: 40, p: 10, m: 1.5}}},
  s16: {nom: 'Cou et trapèzes', coul: 'souple', comment: ['Assis, une main sous la fesse du même côté.', 'Penche doucement l\'oreille opposée vers l\'épaule.'],
    niv: {douce: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}, normale: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}, forte: {d: '30 s par côté', s: 1, r: 1, t: 30, c: 2, m: 1.5}}},
  s17: {nom: 'Relâchement final', coul: 'souple', comment: ['Sur le dos, jambes allongées ou mollets sur le canapé.', 'Respire lentement, laisse peser le corps dans le sol.'],
    niv: {douce: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, normale: {d: '2 min', s: 1, r: 1, t: 120, m: 2}, forte: {d: '2 min', s: 1, r: 1, t: 120, m: 2}}}
};

// Les séances (hors programme : on peut en choisir une n'importe quand)
const SEANCES = {
  pub: {nom: 'Pubalgie', ico: '🦵', txt: 'Protocole Clairefontaine complet + options genou', liste: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p6b', 'p7', 'p8', 'p8b', 'p9', 'p10', 'p10b', 'p11', 'p12', 'pp'],
    douce: {remplace: {p10: null}}},
  verts: {nom: 'Exercices verts', ico: '🟢', txt: 'La veille du padel : 2, 5, 8, 11 + plancher pelvien', liste: ['p2', 'p5', 'p8', 'p11', 'pp']},
  epaule: {nom: 'Épaule gauche', ico: '💪', txt: 'Omoplate, coiffe, stabilité, lancers main gauche', liste: ['e0', 'e1', 'e2', 'e3', 'e4', 'e4b', 'e5', 'e6', 'e7', 'e8', 'eD', 'e9']},
  combi: {nom: 'Épaule + pubalgie', ico: '⚡', txt: 'Les deux en 45 min : épaule en version courte + l\'essentiel de la pubalgie',
    liste: ['e1', 'e2', 'e3', 'e4', 'e4b', 'e6', 'e7', 'p0', 'p5', 'p8', 'p9', 'p10', 'p10b', 'p11', 'pp'], epauleCourte: 1},
  detente: {nom: 'Détente du plancher pelvien', ico: '🌙', txt: '20-30 min pour relâcher le bassin, quand tu veux. Douce les jours de douleur.', liste: ['d1', 'd2', 'd3', 'dK', 'd4', 'd5', 'd6', 'dW', 'd7', 'd8', 'd9', 'd10']},
  pp: {nom: 'Plancher pelvien', ico: '🌬️', txt: 'Les 5 minutes de relâchement de chaque jour', liste: ['pp']},
  echauf: {nom: 'Échauffement padel', ico: '🎾', txt: '10 min avant de jouer', liste: ['w']},
  soupleTout: {nom: 'Souplesse tout le corps', ico: '🧘', txt: 'Environ 30 min, en douceur', liste: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17']},
  soupleBas: {nom: 'Souplesse du bas', ico: '🧘', txt: 'Hanches, cuisses, mollets, bassin', liste: ['s1', 's2', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's17']},
  soupleHaut: {nom: 'Souplesse du haut', ico: '🧘', txt: 'Haut du dos, épaules, cou', liste: ['s1', 's2', 's3', 's4', 's13', 's14', 's15', 's16', 's17']}
};

// Routines de la semaine. Clé : cours le lundi (o/n) + jour du padel (ven, sam, aucun).
// Chaque jour : liste de ce qu'il y a à faire. test = test du ballon le matin, padel = rien d'autre que le padel.
// max = niveau maximum conseillé ce jour-là (« sans forcer le rouge »), note = précision.
const ROUTINES = {
  'n-ven': {nom: 'Routine A : padel le vendredi', jours: [
    ['pub'], ['repos'], ['combi'], ['verts'], ['padel'], ['test', 'pub'], ['epaule']]},
  'n-sam': {nom: 'Routine B : padel le samedi', jours: [
    ['combi'], ['repos'], ['pub'], ['epaule'], ['verts'], ['padel'], ['test', 'pub']]},
  'o-ven': {nom: 'Routine C : cours le lundi + padel le vendredi', c: 1, jours: [
    ['padel'], ['test', 'repos'], ['combi'], ['verts'], ['padel'], ['test', 'pub:normale'], ['epaule:douce', 'verts']]},
  'o-sam': {nom: 'Routine C : cours le lundi + padel le samedi', c: 1, jours: [
    ['padel'], ['test', 'epaule'], ['pub'], ['combi:normale'], ['verts'], ['padel'], ['test', 'verts']]},
  'n-aucun': {nom: 'Semaine sans padel', jours: [
    ['pub'], ['epaule'], ['repos'], ['pub'], ['epaule'], ['pub'], ['repos']]},
  'o-aucun': {nom: 'Cours le lundi seulement', c: 1, jours: [
    ['padel'], ['test', 'repos'], ['combi'], ['repos'], ['epaule'], ['pub'], ['verts']]}
};

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Ce qu'on peut mettre un jour donné quand on modifie la semaine à la main
const ELEMENTS = {
  pub: 'Pubalgie', verts: 'Exercices verts', epaule: 'Épaule', combi: 'Épaule + pubalgie', padel: 'Padel',
  repos: 'Repos actif', test: 'Test du ballon le matin', soupleTout: 'Souplesse tout le corps', soupleBas: 'Souplesse du bas', soupleHaut: 'Souplesse du haut'
};

const REGLES = [
  'Douleur acceptée : 3 sur 10 maximum, pendant et après. Revenue à la normale le lendemain matin.',
  'Mouvements lents et contrôlés. On expire pendant l\'effort, on ne bloque jamais sa respiration.',
  'Le jour du padel : rien d\'autre que le padel (échauffement compris).',
  'Épaule : 2 séances par semaine, au moins 48 h entre les deux, jamais la veille d\'un padel. Si possible, pas le lendemain non plus. Exception : le dimanche matin en douceur avant le cours du lundi.',
  'La veille du padel : seulement les exercices verts (2, 5, 8, 11).',
  'Le lendemain du padel : test du ballon le matin.',
  'Augmenter la charge par petits paliers : 10 à 20 % par semaine maximum.',
  'Ne jamais s\'arrêter complètement en cas de douleur : on allège.',
  'Manchons au genou gauche à chaque padel, même l\'été (modèle plus léger quand il fait chaud).',
  'Main gauche seulement en séance tranquille, pas en match, tant que les 2 padels par semaine ne sont pas validés.',
  'À éviter pour l\'instant : crunchs, relevés de jambes tendues, étirements forcés en grand écart, charges lourdes en bloquant la respiration, exercices de serrage du périnée (Kegel).',
  'Tous les jours : 5 minutes de relâchement du plancher pelvien.'
];

const RECHUTE = [
  'Ne pas s\'arrêter complètement.',
  'Pendant 7 à 10 jours : un seul padel par semaine, sans match.',
  'Séances en niveau Douce : verts et orange gardés, rouges en petite amplitude (corde plus haute, petite amplitude au glissé, élastique à la place du Copenhague).',
  'Serrage du ballon (exercice 8) tous les jours.',
  'Plancher pelvien matin et soir.',
  'Reprendre la progression quand le test du ballon est revenu au niveau habituel.'
];

const COPENHAGUE = [
  null,
  {txt: 'Étape 1 · genou sur le banc : tenir', d: '3 × 15-20 s par côté', s: 3, r: 1, t: 15, c: 2, p: 30},
  {txt: 'Étape 2 · genou sur le banc : la jambe du dessous descend et remonte', d: '3 × 6-10 par côté', s: 3, r: 8, c: 2, p: 30},
  {txt: 'Étape 3 · cheville sur le banc : tenir', d: '3 × 15-20 s par côté', s: 3, r: 1, t: 15, c: 2, p: 30},
  {txt: 'Étape 4 · cheville sur le banc : la jambe du dessous descend et remonte', d: '3 × 6-10 par côté (entretien, toute l\'année)', s: 3, r: 8, c: 2, p: 30}
];

// Lancers main gauche selon la semaine du programme épaule
function lancers(sem) {
  if (sem < 3) return null;
  if (sem < 4) return {txt: 'Smash « à vide » : sans balle, au ralenti', d: '2 × 10', s: 2, r: 10, p: 30};
  if (sem < 7) return {txt: 'Lancers de balle de tennis contre un mur, à 50 % de la force', d: '2 × 15', s: 2, r: 15, p: 30};
  return {txt: 'Lancers un peu plus forts (+10 % par semaine), puis medecine-ball 1-2 kg au-dessus de la tête, à deux mains, contre un mur', d: '2 × 10 à 15', s: 2, r: 12, p: 30};
}

// Construit la liste des exercices d'une séance pour un niveau.
// o : {cop: étape du Copenhague (1-4), semEp: semaine du programme épaule, options: true/false}
function construire(cle, niv, o) {
  o = o || {};
  const S = SEANCES[cle], out = [];
  const bas = {forte: 'normale', normale: 'douce', douce: 'douce'};
  S.liste.forEach(id => {
    const e = EX[id];
    if (e.option && o.options === false && id !== 'p10b') return;
    let n = niv;
    if (S.epauleCourte && id[0] === 'e') n = bas[niv];
    if (id === 'p10b' && niv !== 'douce' && o.options === false) return;
    let dose = e.niv[n];
    if (e.copenhague) {
      if (!dose) return; // en douce : l'élastique (10b) remplace le Copenhague
      const et = Math.min(4, Math.max(1, +o.cop || 1));
      dose = Object.assign({}, COPENHAGUE[et], {m: dose.m, d: COPENHAGUE[et].d, etape: et});
    }
    if (e.lancers) {
      const l = lancers(+o.semEp || 1);
      if (!l || !dose) return;
      dose = Object.assign({}, l, {m: dose.m});
    }
    if (!dose) return;
    out.push({id, dose});
  });
  return out;
}
const duree = l => Math.round(l.reduce((a, x) => a + (x.dose.m || 0), 0));
if (typeof module !== 'undefined') module.exports = {EX, SEANCES, ROUTINES, construire, duree, NIVEAUX};

// Rythme d'une répétition (secondes) quand l'appli compte à voix haute. Par défaut 3 s.
const TEMPO = {p1: 4, p2: 4, p3: 3, p4: 4, p5: 3, p6: 3, p6b: 6, p7: 5, p9: 5, p10: 5, p10b: 4, p11: 4, p12: 4, e1: 4, e2: 4, e3: 3, e4: 5, e4b: 4, e5: 4, eD: 4, s2: 4, s3: 5, d3: 6, d9: 8, dW: 8};

// Matériel de chaque exercice (affiché et lu au début de la séance)
const MATERIEL = {
  p0: ['Tapis', 'Petit ballon (ou coussin ferme)'], p1: ['Tapis', 'Petit ballon (ou coussin ferme)'], p2: ['Tapis', 'Gros ballon de Klein'],
  p4: ['Haie basse (ou chaise d\'enfant)'], p5: ['Gros ballon de Klein'], p6: ['Marche ou step'], p6b: ['Marche ou step'],
  p7: ['Corde (ou haie) tendue à 1 m'], p8: ['Tapis', 'Petit ballon (ou coussin ferme)'], p8b: ['Mur', 'Petit ballon (ou coussin ferme)'],
  p9: ['Coussin en mousse', 'Disque glissant (ou torchon sur carrelage)', 'Bâton'], p10: ['Tapis', 'Banc (ou box, tabouret)'],
  p10b: ['Élastique avec un point d\'attache bas'], p11: ['Coussin d\'équilibre gonflable (ou gros ballon)', 'Haltère de 1 kg'],
  p12: ['Gros ballon de Klein'], pp: ['Tapis', 'Chaise ou canapé'],
  e0: ['Élastique'], e1: ['Mur'], e2: ['Tapis', 'Serviette roulée', 'Haltères de 0,5 à 1 kg (à fond)'], e3: ['Élastique accroché à une porte'],
  e4: ['Élastique accroché à une porte'], e4b: ['Élastique accroché à une porte'], e5: ['Tapis', 'Serviette roulée', 'Coussin', 'Petit haltère (ou bouteille d\'1 L)'],
  e6: ['Tapis'], e7: ['Mur', 'Ballon (foot, basket ou volley)'], e8: ['Kettlebell de 4 à 8 kg (ou marteau)'], eD: ['Mur', 'Balle de tennis (medecine-ball plus tard)'],
  w: ['Petit ballon (ou coussin ferme)', 'Manchons pour le genou gauche'],
  s1: ['Tapis'], s2: ['Tapis'], s3: ['Tapis'], s4: ['Tapis'], s5: ['Tapis', 'Coussin'], s6: ['Tapis'], s7: ['Tapis', 'Sangle (ou serviette)'], s8: ['Tapis'],
  s9: ['Mur'], s11: ['Tapis'], s12: ['Tapis'], s14: ['Porte'], d1: ['Tapis', 'Canapé (ou chaise)'], d5: ['Deux coussins'], d7: ['Coussin (si besoin)'], d8: ['Petit tabouret bas (ou pile de livres)'], s15: ['Table ou dossier de canapé'], s17: ['Tapis', 'Chaise ou canapé']
};
// Liste sans doublon pour une séance construite
const materiel = l => { const o = []; l.forEach(x => (MATERIEL[x.id] || []).forEach(m => { if (!o.includes(m)) o.push(m); })); return o; };
