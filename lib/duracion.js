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
