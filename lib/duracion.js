export const diasDe = (p) => Number(p.duracion_dias ?? Number(p.meses_pagados) * 30);

export function textoDuracion(d) {
  const n = Number(d);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n % 365 === 0) {
    const a = n / 365;
    return `${a} ${a === 1 ? "año" : "años"}`;
  }
  if (n % 30 === 0) {
    const m = n / 30;
    return `${m} ${m === 1 ? "mes" : "meses"}`;
  }
  return `${n} ${n === 1 ? "día" : "días"}`;
}

export const DURACIONES = [3, 7, 14, 30, 45, 60, 90, 180, 365];

export function etiquetaAdmin(d) {
  const n = Number(d);
  const t = textoDuracion(n);
  return t && !t.startsWith(`${n} `) ? `${n} días (${t})` : `${n} días`;
}
