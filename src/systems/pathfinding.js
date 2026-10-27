// Déplacements sur grille, 4 directions (distance de Manhattan, comme sur une carte tactique).
export const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const cle = (x, y) => `${x},${y}`;

// estBloque(x, y) -> true si la case est infranchissable (hors carte compris).
export function chemin(depart, arrivee, estBloque, limite = 4000) {
  if (depart.x === arrivee.x && depart.y === arrivee.y) return [];
  if (estBloque(arrivee.x, arrivee.y)) return null;
  const h = (x, y) => Math.abs(x - arrivee.x) + Math.abs(y - arrivee.y);
  const ouverts = [{ x: depart.x, y: depart.y, g: 0, f: h(depart.x, depart.y) }];
  const precedent = new Map();
  const coutG = new Map([[cle(depart.x, depart.y), 0]]);
  let iterations = 0;
  while (ouverts.length && iterations++ < limite) {
    let iMin = 0;
    for (let i = 1; i < ouverts.length; i++) if (ouverts[i].f < ouverts[iMin].f) iMin = i;
    const courant = ouverts.splice(iMin, 1)[0];
    if (courant.x === arrivee.x && courant.y === arrivee.y) {
      const resultat = [];
      let k = cle(courant.x, courant.y);
      while (k !== cle(depart.x, depart.y)) {
        const [x, y] = k.split(',').map(Number);
        resultat.unshift({ x, y });
        k = precedent.get(k);
      }
      return resultat;
    }
    for (const [dx, dy] of DIRECTIONS) {
      const nx = courant.x + dx;
      const ny = courant.y + dy;
      if (estBloque(nx, ny)) continue;
      const k = cle(nx, ny);
      const g = courant.g + 1;
      if (g < (coutG.get(k) ?? Infinity)) {
        coutG.set(k, g);
        precedent.set(k, cle(courant.x, courant.y));
        ouverts.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}

// Cases atteignables en au plus `pm` pas. Retourne Map(cle -> {x, y, cout, prec}).
export function accessibles(depart, pm, estBloque) {
  const resultat = new Map([[cle(depart.x, depart.y), { x: depart.x, y: depart.y, cout: 0, prec: null }]]);
  let frontiere = [depart];
  for (let pas = 1; pas <= pm; pas++) {
    const suivante = [];
    for (const c of frontiere) {
      for (const [dx, dy] of DIRECTIONS) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        const k = cle(nx, ny);
        if (resultat.has(k) || estBloque(nx, ny)) continue;
        resultat.set(k, { x: nx, y: ny, cout: pas, prec: cle(c.x, c.y) });
        suivante.push({ x: nx, y: ny });
      }
    }
    frontiere = suivante;
  }
  return resultat;
}

export function cheminDepuis(carte, x, y) {
  const resultat = [];
  let k = cle(x, y);
  while (carte.get(k)?.prec) {
    const n = carte.get(k);
    resultat.unshift({ x: n.x, y: n.y });
    k = n.prec;
  }
  return resultat;
}
