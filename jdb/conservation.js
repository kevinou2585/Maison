// Après la récolte : comment conserver chaque fruit, et quand il est le meilleur à manger.
// Clé = nom exact de la fiche fruitier. [conservation, meilleur moment pour manger]
// Les fiches dont la variété n'est pas connue (abricotier, nashi sans nom, noisetier, amandier) n'ont rien :
// la garde dépend trop de la variété. Kevin peut tout modifier avec « ✎ Modifier la fiche ».
const CONS = {
  // ---- Pommes : cave ou cellier frais et humide, à l'abri du gel, fruits sains et non cognés,
  // posés sur des clayettes sans se toucher, loin des légumes (les pommes les font mûrir trop vite).
  "Court-Pendu Rose": ["Cave ou cellier frais (3 à 5 °C) et humide, sur clayettes, fruits sains qui ne se touchent pas. Très longue garde : jusqu'en avril, parfois mai.", "De janvier à avril : elle gagne en sucre et en parfum en cave, meilleure après Noël."],
  "Cox's Queen": ["Cave fraîche (3 à 5 °C) ou bac à légumes du frigo, fruits bien séparés. Se garde jusqu'en janvier.", "De fin octobre à décembre, après 2 à 3 semaines de repos."],
  "Melrose": ["Cave fraîche (2 à 4 °C) et humide, à l'abri du gel. Se garde jusqu'en mars-avril.", "De décembre à mars : acidulée à la cueillette, elle s'adoucit en cave."],
  "Reinette Professeur Lecrenier": ["Cave fraîche (3 à 5 °C), sur clayettes. Se garde jusqu'en janvier-février.", "De novembre à janvier (repère des pomologues belges, à confirmer chez toi)."],
  "Gueule de Mouton": ["Cave fraîche (3 à 5 °C) et humide. Longue garde : jusqu'en mars-avril.", "De décembre à mars, crue ou cuite (très bonne au four et en compote). Pas avant : elle est dure et acide à la cueillette."],
  "Président Roulin": ["Cave fraîche (3 à 5 °C). Se garde jusqu'en janvier-février.", "De novembre à janvier, crue ou cuite (grosse pomme, parfaite au four)."],
  "Pomme Gloster (demi-tige)": ["Cave fraîche (2 à 4 °C) et humide. Se garde jusqu'en mars-avril.", "De janvier à mars : croquante et juteuse après 2 mois de cave."],
  "La Paix": ["Au frais (cave ou frigo, 3 à 5 °C), mais garde courte : 4 à 6 semaines, ensuite elle devient farineuse.", "Dès la cueillette et jusqu'à fin novembre."],
  "Président Henri Van Dievoet": ["Cave fraîche (3 à 5 °C) et humide. Très longue garde : jusqu'en mai-juin.", "De janvier à avril, bien mûre ; trop dure avant Noël."],
  "Reine des Reinettes": ["Cave fraîche (3 à 5 °C), garde moyenne : jusqu'en janvier. Regarde-les souvent, elles peuvent se rider.", "D'octobre à décembre, au mieux en novembre."],

  // ---- Poires : elles finissent de mûrir hors de l'arbre. Au froid pour les garder,
  // puis 3 à 5 jours à la cuisine ; prêtes quand la chair près de la queue cède sous le pouce.
  "Poirier Conférence (×3)": ["Frigo ou cave très fraîche (0 à 4 °C) : jusqu'en décembre-janvier. Sors-les 3 à 5 jours à la cuisine avant de les manger.", "D'octobre à décembre, quand le col près de la queue cède sous le pouce."],
  "Poirier Beurré d'Anjou (×2)": ["Au froid (0 à 4 °C) jusqu'en décembre-janvier, puis quelques jours à la cuisine pour qu'elles mûrissent.", "De novembre à décembre."],
  "Poirier Saint-Mathieu": ["Cave fraîche (3 à 6 °C) : elle se garde bien mais reste ferme, c'est une poire à cuire.", "D'octobre à janvier, cuite (four, compote, poires au vin) plutôt que crue."],
  "Poirier Précoce Hénin": ["Garde courte : 2 à 3 jours à la cuisine, une semaine au frigo. Cueille-la juste avant maturité (elle se détache en la soulevant), sinon elle devient blette au cœur.", "Fin août, dans les jours qui suivent la cueillette."],
  "Poirier Général Leclerc (demi-tige)": ["Au froid (2 à 4 °C) jusqu'en décembre, puis 3 à 5 jours à la cuisine.", "D'octobre à décembre, fondante et parfumée."],
  "Poirier Beurré Lebrun": ["Garde courte : 2 à 3 semaines au frais (frigo ou cave), puis 2 ou 3 jours à la cuisine.", "En octobre, dès que le col cède sous le pouce."],
  "Poirier Comtesse de Paris": ["Cave fraîche ou frigo (2 à 4 °C), longue garde jusqu'en février. Sors-les une semaine avant pour qu'elles mûrissent à la cuisine.", "De décembre à février ; dure et sans goût à la cueillette."],

  // ---- Nashis : mûrs sur l'arbre, ils ne mûrissent plus après.
  "Nashi Hosui": ["Frigo (1 à 4 °C), chaque fruit dans du papier ou un sac percé : 2 à 3 mois.", "Dès la cueillette (croquant et juteux) jusqu'en novembre."],
  "Nashi Nieiseiki (Nijisseiki)": ["Frigo (1 à 4 °C), chaque fruit dans du papier ou un sac percé : 2 à 3 mois.", "Dès la cueillette jusqu'en novembre-décembre."],

  // ---- Prunes, cerises, pêches : fruits d'été, à manger vite ou à transformer.
  "Reine Claude Conducta": ["Frigo (bac à légumes) 4 à 5 jours. Sinon congèle-les dénoyautées, ou confiture et tartes.", "Dès la cueillette, bien mûres : elles ne mûrissent presque plus après."],
  "Reine-Claude d'Oullins": ["Frigo (bac à légumes) 4 à 5 jours. Sinon congèle-les dénoyautées, ou confiture et tartes.", "Mi-août, dès la cueillette, quand elles sont dorées et cèdent un peu sous le doigt."],
  "Reine-Claude Crottée": ["Frigo (bac à légumes) 4 à 5 jours. Sinon congèle-les dénoyautées, ou confiture.", "Fin août-septembre, bien mûre : les petites taches rousses sont signe de sucre."],
  "Prunier Altesse simple": ["Frigo une semaine environ. Parfaite à congeler dénoyautée pour les tartes, ou à sécher en pruneaux.", "Fin août-septembre ; bonne crue bien mûre, excellente cuite (tarte)."],
  "Cerisier Early Rivers": ["Cerise tendre : 2 à 3 jours au frigo, non lavée, avec la queue. Sinon congélation dénoyautée, confiture, clafoutis.", "Le jour de la cueillette ou le lendemain."],
  "Cerisier Hedelfinger": ["Cerise ferme : jusqu'à une semaine au frigo, non lavée, avec la queue. Se congèle bien dénoyautée.", "Dès la cueillette, bien noire."],
  "Cerisier Lapins": ["Cerise ferme : jusqu'à une semaine au frigo, non lavée, avec la queue. Se congèle bien dénoyautée.", "Dès la cueillette, bien sombre."],
  "Pêcher Redhaven": ["1 à 3 jours à la cuisine pour finir de mûrir, puis 3 à 5 jours au frigo. Une seule couche, elles se tachent vite. Se congèle en quartiers ou en compote.", "En août, quand elle sent bon et cède un peu sous le doigt."],
  "Pêcher Reine des Vergers": ["1 à 3 jours à la cuisine pour finir de mûrir, puis 3 à 5 jours au frigo. Une seule couche. Se congèle en quartiers ou en compote.", "Août-début septembre, quand elle sent bon et cède un peu sous le doigt."],

  // ---- Raisins
  "Vigne Vanessa": ["Frigo (0 à 2 °C), grappes non lavées : 1 à 2 semaines. Par temps sec, tu peux aussi laisser les grappes sur le cep.", "En septembre, quand les grains sont bien sucrés (goûte avant de tout couper)."],
  "Vigne Romulus": ["Frigo (0 à 2 °C), grappes non lavées : 1 à 2 semaines. Par temps sec, tu peux aussi laisser les grappes sur le cep.", "Septembre-octobre, quand les grains sont dorés et sucrés."],

  // ---- Petits fruits
  "Framboisier Autumn Bliss": ["Très fragiles : frigo, non lavées, en une seule couche, 1 à 2 jours. Pour les garder, congèle-les à plat puis mets-les en sac.", "Le jour même de la cueillette."],
  "Camérisier (Lonicera caerulea)": ["Frigo 3 à 5 jours. Se congèle très bien.", "Quand l'intérieur de la baie est violet foncé (1 à 2 semaines après qu'elle a bleui) : avant, elle est très acide."],
  "Amélanchier Ballerina": ["Frigo 2 à 3 jours. Se congèle bien, ou en confiture.", "Juin-juillet, quand les baies sont bleu-violet foncé et sucrées."],
  "Goji (Lycium barbarum)": ["Frigo quelques jours. Séchées (four à 50 °C ou déshydrateur), elles se gardent un an en bocal.", "Bien rouges et souples, d'août à octobre."],
  "Cornouiller mâle (Cornus mas)": ["Frigo une semaine. Congélation, confiture, gelée ou sirop.", "Quand elles sont rouge foncé et tombent toutes seules : avant, elles sont âpres."],
  "Argousier": ["Congèle les rameaux coupés puis secoue : les baies se détachent. Plusieurs mois au congélateur, une semaine au frigo.", "Après les premières gelées, moins acides : en jus, sirop ou gelée."],
  "Aronia arbutifolia Brilliant": ["Frigo 2 à 3 semaines. Se congèle très bien, et le froid réduit l'astringence.", "Après les premières gelées, en jus, gelée ou confiture."],
  "Sorbier des oiseleurs": ["Passe-les une nuit au congélateur (ou attends les gelées) : l'amertume baisse. Ne pas en manger beaucoup crues.", "Octobre-novembre après gel, cuites en gelée avec des pommes."],
  "Elaeagnus angustifolia": ["Les fruits secs se gardent plusieurs mois dans un endroit sec et aéré.", "En octobre, quand ils sont farineux et sucrés."],
  "Elaeagnus Gilt Edge, Limelight, Viveleg": ["Frigo quelques jours ; en confiture ou gelée.", "Avril-mai, seulement bien rouges : avant, elles sont astringentes."],

  // ---- Autres fruits
  "Kiwi": ["Cueille-les fermes avant le gel. Au froid (0 à 4 °C, frigo ou cave) : 3 à 4 mois. Pour en mûrir quelques-uns, mets-les une semaine à la cuisine à côté de pommes.", "De décembre à mars, au fur et à mesure, quand il cède légèrement sous le doigt."],
  "Kiwaï": ["Frigo 2 à 4 semaines. Cueillis un peu fermes, ils mûrissent en quelques jours à la cuisine.", "Septembre-octobre, quand ils deviennent souples ; avec la peau."],
  "Kaki Mikatani Gosho": ["Ferme et bon : 2 à 4 semaines au frais. Âpre : laisse-le blettir à la cuisine à côté de pommes jusqu'à ce qu'il soit mou comme une gelée.", "De novembre à décembre."],
  "Kaki Sharon": ["Fais-le blettir à la cuisine (dans un sac en papier avec une pomme, c'est plus rapide) jusqu'à ce qu'il soit tout mou. Mûr : 2 à 3 jours au frigo. La congélation enlève aussi l'âpreté.", "De novembre à décembre, seulement bien blet."],
  "Pawpaw (Asimina triloba)": ["Très fragile : 2 à 3 jours à la cuisine, une semaine au frigo une fois mûr. La pulpe se congèle bien.", "Septembre-octobre, quand il est souple et sent la banane-mangue."],
  "Arbousier": ["Fragile : quelques jours au frigo. Plutôt en confiture ou en gelée.", "D'octobre à décembre, quand il est rouge foncé et tendre."],
  "Néflier": ["Fais-les blettir 2 à 3 semaines sur de la paille, dans un endroit frais et aéré, sans qu'ils se touchent.", "De fin novembre à décembre, quand la chair est brune et molle."],
  "Feijoa": ["Ramasse les fruits tombés. Quelques jours à la cuisine, 2 à 4 semaines au frigo.", "Octobre-novembre, quand la chair est translucide comme une gelée ; à la petite cuillère."],
  "Figuier Brown Turkey": ["Très fragiles : frigo 2 à 3 jours, en une seule couche. Sinon séchage ou confiture.", "Le jour de la cueillette, molles et penchées."],
  "Poivre du Japon (Zanthoxylum)": ["Fais sécher les baies à l'ombre, puis bocal fermé à l'abri de la lumière : un an. Les jeunes feuilles se congèlent.", "Baies cueillies quand elles rougissent et s'ouvrent ; jette les graines noires (amères), garde l'enveloppe."],
  "Châtaignier": ["Mets-les 24 h dans l'eau (jette celles qui flottent), sèche-les, puis frigo dans un sac percé : 1 à 2 mois. Plus longtemps : congèle-les incisées ou cuites.", "D'octobre à décembre ; plus sucrées après quelques jours au frais."],
  "Noyer (haute tige)": ["Enlève le brou, lave, fais sécher 2 à 3 semaines dans un endroit sec et aéré (grenier), puis en sac filet : jusqu'à un an en coque.", "Fraîches en septembre-octobre (pèle la peau du cerneau), ou sèches tout l'hiver."]
};
