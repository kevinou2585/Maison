// ARA : listes de départ des classes (2026-2027). Ne sert qu'au tout premier lancement :
// ensuite les élèves se modifient dans l'appli (➕ Ajouter un élève, ✏️ dans la fiche).
// Ordre = ordre des listes de l'école.
const ARA_CLASSES = ['5B', '5DE', '4A', '4B'];
const ARA_LISTES = {
  '5B': [
    ['Abrassart', 'Robin'], ['Byiringiro', 'Anabel-Benita'], ['Créteur', 'Eloïse'], ['Darcon', 'Julien'],
    ['Debaisieux', 'Emma'], ['Delcroix', 'Alexandra'], ['Depraetere', 'Emeline'], ['Gouba', 'Sarah Kinolo'],
    ['Khanenko', 'Dmytro'], ['Laderriere', 'Gabriel'], ['Laline', 'Rose-Hortense'], ['Leshaf', 'Ines'],
    ['Lo-Presti', 'Jeannelle'], ['Meunier', 'Mila'], ['Ntamusano', 'Mariam'], ['Pipers', 'Estelle'],
    ['Pirz', 'Jade'], ['Remy', 'Lisa'], ['Soudan', 'Malone'], ['Verhaert', 'Zélie'], ['Weytsman', 'Maxime']
  ],
  '5DE': [
    ['Caudry', 'Alice'], ['Lefebvre', 'Esteban'], ['Sousa Santos', 'Elisa'], ['Van Dooren', 'Eva'],
    ['Akhazzan', 'Sara'], ['Buyst', 'Charlize'], ['Cantaert', 'Lara'], ['Castelin', 'Mathis'],
    ['Daspremont', 'Enora'], ['Florio', 'Ilenia'], ['Kumova', 'Ema']
  ],
  '4A': [
    ['Bali', 'Hafsa'], ['Blondeau', 'Lyana'], ['Charon', 'Ethan'], ['Da Silveira', 'Tele'], ['Dione', 'Ndeye'],
    ['Dubois', 'Eléna'], ['Fellah', 'Mélissa'], ['Fenaux', 'Nathan'], ['Glodeanu', 'Gabriel'], ['Guery', 'Corentin'],
    ['Hemeleers', 'Noa'], ['Herman', 'Jade'], ['Jacobs', 'Léa'], ['Kais Medari', 'Taha'], ['Layeux', 'Marion'],
    ['Lelangue', 'Charly'], ['Lievens', 'Yvan'], ['Minani', 'Shabani'], ['Muhirwa', 'Zélie'], ['Ntamusano', 'Noura'],
    ['Paglialunga', 'Lara'], ['Risselin', 'Ana'], ['Vanluchene', 'Denis']
  ],
  '4B': [
    ['Al Masarweh', 'Talal'], ['Cordier', 'Simon'], ['Detilleux', 'Gaspard'], ['Durot', 'Noé'], ['Geets', 'Romane'],
    ['Gusita', 'Céline'], ['Habarugira', 'Eliâm'], ['Habarugira', 'Noâm'], ['Kempton', 'Hélène'], ['Lebbe', 'Rafael'],
    ['Mafwanikisa', 'Acacia'], ['Parashiv', 'Yasmine'], ['Salha', 'Anas'], ['Vasilescuvia', 'Bianca'],
    ['Verset', 'Noah'], ['Willocq', 'Nathan']
  ]
};
// Périodes de l'école (P1, P2, P3) : dates PROVISOIRES, à corriger dans ⚙️ Réglages.
const ARA_PERIODES = [
  {nom: 'P1', debut: '2026-08-31', fin: '2026-12-23'},
  {nom: 'P2', debut: '2026-12-24', fin: '2027-03-31'},
  {nom: 'P3', debut: '2027-04-01', fin: '2027-07-09'}
];
