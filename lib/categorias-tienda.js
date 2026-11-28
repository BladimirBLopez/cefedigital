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

const POR_NOMBRE = [
  [/chatgpt|claude|gemini|elevenlabs|muse ai|perplexity/, "Inteligencia Artificial"],
  [/eleven ?reader/, "Educación y libros"],
  [/adobe|alight|capcut|autodesk|canva|meitu/, "Diseño, foto y video"],
  [/apple music|spotify/, "Música y audio"],
  [/vpn|ipvanish/, "VPN y seguridad"],
  [/coursera|duolingo|studocu/, "Educación y libros"],
  [/windows|notion|zoom|ilovepdf|jetbrain|hotmail|outlook|camscanner/, "Licencias y productividad"],
];

export function grupoDe(categoria, nombre = "") {
  const x = norm(categoria);
  if (!x || x === "games") return null;
  const n = norm(nombre);
  if (n) {
    for (const [re, g] of POR_NOMBRE) if (re.test(n)) return g;
  }
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

export function gruposConProductos(items) {
  const hay = new Set(items.map((i) => grupoDe(i.categoria, i.nombre)).filter(Boolean));
  return GRUPOS.filter((g) => hay.has(g)).map((g) => ({ categoria: g }));
}
