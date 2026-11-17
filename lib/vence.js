export function hoyBolivia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
}

export function diasPara(vence) {
  if (!vence) return null;
  const [a, m, d] = String(vence).slice(0, 10).split("-").map(Number);
  const [ha, hm, hd] = hoyBolivia().split("-").map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000);
}

export function formatoFecha(vence) {
  const [a, m, d] = String(vence).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function estadoVence(vence) {
  const n = diasPara(vence);
  if (n === null) return { clave: "sin", texto: "Sin vencimiento", clase: "bg-neutral-100 text-neutral-500" };
  if (n < 0) return { clave: "vencido", texto: `Vencido hace ${-n} d`, clase: "bg-red-100 text-red-700" };
  if (n === 0) return { clave: "pronto", texto: "Vence hoy", clase: "bg-amber-100 text-amber-700" };
  if (n <= 30) return { clave: "pronto", texto: `Vence en ${n} d`, clase: "bg-amber-100 text-amber-700" };
  return { clave: "ok", texto: `Vence ${formatoFecha(vence)}`, clase: "bg-emerald-100 text-emerald-700" };
}
