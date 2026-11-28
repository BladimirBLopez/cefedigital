export const GRUPOS = [
  "Streaming y TV",
  "Música y audio",
  "Inteligencia Artificial",
  "Licencias y productividad",
  "VPN y seguridad",
  "Diseño, foto y video",
  "Educación y libros",
  "Bienestar y fitness",
  "Otros",
];

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function grupoDe(categoria) {
  const x = norm(categoria);
  if (!x || x === "games") return null;
  if (x.includes("stream") || x.includes("iptv")) return "Streaming y TV";
  if (x.includes("music") || (x.includes("audio") && !x.includes("libro"))) return "Música y audio";
  if (x.includes("inteligencia")) return "Inteligencia Artificial";
  if (x.includes("foto") || x.includes("dise")) return "Diseño, foto y video";
  if (x.includes("libro") || x.includes("educ") || x.includes("idioma")) return "Educación y libros";
  if (x.includes("vpn") || x.includes("antivirus") || x.includes("segur")) return "VPN y seguridad";
  if (x.includes("licencia") || x.includes("product") || x.includes("negocio") || x.includes("software")) return "Licencias y productividad";
  if (x.includes("bienestar") || x.includes("fitness") || x.includes("salud")) return "Bienestar y fitness";
  return "Otros";
}

export function gruposConProductos(categorias) {
  const hay = new Set(categorias.map(grupoDe).filter(Boolean));
  return GRUPOS.filter((g) => hay.has(g)).map((g) => ({ categoria: g }));
}

export function nombresDeGrupo(grupo, categorias) {
  if (!GRUPOS.includes(grupo)) return [grupo];
  return categorias.filter((c) => grupoDe(c) === grupo);
}
