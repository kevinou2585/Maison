#!/usr/bin/env python3
"""Fabrique jardin/index.html à partir du fichier du Jardin du Bonheur, sans toucher à l'original.

    python3 outils/construire-jardin.py chemin/vers/test-jardin-du-bonheur.html

Ajouts : icône et installation de l'appli, lien « Happiness », synchro Drive (../sync.js),
réglages pour petit écran, et les onglets lisibles envoyés à la feuille Google.
"""
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
out = pathlib.Path(__file__).resolve().parent.parent / "jardin" / "index.html"


def remplacer(s, avant, apres, n=1):
    if s.count(avant) < 1:
        sys.exit(f"introuvable dans le fichier source : {avant[:60]!r}")
    return s.replace(avant, apres, n)


TETE = """<link rel="manifest" href="../manifest.webmanifest">
<link rel="icon" href="../icones/jardin-192.png">
<link rel="apple-touch-icon" href="../icones/maison-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Happiness">
<meta name="theme-color" content="#2e6b3f">
<title>Jardin du Bonheur</title>"""

STYLE = """
/* Happiness : retour à l'accueil et petits écrans */
.maison-retour{display:inline-block;margin:calc(6px + env(safe-area-inset-top,0px)) 0 0;font:600 14px system-ui,-apple-system,sans-serif;color:inherit;opacity:.7;text-decoration:none}
#maison-maj{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;gap:10px;align-items:center;background:#1f3b29;color:#fff;padding:10px 14px;border-radius:14px;font:600 14px system-ui,-apple-system,sans-serif;box-shadow:0 4px 18px #0005;max-width:calc(100vw - 24px)}
#maison-maj button{font:inherit;border:0;border-radius:9px;padding:7px 12px;background:#fff;color:#1f3b29}
html,body{touch-action:manipulation}
/* Sur le plan : la petite flèche, plus précise que la main (demande de Kevin) */
#mw,#mw *,#omw,#omw *{cursor:default!important}
@media (max-width:640px){
  html,body{overflow-x:hidden}
  .tbl{overflow-x:auto;-webkit-overflow-scrolling:touch}
  input,select,textarea{font-size:16px}
}
"""

SYNCHRO = r"""<script src="../sync.js"></script>
<script>
// Synchro Drive du Jardin : chaque clé enregistrée par le jardin part dans la feuille Google.
window.MAISON_JARDIN = Maison.jardin({
  cles: /^(plan:v2|plan:orn:v2|verger:edit:v1|suivi:v1|jdb:fond:v1|ph:.*)$/,
  plein: () => { const m = document.getElementById('bm'); if (m) m.textContent = "Mémoire du téléphone pleine : certaines photos du Drive n'ont pas pu être copiées ici."; },
  recu(ids, premier) {
    // Au démarrage, on recharge tout de suite ; ensuite on propose, pour ne pas couper une saisie.
    const auDebut = premier || performance.now() < 6000;
    let deja = false; try { deja = sessionStorage.getItem('maison:jardin:rech') === '1'; } catch (e) {}
    if (auDebut && !deja) { try { sessionStorage.setItem('maison:jardin:rech', '1'); } catch (e) {} location.reload(); return; }
    if (document.getElementById('maison-maj')) return;
    const d = document.createElement('div'); d.id = 'maison-maj';
    d.innerHTML = '<span>☁️ Nouvelles modifications reçues du Drive</span><button type="button">Afficher</button>';
    d.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(d);
  },
  tables() {
    if (typeof PL === 'undefined' || PL.length < 2) return null;
    const FORME = {BT: 'Basse-tige', MT: 'Mi-tige', DT: 'Demi-tige', HT: 'Haute-tige', CO: 'Conteneur / colonne'};
    const plan = (i, k, ST) => PL[i].T.slice().sort((a, b) => (+a.n || 1e9) - (+b.n || 1e9) || a.id - b.id).map(t => {
      const f = ficheOf(k, t);
      return [+t.n ? String(t.n) : '', t.name || 'À identifier', FORME[t.sz] || t.sz || '', (ST[t.st] || [''])[0], f ? f.a[0] : '', f ? f.a[1] : '', t.x != null ? 'Oui' : 'Pas encore', t.note || ''];
    });
    const tete = ['N°', 'Arbre / variété', 'Forme', 'Statut', 'Groupe', 'Fiche liée', 'Placé sur le plan', 'Note'];
    const nom = (k, id) => { const t = PL[k === 'f' ? 0 : 1].T.find(x => String(x.id) === String(id)); return t ? [+t.n ? String(t.n) : '', t.name || 'À identifier'] : ['', '(supprimé du plan)']; };
    const dt = s => s ? String(s).split('-').reverse().join('/') : '';
    const suivi = [];
    Object.keys(SVD).sort().forEach(y => Object.keys(SVD[y] || {}).forEach(key => {
      const [k, id] = key.split(':'), r = SVD[y][key] || {};
      if (!Object.keys(r).length) return;
      suivi.push([y, k === 'f' ? 'Fruitiers' : 'Ornement', ...nom(k, id), dt(r.t), dt(r.r), r.rec || '', r.vig || '', r.mal || '', r.note || '']);
    }));
    return {
      'Verger – mes arbres': [tete, ...plan(0, 'f', ST1)],
      'Ornement – mes plantes': [tete, ...plan(1, 'o', ST2)],
      'Fiches fruitiers': [['Groupe', 'Nom', 'Floraison', 'Récolte', 'Soins', 'Pollinisation', 'Taille', 'À vérifier'], ...ficheList('f').map(x => x.a.slice(0, 8))],
      'Fiches ornement': [['Groupe', 'Nom', 'Floraison', 'Taille', 'Entretien', 'À savoir'], ...ficheList('o').map(x => x.a.slice(0, 6))],
      'Suivi des arbres': [['Année', 'Plan', 'N°', 'Arbre', 'Taillé le', 'Récolté le', 'Récolte', 'Vigueur', 'Maladies', 'Note'], ...suivi]
    };
  }
});
Maison.pastille();
</script>
"""

