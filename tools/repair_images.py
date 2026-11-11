"""Stellt alle Fragen-Abbildungen auf die originalen ELWIS-Grafiken um.

Hintergrund: Die Abbildungen der ersten Quelle (IAL32/sbf-see-binnen-fragenkataloge) sind
Ausschnitte aus den PDF-Katalogen. Ein Drittel davon ist beschädigt (im Browser leer/weiß),
manche zeigen nur eine Textzeile ohne das Zeichen, andere enthalten unlesbar kleinen PDF-Text.

Ersatzquellen (Original-GIFs von elwis.de):
  1. github.com/koljabohne/fragenkatalog_sportbootfuehrerschein  (data/<bereich>/, ELWIS-Dateinamen)
     Zuordnung über Bereich + Fragenummer, Fragetext wird gegengeprüft.
  2. github.com/deveth0/FuehrerscheinApp  (Zweitbilder einzelner Fragen, Segelfrage 295)
Nur wenn keine Quelle passt, bleibt das bisherige Bild (sofern intakt).

Aufruf: python3 tools/repair_images.py <koljabohne-repo> <deveth0-repo>
"""
import json, os, re, shutil, sys
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
kol, dev = sys.argv[1], sys.argv[2]
QJS = os.path.join(root, "js", "questions.js")
header, data = open(QJS, encoding="utf-8").read().split("window.QUESTIONS=")
qs = json.loads(data.strip().rstrip(";"))


def intact(path):
    try:
        im = Image.open(path)
        for f in range(getattr(im, "n_frames", 1)):
            im.seek(f)
            im.convert("RGBA").load()
        return True
    except Exception:
        return False


norm = lambda s: re.sub(r"\W", "", s.lower())[:40]
K = {}
for d, sec in [("data-basis", "B"), ("data-binnen", "I"), ("data-see", "S")]:
    for x in json.load(open(os.path.join(kol, "data", d, "data.json"), encoding="utf-8")):
        m = re.match(r"\s*(\d+)\.\s*(.*)", x["Question"], re.S)
        if x["Image"]:
            K[(sec, int(m.group(1)))] = (norm(m.group(2)), os.path.join(kol, "data", x["Image"]))
DEV = os.path.join(dev, "app", "src", "sbf_binnen", "res", "drawable-xxhdpi")
DEV_PREFIX = {"B": "basis", "I": "binnen", "G": "segeln"}

# Bei diesen Fragen zeigt die Grafik nur das Signal einer Antwortoption (verrät die Lösung
# bzw. passt nicht zur Frage); die Antworten beschreiben die Signale bereits in Worten.
NO_IMAGE = {"S120", "S121", "S124"}
# Hier ist die Grafik nur das Symbol im Fragetext „( )“ – wird als Textzeichen eingesetzt.
INLINE_SYMBOL = {"B4": "●", "B5": "▬", "S116": "▬", "S117": "▬ ▬"}

log, kept = [], []
for q in qs:
    if q["id"] in NO_IMAGE:
        q.pop("img", None)
    if q["id"] in INLINE_SYMBOL:
        q.pop("img", None)
        q["q"] = re.sub(r"\(\s*\S?\s*\)", "(" + INLINE_SYMBOL[q["id"]] + ")", q["q"], count=1)
    imgs = q.get("img")
    if not imgs:
        continue
    new = []
    for i in range(len(imgs)):
        src = None
        k = K.get((q["s"], q["n"]))
        if i == 0 and k and k[0] == norm(q["q"]) and intact(k[1]):
            src = k[1]
        if not src and q["s"] in DEV_PREFIX:
            cand = os.path.join(DEV, f"{DEV_PREFIX[q['s']]}_{q['n']}{'_2' if i else ''}.png")
            if os.path.exists(cand) and intact(cand):
                src = cand
        if not src:
            if intact(os.path.join(root, imgs[i])):
                new.append(imgs[i]); kept.append((q["id"], imgs[i]))
            else:
                log.append((q["id"], "FEHLT", imgs[i]))
            continue
        ext = os.path.splitext(src.split("?")[0])[1].lower()
        ext = ".gif" if ext in (".gif", ".jpg") and src.endswith(".gif") else ext
        name = f"assets/q/{q['id']}_{i + 1}{ext}"
        if os.path.abspath(src) != os.path.join(root, name):
            shutil.copy(src, os.path.join(root, name))
        new.append(name)
        log.append((q["id"], name, os.path.basename(src)))
    q["img"] = new

used = {p for q in qs for p in q.get("img", [])}
for f in os.listdir(os.path.join(root, "assets", "q")):
    if "assets/q/" + f not in used:
        os.remove(os.path.join(root, "assets", "q", f))

with open(QJS, "w", encoding="utf-8") as f:
    f.write(header + "window.QUESTIONS=")
    json.dump(qs, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print(len(log), "Original-Grafiken zugeordnet,", len(kept), "unverändert:", kept)
for l in log:
    if l[1] == "FEHLT":
        print("  FEHLT", l)
