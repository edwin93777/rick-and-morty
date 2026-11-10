/**
 * Brazo de espiral de Arquímedes como atributo `d` de un <path>.
 * Lo comparten el portal de fondo y el logo.
 */
export function spiralArm(
  index,
  arms,
  { turns, radius, twist = 0, inner = 2, cx = 0, cy = 0, steps = 56 }
) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = (index / arms) * Math.PI * 2 + twist + t * turns * Math.PI * 2;
    const r = inner + t * (radius - inner);
    const x = (cx + Math.cos(angle) * r).toFixed(2);
    const y = (cy + Math.sin(angle) * r).toFixed(2);
    d += `${i ? 'L' : 'M'}${x} ${y}`;
  }
  return d;
}