s = src
# Le titre « Test » devient le vrai nom dans l'appli
s = remplacer(s, "<title>Test jardin du bonheur</title>", TETE)
s = remplacer(s, '<header class="hero"><h1>Test jardin du bonheur</h1>', '<a class="maison-retour" href="../">‹ Happiness</a><header class="hero"><h1>Jardin du Bonheur</h1>')
s = remplacer(s, "</style></head>", STYLE + "</style></head>")
s = remplacer(s, "<script>\nconst N={", SYNCHRO + "<script>\nconst N={")
# Forme libre : en lâchant un point, la forme se décalait de quelques cm (arrondi au 10 cm du centre et des points séparément)
s = remplacer(s, 'o.p=o.p.map(([x,y])=>[r1(x-cx),r1(y-cy)]);o.x=r1(o.x+cx*Math.cos(a)-cy*Math.sin(a));o.y=r1(o.y+cx*Math.sin(a)+cy*Math.cos(a));', 'const r3=v=>Math.round(v*1000)/1000;o.p=o.p.map(([x,y])=>[r3(x-cx),r3(y-cy)]);o.x=r3(o.x+cx*Math.cos(a)-cy*Math.sin(a));o.y=r3(o.y+cx*Math.sin(a)+cy*Math.cos(a));')
# Clôtures, grillages, palissades, allées en forme libre : une ligne à 2 points (ou plus) avec une épaisseur (demande de Kevin)
s = remplacer(s, 'const FEN={clo:1,clg:1,cpa:1,cph:1,gan:1,mur:1,mub:1,por:1,pti:1};', 'const FEN={clo:1,clg:1,cpa:1,cph:1,gan:1,mur:1,mub:1,por:1,pti:1};\nconst LIG=o=>!!(FEN[o.t]||o.t==="all"),ligne=o=>!!(o&&LIG(o)&&oF(o)==="p"&&o.p&&o.lg),longueur=o=>o.p.reduce((t,q,i)=>i?t+Math.hypot(q[0]-o.p[i-1][0],q[1]-o.p[i-1][1]):0,0);')
s = remplacer(s, 'if(FEN[o.t]){ink=false;base="transparent";const lng=w>=h,', 'if(o.t==="all"&&ligne(o)){ink=false;base="transparent";const t=Math.max((o.ep||2)*S,lw*2),pts=o.p.map(([x,y])=>f1(x*S)+","+f1(y*S)).join(" "),xs=o.p.map(q=>q[0]*S),ys=o.p.map(q=>q[1]*S),x0=Math.min(...xs)-t,y0=Math.min(...ys)-t;L.push(`<rect x=${f1(x0)} y=${f1(y0)} width=${f1(Math.max(...xs)+t-x0)} height=${f1(Math.max(...ys)+t-y0)} fill="none" pointer-events=none /><polyline points="${pts}" fill=none stroke="transparent" stroke-width=${f1(t+m)} stroke-linecap=round stroke-linejoin=round /><polyline points="${pts}" fill=none stroke="#b3a27c" stroke-width=${f1(t+lw*1.6)} stroke-linecap=round stroke-linejoin=round /><polyline points="${pts}" fill=none stroke="#ebe0c4" stroke-width=${f1(t)} stroke-linecap=round stroke-linejoin=round />`)}else if(FEN[o.t]&&ligne(o)){ink=false;base="transparent";const t=Math.max((o.ep||.15)*S,lw*2.6),P=o.p.map(([x,y])=>[x*S,y*S]);for(let i=1;i<P.length;i++){const a2=P[i-1],b2=P[i],Ls=Math.hypot(b2[0]-a2[0],b2[1]-a2[1]);if(Ls<.5)continue;L.push(`<g transform="translate(${f1((a2[0]+b2[0])/2)},${f1((a2[1]+b2[1])/2)}) rotate(${(Math.atan2(b2[1]-a2[1],b2[0]-a2[0])*180/Math.PI).toFixed(2)})"><rect x=${f1(-Ls/2)} y=${f1(-t)} width=${f1(Ls)} height=${f1(t*2)} fill="transparent" />${fenceArt(o.t,Ls,t,m,lw,r)}</g>`)}}else if(FEN[o.t]){ink=false;base="transparent";const lng=w>=h,')
s = remplacer(s, 'FEN[o.t]?fmtM(Math.max(o.w,o.h)):', 'ligne(o)?fmtM(longueur(o)):FEN[o.t]?fmtM(Math.max(o.w,o.h)):')
s = remplacer(s, 'o.f=v;if(v==="p"){if(!o.p)o.p=', 'o.f=v;if(v==="p"&&LIG(o)&&!o.lg){o.p=(o.w>=o.h?[[-o.w/2,0],[o.w/2,0]]:[[0,-o.h/2],[0,o.h/2]]).map(q=>q.map(r1));o.lg=1;o.ep=o.ep||Math.round(Math.min(o.w,o.h)*100)/100||.15}if(v==="p"){if(!o.p)o.p=')
s = remplacer(s, 'if($("o10"))$("o10").onclick=()=>delV(EDS.v);', 'if($("o10"))$("o10").onclick=()=>delV(EDS.v);if(ligne(o)){["o3","o4"].forEach(k=>{const e=$(k);if(e)e.closest("label").hidden=true});$("o3").closest(".r2").insertAdjacentHTML("beforebegin",`<label>${o.t==="all"?"Largeur":"Épaisseur"} (cm)<input ${I("o11")} type=number min=1 step=${o.t==="all"?10:1} value=${Math.round((o.ep||.15)*100)}></label><p class=mut style="font-size:13px;margin:4px 0 0">Longueur totale : ${fmtM(longueur(o))} m · ${o.p.length} points</p>`);u("o11",v=>{const n=+String(v).replace(",",".");if(n>0)o.ep=n/100})}')
s = remplacer(s, 'hk=Math.max(W,Hh)/(svg.clientWidth||900)*4.5;let P=null;', 'hk=Math.max(W,Hh)/(svg.clientWidth||900)*4.5;let P=null,OUV=false;')
s = remplacer(s, 'if(o&&o.p)P=o.p.map(q=>wPt(o,q,S))}', 'if(o&&o.p){P=o.p.map(q=>wPt(o,q,S));OUV=ligne(o)}}')
s = remplacer(s, 'return len<.3?"":`<text x=${((a[0]+b[0])/2+nx)', 'return len<.3||(OUV&&i===P.length-1)?"":`<text x=${((a[0]+b[0])/2+nx)')
s = remplacer(s, 'if(P)return EL+P.map((a,i)=>{const b=P[(i+1)%P.length],cx=', 'if(P)return EL+P.map((a,i)=>{if(OUV&&i===P.length-1)return"";const b=P[(i+1)%P.length],cx=')
s = remplacer(s, 'if(A.length<=3){msg("Une forme garde au moins 3 points.");return}', 'if(A.length<=(EDS.k==="obj"&&ligne(gO(EDS.id))?2:3)){msg(EDS.k==="obj"&&ligne(gO(EDS.id))?"Il faut garder au moins 2 points.":"Une forme garde au moins 3 points.");return}')
# Stylo : mode « point par point » pour les chemins, et chemins sans contour noir (demande de Kevin)
CHM = '["gra","dal","pas","pel","ter","bet"].includes(c.k)'
s = remplacer(s, 'if(!wc)return s+`<path d="${d}" fill=none stroke="${on?"#ffeb3b":k[2]}" stroke-width=${f1(w+4)}', 'if(!wc)return s+(!on&&' + CHM + '?"":`<path d="${d}" fill=none stroke="${on?"#ffeb3b":k[2]}" stroke-width=${f1(w+4)} stroke-linecap=round stroke-linejoin=round />`)+`<path d="${d}" fill=none stroke="${k[1]}" stroke-width=${f1(w)} stroke-linecap=round stroke-linejoin=round /></g>`;if(0)return s+`<path d="${d}" fill=none stroke="${on?"#ffeb3b":k[2]}" stroke-width=${f1(w+4)}')
s = remplacer(s, 's+=`<g pointer-events=none><path d="${d}" fill=none stroke="#1f2a14"', 'const CHM=' + CHM + ';s+=CHM?`<g pointer-events=none><g filter="url(#wb${p})">`:`<g pointer-events=none><path d="${d}" fill=none stroke="#1f2a14"')
s = remplacer(s, 'else{s+=`<path d="${d}" fill=none stroke="${INK}" stroke-width=${f1(w+lw*2.4)}', 'else{s+=(CHM?"":`<path d="${d}" fill=none stroke="${INK}" stroke-width=${f1(w+lw*2.4)} stroke-linecap=round stroke-linejoin=round />`)+`<path d="${d}" fill=none stroke="${k[1]}" stroke-width=${f1(w)} stroke-linecap=round stroke-linejoin=round />`;if(0)s+=`<path d="${d}" fill=none stroke="${INK}" stroke-width=${f1(w+lw*2.4)}')
s = remplacer(s, 'PEN={k:"gra",w:""};', 'PEN={k:"gra",w:"",m:(()=>{try{return localStorage.getItem("jdb:stylo:m")||""}catch(e){return""}})()};')
s = remplacer(s, 'function pForm(){', 'let PTS=null;\nfunction ptsSvg(){if(!PTS||MODE!=="pen"||!BG||!BG.w)return"";const S=dims()[0]/BG.w,k=CT[PEN.k]||CT.gra,w=(PEN.w||k[3])*S,P=PTS.map(([x,y])=>[x*S,y*S]),r=Math.max(5,S*.4);return`<g pointer-events=none>${P.length>1?`<path d="${smooth(P)}" fill=none stroke="${k[1]}" stroke-opacity=.85 stroke-width=${f1(w)} stroke-linecap=round stroke-linejoin=round />`:""}${P.map((q,i)=>`<circle cx=${f1(q[0])} cy=${f1(q[1])} r=${f1(r)} fill="${i===P.length-1?"#ffd400":"#1f6fa8"}" stroke="#fff" stroke-width=${f1(r*.35)} />`).join("")}</g>`}\nfunction finPts(){if(PTS&&PTS.length>1){(BG.c=BG.c||[]).push({id:"c"+Date.now().toString(36),k:PEN.k,w:PEN.w||"",pts:PTS});bgS()}PTS=null;drawMap();if(MODE==="pen")pForm()}\nfunction pForm(){')
s = remplacer(s, '<label>Largeur (m)<input ${I("e4")} type=number min=0.2 step=0.1 value="${PEN.w||""}" placeholder="Auto : ${fmtM(CT[PEN.k][3])} m"></label><div class=tb><button class=bigb ${I("e2")}>✓ Terminer</button></div></div>`;',
 '<label>Largeur (m)<input ${I("e4")} type=number min=0.2 step=0.1 value="${PEN.w||""}" placeholder="Auto : ${fmtM(CT[PEN.k][3])} m"></label><label>Façon de tracer<select ${I("e5")}><option value="">✋ À main levée</option><option value=pts ${PEN.m==="pts"?"selected":""}>📍 Point par point</option></select></label>${PEN.m==="pts"?`<p class=mut style="font-size:13px;margin:6px 0 0">Clique sur le plan pour poser les points l\'un après l\'autre : ils se relient tout seuls. Reclique sur le dernier point (ou « Finir ce chemin ») pour terminer.${PTS?` <b>${PTS.length} point${PTS.length>1?"s":""} posé${PTS.length>1?"s":""}.</b>`:""}</p>${PTS?`<div class=tb><button class=bigb ${I("e6")}>✓ Finir ce chemin</button><button ${I("e7")}>↶ Enlever le dernier point</button></div>`:""}`:""}<div class=tb><button class=bigb ${I("e2")}>✓ Terminer</button></div></div>`;if($("e5"))$("e5").onchange=()=>{if(PTS)finPts();PEN.m=$("e5").value;try{localStorage.setItem("jdb:stylo:m",PEN.m)}catch(e){}hint();pForm()};if($("e6"))$("e6").onclick=()=>finPts();if($("e7"))$("e7").onclick=()=>{PTS.pop();if(!PTS.length)PTS=null;drawMap();pForm()};')
