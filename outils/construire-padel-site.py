"""Fabrique le site autonome du Padel (beapp.be/jpadel/ ; copie de secours kevinou.be/coach-padel-jean/) à partir du dossier padel/ de Happiness.

  racine      = page de réservation publique (padel/reserver/index.html)
  coach/      = l'appli du prof (tout le dossier padel/ sauf reserver/ et reprise/)
  reprise/    = formulaire de reprise des élèves actuels (padel/reprise/index.html)

Usage : python3 outils/construire-padel-site.py DOSSIER_DE_SORTIE
Puis envoi : envoyer-kevinou.ps1 -Dossier <nom> -Cible "www/jpadel" -Site beapp
"""
import os, shutil, sys
ici = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, out = os.path.join(ici, 'padel'), sys.argv[1]
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, os.path.join(out, 'coach'), ignore=shutil.ignore_patterns('reserver', 'reprise'))
page = open(os.path.join(src, 'reserver', 'index.html'), encoding='utf-8').read()
assert '../icones/' in page
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page.replace('../icones/', 'coach/icones/'))
rep = open(os.path.join(src, 'reprise', 'index.html'), encoding='utf-8').read()
assert '../icones/' in rep
os.makedirs(os.path.join(out, 'reprise'))
open(os.path.join(out, 'reprise', 'index.html'), 'w', encoding='utf-8').write(rep.replace('../icones/', '../coach/icones/'))
print('ok', out)
