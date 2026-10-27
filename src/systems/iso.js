// Projection isométrique 2:1. Le centre de la case (x, y) est en versEcran(x, y).
export const TW = 64;
export const TH = 32;

export const versEcran = (x, y) => ({ x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 });

export function versGrille(sx, sy) {
  const gx = (sx / (TW / 2) + sy / (TH / 2)) / 2;
  const gy = (sy / (TH / 2) - sx / (TW / 2)) / 2;
  return { x: Math.round(gx), y: Math.round(gy) };
}

// Profondeur d'affichage : plus une case est « basse » à l'écran, plus elle passe devant.
export const profondeur = (x, y, couche = 0) => (x + y) * 10 + couche;

export function losange(g, cx, cy, couleur, alpha = 1, contour = null) {
  const pts = [cx, cy - TH / 2, cx + TW / 2, cy, cx, cy + TH / 2, cx - TW / 2, cy];
  g.fillStyle(couleur, alpha);
  g.fillPoints(pointsDe(pts), true);
  if (contour) {
    g.lineStyle(1, contour.couleur, contour.alpha ?? 1);
    g.strokePoints(pointsDe(pts), true);
  }
}

// Bloc surélevé (immeuble, arbre, voiture…) : dessus + deux faces.
export function bloc(g, cx, cy, couleur, hauteur, retrait = 0) {
  const w = TW / 2 - retrait;
  const h = TH / 2 - retrait / 2;
  const sombre = assombrir(couleur, 0.62);
  const moyen = assombrir(couleur, 0.8);
  g.fillStyle(sombre, 1);
  g.fillPoints(pointsDe([cx - w, cy, cx, cy + h, cx, cy + h - hauteur, cx - w, cy - hauteur]), true);
  g.fillStyle(moyen, 1);
  g.fillPoints(pointsDe([cx + w, cy, cx, cy + h, cx, cy + h - hauteur, cx + w, cy - hauteur]), true);
  g.fillStyle(couleur, 1);
  g.fillPoints(pointsDe([cx, cy - h - hauteur, cx + w, cy - hauteur, cx, cy + h - hauteur, cx - w, cy - hauteur]), true);
}

export function assombrir(couleur, f) {
  const r = Math.round(((couleur >> 16) & 255) * f);
  const v = Math.round(((couleur >> 8) & 255) * f);
  const b = Math.round((couleur & 255) * f);
  return (r << 16) | (v << 8) | b;
}

function pointsDe(tab) {
  const res = [];
  for (let i = 0; i < tab.length; i += 2) res.push({ x: tab[i], y: tab[i + 1] });
  return res;
}