s = remplacer(s, '$("e2").onclick=()=>{MODE=null;redraw()}}', '$("e2").onclick=()=>{if(PTS)finPts();MODE=null;redraw()}}')
s = remplacer(s, '+hSvg()+"</g>";updOr(ter);', '+hSvg()+ptsSvg()+"</g>";updOr(ter);')
s = remplacer(s, 'if(MODE==="pen"){DR={pen:[[r1(x/S),r1(y/S)]],m:true};', 'if(MODE==="pen"&&PEN.m==="pts"){const q=[r1(x/S),r1(y/S)];if(PTS&&PTS.length>1){const l=PTS[PTS.length-1];if(Math.hypot(q[0]-l[0],q[1]-l[1])<Math.max(.5,BG.w/120)){finPts();return}}(PTS=PTS||[]).push(q);drawMap();pForm();return}if(MODE==="pen"){DR={pen:[[r1(x/S),r1(y/S)]],m:true};')
s = remplacer(s, 'MODE==="pen"?"Stylo : dessine', 'MODE==="pen"?PEN.m==="pts"?"Point par point : clique pour poser chaque point du chemin, reclique sur le dernier pour finir.":"Stylo : dessine')
s = remplacer(s, 'if(e.key==="Escape"&&(SEL!=null', 'if(PTS&&(e.key==="Enter"||e.key==="Escape")){finPts();return}if(e.key==="Escape"&&(SEL!=null')
for a in ['$("bP").onclick=()=>{', '$("bX").onclick=()=>{', '$("sx").onclick=()=>{']:
    s = remplacer(s, a, a + 'if(PTS)finPts();')

