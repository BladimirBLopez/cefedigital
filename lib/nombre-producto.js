export function limpiarNombre(nombre) {
  const original = String(nombre || "");
  const limpio = original
    .replace(/\s*\{[^}]*\}/g, "")
    .replace(/\s*\((?:NW|FW)\)/gi, "")
    .replace(/\s*\|?\s*\b(?:NW|FW)\b/g, "")
    .replace(/\s*\|\s*Promo Link\b/gi, "")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s·|–—-]+$/, "")
    .trim();
  return limpio || original.trim();
}
