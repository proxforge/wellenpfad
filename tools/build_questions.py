"""Erzeugt js/questions.js aus dem aufbereiteten amtlichen ELWIS-Fragenkatalog.

Quelle der JSON-Aufbereitung: github.com/IAL32/sbf-see-binnen-fragenkataloge
(src/data/questions.json, Stand: Kataloge gueltig seit 01.08.2023).
Nur die amtlichen deutschen Texte und Abbildungen werden uebernommen.
Im amtlichen Katalog ist die erste Antwort (a) immer die richtige.

Aufruf: python3 tools/build_questions.py <pfad/zu/questions.json> <pfad/zu/public>
"""
import json, os, shutil, sys

src, pub = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(src, encoding="utf-8"))
out = []
for x in data:
    if x["sec"] == "N":  # Navigationsaufgaben sind keine Multiple-Choice-Fragen
        continue
    imgs = []
    for p in x["imgs"]:
        name = os.path.basename(p)
        shutil.copy(os.path.join(pub, p), os.path.join(root, "assets", "q", name))
        imgs.append("assets/q/" + name)
    q = {"id": x["id"], "s": x["sec"], "n": x["n"], "q": " ".join(x["q"].split()),
         "a": [" ".join(a.split()) for a in x["a"]]}
    if imgs:
        q["img"] = imgs
    out.append(q)
with open(os.path.join(root, "js", "questions.js"), "w", encoding="utf-8") as f:
    f.write("/* Amtliche Fragenkataloge SBF Binnen & See (ELWIS, gueltig seit 01.08.2023).\n"
            "   s: B=Basisfragen, I=Spezifisch Binnen, S=Spezifisch See, G=Segeln Binnen.\n"
            "   a[0] ist jeweils die richtige Antwort (wird im Spiel gemischt). */\n")
    f.write("window.QUESTIONS=")
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print(len(out), "Fragen geschrieben")