# Chemins qui se touchent : rendus ensemble (un seul tracé continu par type) et bouts accrochés au chemin touché (demande de Kevin)
s = remplacer(s, 'function pathArt(c,S,p,on,wc){', r"""const CHK=["gra","dal","pel","ter","bet"];
function cheminsArt(cs,S,p,selC,wc){let out="";const G={};cs.forEach(c=>{if(CHK.includes(c.k)&&c.pts&&c.pts.length>1)(G[c.k]=G[c.k]||[]).push(c);else out+=pathArt(c,S,p,c.id===selC,wc)});
for(const kk in G){const k=CT[kk],L=G[kk].map(c=>({c,d:smooth(c.pts.map(([x,y])=>[x*S,y*S])),w:(+c.w||k[3])*S})),st=(col,f=1,x="")=>L.map(o=>`<path d="${o.d}" fill=none stroke="${col}" stroke-width=${f1(o.w*f)} stroke-linecap=round stroke-linejoin=round ${x}/>`).join("");
const fill=wc&&{dal:`url(#st${p})`,bet:`url(#pv${p})`,gra:`url(#gv${p})`}[kk];
out+=wc?`<g pointer-events=none><g filter="url(#wb${p})">${st(k[1])}${fill?st(fill):""}${kk==="pel"?`<g opacity=.6>${st("#d9efb0",.35)}</g>`:""}${kk==="ter"?`<g opacity=.45>${st("#8a6036",.8,`stroke-dasharray="1 ${f1(S*.2)}"`)}</g>`:""}</g></g>`:`<g pointer-events=none>${st(k[1])}</g>`;
out+=L.map(o=>`<g class=cp data-c="${o.c.id}" style="cursor:pointer"><path d="${o.d}" fill=none stroke="transparent" stroke-width=${f1(Math.max(o.w,24))} stroke-linecap=round stroke-linejoin=round />${o.c.id===selC?`<path d="${o.d}" fill=none stroke="#ffeb3b" stroke-width=4 stroke-dasharray="10 6" pointer-events=none />`:""}</g>`).join("")}
return out}
function accroche(pts,k,w){if(!CHK.includes(k)||!pts||pts.length<2)return pts;const r=(+w||CT[k][3])/2;[0,pts.length-1].forEach(i=>{const q=pts[i];let best=null,bd=1e9;(BG.c||[]).forEach(c=>{if(!CHK.includes(c.k)||!c.pts)return;const lim=(+c.w||CT[c.k][3])/2+r+.5;for(let j=1;j<c.pts.length;j++){const a=c.pts[j-1],b=c.pts[j],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/l2)):0,x=a[0]+dx*t,y=a[1]+dy*t,d=Math.hypot(q[0]-x,q[1]-y);if(d<lim&&d<bd){bd=d;best=[r1(x),r1(y)]}}});if(best)pts[i]=best});return pts}
function pathArt(c,S,p,on,wc){""")
s = remplacer(s, 's+=(BG.c||[]).map(c=>pathArt(c,S,PID,c.id===selC,wc)).join("");', 's+=cheminsArt(BG.c||[],S,PID,selC,wc);')
s = remplacer(s, 'k:PEN.k,w:PEN.w||"",pts:PTS}', 'k:PEN.k,w:PEN.w||"",pts:accroche(PTS,PEN.k,PEN.w)}')
s = remplacer(s, 'k:PEN.k,w:PEN.w||"",pts:d.pen}', 'k:PEN.k,w:PEN.w||"",pts:accroche(d.pen,PEN.k,PEN.w)}')

