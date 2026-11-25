export const CALIDADES = [
  "SD",
  "HD",
  "Full HD",
  "4K",
  "Según plataforma"
];

export function normalizarCalidad(v) {
  const s = String(v ?? "").trim();
  return CALIDADES.includes(s) ? s : "";
}

export function normalizarDispositivos(v) {
  return String(v ?? "")
    .split(/[,;\n]/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(", ")
    .slice(0, 300);
}

export function textoCaracteristicas(plan, incluirPantallas = true) {
  const partes = [];

  const pantallas = Number(plan.pantallas);
  const perfiles = Number(plan.perfiles);

  if (incluirPantallas && pantallas > 0) {
    partes.push(
      `${pantallas} ${pantallas === 1 ? "pantalla simultánea" : "pantallas simultáneas"}`
    );
  }

  if (perfiles > 0) {
    partes.push(
      `${perfiles} ${perfiles === 1 ? "perfil incluido" : "perfiles incluidos"}`
    );
  }

  if (plan.calidad) partes.push(`Calidad ${plan.calidad}`);

  if (plan.dispositivos) {
    partes.push(`Dispositivos compatibles: ${plan.dispositivos}`);
  }

  return partes.join(" · ");
}
