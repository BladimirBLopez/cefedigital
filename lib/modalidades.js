export const MODALIDADES = [
  ["", "Ninguna (en blanco)"],
  ["compartida", "Perfil compartido"],
  ["completa", "Cuenta completa"],
  ["tu_correo", "Cuenta privada en tu correo"],
  ["mi_correo", "Cuenta privada en mi correo"],
  ["bajo_pedido", "Bajo pedido"],
];

const VALIDAS = MODALIDADES.map(([v]) => v);

export function normalizarModalidad(v) {
  const s = String(v ?? "").trim();
  return VALIDAS.includes(s) ? s : "";
}

export function textoModalidad(v) {
  const f = MODALIDADES.find(([k]) => k === (v || ""));
  return f && f[0] ? f[1] : "";
}

export function compartidaDe(v) {
  return v === "compartida" ? true : v === "completa" ? false : null;
}

export function modalidadVieja(c) {
  return c === true ? "compartida" : c === false ? "completa" : "";
}

export function modalidadDeForm(fd) {
  const m = fd.get("modalidad");
  if (m !== null) return normalizarModalidad(m);
  const c = String(fd.get("compartida") ?? "");
  if (c === "true") return "compartida";
  if (c === "null") return "";
  return "completa";
}