# Numéros des arbres : taille réglable (− / +) et afficher ou masquer, retenu par plan (demande de Kevin)
s = remplacer(s, '<text text-anchor=middle dy=".36em" font-size=${((t.n>9?15:18)*ts).toFixed(1)} font-weight=800 fill="#fff" stroke="rgba(0,0,0,.8)" stroke-width=${(3*ts).toFixed(1)} paint-order=stroke pointer-events=none>${t.n||"?"}</text>', '${NUM.on?`<text text-anchor=middle dy=".36em" font-size=${((t.n>9?15:18)*ts*NUM.k).toFixed(1)} font-weight=800 fill="#fff" stroke="rgba(0,0,0,.8)" stroke-width=${(3*ts*NUM.k).toFixed(1)} paint-order=stroke pointer-events=none>${t.n||"?"}</text>`:""}')
s = remplacer(s, '<p class=mut style="margin:2px 0 6px;font-size:.82em">Astuce : la molette de la souris zoome à l\'endroit du curseur.</p>', '<p class=mut style="margin:2px 0 6px;font-size:.82em">Astuce : la molette de la souris zoome à l\'endroit du curseur.</p><b>🔢 Numéros des arbres</b><div class=tb style="margin:4px 0 8px"><span class=zm><button ${I("nzm")} aria-label="Numéros plus petits">−</button><button ${I("nzv")} title="Taille normale">100 %</button><button ${I("nzp")} aria-label="Numéros plus grands">＋</button></span><button ${I("nzh")}>🙈 Masquer</button></div>')
s = remplacer(s, '$("zf").onclick=()=>{ZM=1;zoom()};', '$("zf").onclick=()=>{ZM=1;zoom()};\nconst NUMK="jdb:numeros:"+P.fk;let NUM={k:.8,on:true};try{Object.assign(NUM,JSON.parse(localStorage.getItem(NUMK)||"{}"))}catch(e){}\nconst numMaj=(v)=>{if(v)try{localStorage.setItem(NUMK,JSON.stringify(NUM))}catch(e){}$("nzv").textContent=Math.round(NUM.k*100)+" %";$("nzh").textContent=NUM.on?"🙈 Masquer":"👁️ Afficher";$("nzm").disabled=$("nzp").disabled=$("nzv").disabled=!NUM.on;if(v)drawMap()};numMaj();\n$("nzm").onclick=()=>{NUM.k=Math.max(.3,Math.round((NUM.k-.1)*10)/10);numMaj(1)};$("nzp").onclick=()=>{NUM.k=Math.min(2.5,Math.round((NUM.k+.1)*10)/10);numMaj(1)};$("nzv").onclick=()=>{NUM.k=1;numMaj(1)};$("nzh").onclick=()=>{NUM.on=!NUM.on;numMaj(1)};')

# Arbre : boutons − / + pour sa taille en bas de ses réglages, et option « un clic ouvre sa fiche » dans Affichage (demande de Kevin)
s = remplacer(s, ':k*SZ[t.isz||autoSz(t)]', ':k*SZ[t.isz||autoSz(t)]*(+t.isk||1)')
s = remplacer(s, '<button ${I("g3")}>Supprimer</button></div></div>`;', '<button ${I("g3")}>Supprimer</button></div>${t.x==null?"":`<div class=tb style="align-items:center;margin-top:8px"><b>Taille sur le plan</b><span class=zm><button ${I("g5")} aria-label="Arbre plus petit">−</button><button ${I("g6")} aria-label="Arbre plus grand">＋</button></span></div>`}</div>`;\nconst tTaille=f=>{if(BG&&BG.t==="ter"){const d0=+t.dm||autoDm(P,t);t.dm=Math.max(.3,Math.round(d0*f*10)/10)}else t.isk=Math.max(.3,Math.min(4,Math.round((+t.isk||1)*f*100)/100));sv();drawMap();drawForm()};if($("g5"))$("g5").onclick=()=>tTaille(1/1.15);if($("g6"))$("g6").onclick=()=>tTaille(1.15);')
s = remplacer(s, 'pick(d.t.id);return}', 'pick(d.t.id);if(!d.m&&FCL){const a=$("pf").querySelector(".ficheA")||$("g4");if(a)a.click()}return}')
s = remplacer(s, '<b>🔢 Numéros des arbres</b>', '<label class=ck style="display:block;margin:0 0 8px"><input type=checkbox ${I("fcl")}> 📖 Un clic sur un arbre ouvre sa fiche</label><b>🔢 Numéros des arbres</b>')
s = remplacer(s, 'const NUMK="jdb:numeros:"+P.fk;', 'const FCLK="jdb:clicfiche:"+P.fk;let FCL=false;try{FCL=localStorage.getItem(FCLK)==="1"}catch(e){}$("fcl").checked=FCL;$("fcl").onchange=()=>{FCL=$("fcl").checked;try{localStorage.setItem(FCLK,FCL?"1":"")}catch(e){}};\nconst NUMK="jdb:numeros:"+P.fk;')

# Vue 3D retirée complètement (bouton, code three.js et styles) : jugée inutile par Kevin
_i = s.find('// ---------- Vue 3D'); _k = s.find('\nconst msg=t=>', _i)
if _i < 0 or _k < 0: sys.exit("bloc Vue 3D introuvable")
s = s[:_i] + s[_k+1:]
s = remplacer(s, '<button ${I("b3")} class=b3>🧊 Vue 3D</button>', '')
s = remplacer(s, '$("b3").onclick=()=>v3open(P,T);', '')
s = re.sub(r'#v3ov\{.*?\.v3m\{[^}]*\}', '', s, count=1, flags=re.S)
s = remplacer(s, '.acard .b3{font-weight:600}', '')

# Arbre : orientation de l'icône (utile pour une vigne, un kiwi, une grimpante), demande de Kevin
s = remplacer(s, 'style="cursor:grab">${WC?treeArt(P.IC[key],sc*23,t.id,key,t.name):`<g transform="scale(${sc.toFixed(3)})">${iconSvg(P.IC[key])}</g>`}', 'style="cursor:grab"><g transform="rotate(${+t.ro||0})">${WC?treeArt(P.IC[key],sc*23,t.id,key,t.name):`<g transform="scale(${sc.toFixed(3)})">${iconSvg(P.IC[key])}</g>`}</g>')
s = remplacer(s, '<button ${I("g6")} aria-label="Arbre plus grand">＋</button></span></div>`}', '<button ${I("g6")} aria-label="Arbre plus grand">＋</button></span></div><label style="margin-top:8px">Orientation de l\'icône : <b>${+t.ro||0}°</b><input type=range ${I("g9")} min=-180 max=180 step=5 value=${+t.ro||0} style="width:100%"></label><div class=tb><button ${I("g7")}>⟲ 15°</button><button ${I("g8")}>⟳ 15°</button><button ${I("g10")}>Droit</button></div>`}')
s = remplacer(s, 'if($("g5"))$("g5").onclick=()=>tTaille(1/1.15);', 'const tRot=v=>{v=((Math.round(v)+180)%360+360)%360-180;t.ro=v;const l=$("g9");if(l){l.value=v;l.previousElementSibling.textContent=v+"°"}drawMap()};if($("g9")){$("g9").oninput=()=>tRot(+$("g9").value);$("g9").onchange=()=>sv();$("g7").onclick=()=>{tRot((+t.ro||0)-15);sv()};$("g8").onclick=()=>{tRot((+t.ro||0)+15);sv()};$("g10").onclick=()=>{tRot(0);sv()}}if($("g5"))$("g5").onclick=()=>tTaille(1/1.15);')

# Plan plus fluide avec beaucoup d'arbres (signalé par Kevin) : le fond (terrain, éléments, chemins) n'est reconstruit
# que s'il a changé, sinon seuls les arbres sont redessinés ; et la saisie au clavier ne redessine qu'à la pause.
s = remplacer(s, 'svg.innerHTML=`<g ${I("rg")} transform="rotate(${VB[4]} ${(W/2).toFixed(1)} ${(Hh/2).toFixed(1)})">`+bgSvg(SELO,SELC,EDS&&EDS.k==="ter",nm)+VT.map(', 'const RT=`rotate(${VB[4]} ${(W/2).toFixed(1)} ${(Hh/2).toFixed(1)})`,BGS=bgSvg(SELO,SELC,EDS&&EDS.k==="ter",nm),TRS=VT.map(')
s = remplacer(s, '+hSvg()+ptsSvg()+"</g>";updOr(ter);', '+hSvg()+ptsSvg();{const rg0=$("rg");if(rg0&&rg0.parentNode===svg&&svg.__bg===BGS&&rg0.children.length>=2){while(rg0.children.length>2)rg0.lastElementChild.remove();rg0.setAttribute("transform",RT);rg0.children[1].innerHTML=TRS}else{svg.innerHTML=`<g ${I("rg")} transform="${RT}"><g>${BGS}</g><g>${TRS}</g></g>`;svg.__bg=BGS}}updOr(ter);')
s = remplacer(s, 'const u=(id,fn,full)=>$(id).oninput=$(id).onchange=()=>{fn($(id).value);sv();drawMap();drawList();if(full)drawForm()};', 'const u=(id,fn,full)=>{const go=()=>{clearTimeout(UTM);fn($(id).value);sv();drawMap();drawList();if(full)drawForm()};$(id).onchange=go;$(id).oninput=$(id).tagName==="INPUT"&&$(id).type!=="checkbox"?()=>{fn($(id).value);clearTimeout(UTM);UTM=setTimeout(go,300)}:go};')
s = remplacer(s, 'let SHP=null;function placeSheet(){', 'let UTM=0;let SHP=null;function placeSheet(){')

s = remplacer(s, 'function treeArt(ic,R,seed,key,nm){', 'const TAC=new Map();function treeArt(ic,R,seed,key,nm){const ck=PID+"|"+ic.join()+"|"+R+"|"+seed+"|"+key+"|"+nm,hit=TAC.get(ck);if(hit)return hit;const out=treeArt1(ic,R,seed,key,nm);if(TAC.size>3000)TAC.clear();TAC.set(ck,out);return out}\nfunction treeArt1(ic,R,seed,key,nm){')

# Identifiants de filtres stables (avant, chaque redessin en créait de nouveaux : le fond changeait toujours et tout était reconstruit)
s = remplacer(s, 'id="grs"+(++PID),cid="cl"+PID', 'id="grs"+PID,cid="cl"+PID')
s = remplacer(s, 'S=46/Math.max(d[4],d[5],.1);PID++;return`<svg viewBox="-28 -28 56 56" width=56 height=56 aria-hidden=true><defs>${wcDefs(PID,S)}</defs>${objArt({id:"tv"+k,t:k,x:0,y:0,w:d[4],h:d[5],r:0},d,S,PID,false)}</svg>`', 'S=46/Math.max(d[4],d[5],.1),TP="t"+k;return`<svg viewBox="-28 -28 56 56" width=56 height=56 aria-hidden=true><defs>${wcDefs(TP,S)}</defs>${objArt({id:"tv"+k,t:k,x:0,y:0,w:d[4],h:d[5],r:0},d,S,TP,false)}</svg>`')
s = remplacer(s, 'function drawMap(){if(!BG)return;', 'function drawMap(){if(!BG)return;PID=P.fk==="o"?2:1;')

# Seul l'arbre modifié est redessiné (comparaison arbre par arbre), les poignées à part
s = remplacer(s, '}).join("")+hSvg()+ptsSvg();{const rg0=$("rg");if(rg0&&rg0.parentNode===svg&&svg.__bg===BGS&&rg0.children.length>=2){while(rg0.children.length>2)rg0.lastElementChild.remove();rg0.setAttribute("transform",RT);rg0.children[1].innerHTML=TRS}else{svg.innerHTML=`<g ${I("rg")} transform="${RT}"><g>${BGS}</g><g>${TRS}</g></g>`;svg.__bg=BGS}}',
 '}),HDS=hSvg()+ptsSvg();{const rg0=$("rg");if(rg0&&rg0.parentNode===svg&&svg.__bg===BGS&&rg0.children.length>=3){while(rg0.children.length>3)rg0.lastElementChild.remove();rg0.setAttribute("transform",RT);const gT=rg0.children[1],old=svg.__tr||[];if(svg.__rt===RT&&old.length===TRS.length&&gT.children.length===TRS.length){for(let i=0;i<TRS.length;i++)if(old[i]!==TRS[i]){const tmp=document.createElementNS("http://www.w3.org/2000/svg","g");tmp.innerHTML=TRS[i];if(tmp.firstElementChild)gT.replaceChild(tmp.firstElementChild,gT.children[i])}}else gT.innerHTML=TRS.join("");if(svg.__hd!==HDS)rg0.children[2].innerHTML=HDS}else{svg.innerHTML=`<g ${I("rg")} transform="${RT}"><g>${BGS}</g><g>${TRS.join("")}</g><g>${HDS}</g></g>`;svg.__bg=BGS}svg.__tr=TRS;svg.__hd=HDS;svg.__rt=RT}')

# Plan du verger : plus de section « À placer sur le plan » ; seuls les arbres posés sur le plan sont listés (demande de Kevin).
# Les arbres non placés ne sont pas effacés : ils restent dans les données, simplement cachés.
s = remplacer(s, '$("pc").innerHTML=OV+`<p><b>${T.length-cn.u}</b> sur le plan · <b>${cn.u}</b> pas encore placés<br>', '$("pc").innerHTML=OV+`<p><b>${T.length-cn.u}</b> sur le plan${P.fk==="f"?"":` · <b>${cn.u}</b> pas encore placés`}<br>')
s = remplacer(s, 'B=L.filter(t=>t.x==null&&t.name),C=L.filter(t=>!t.name);', 'B=L.filter(t=>t.x==null&&t.name),C=L.filter(t=>!t.name&&(P.fk!=="f"||t.x!=null));')
s = remplacer(s, '+sec("b","📦 À placer sur le plan",B)+sec("c","❓ Arbres pas encore identifiés",C,`<button class=nu type=button data-nu=1>＋ Nouvel arbre non identifié</button>`)}', '+(P.fk==="f"?"":sec("b","📦 À placer sur le plan",B))+sec("c","❓ Arbres pas encore identifiés",C,P.fk==="f"?"":`<button class=nu type=button data-nu=1>＋ Nouvel arbre non identifié</button>`)}')

out.write_text(s, encoding="utf-8")
print(out, len(s))
