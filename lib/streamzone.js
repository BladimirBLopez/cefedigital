const API = "https://streamzone.app/api/v1";

async function consultar(endpoint) {
  const apiKey = process.env.STREAMZONE_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      error: "No se encontro STREAMZONE_API_KEY en el entorno."
    };
  }

  try {
    const respuesta = await fetch(`${API}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });

    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok || datos?.ok === false) {
      const detalle = [
        datos?.message,
        typeof datos?.error === "string" ? datos.error : datos?.error?.message,
        datos?.detail,
        datos?.code
      ].filter((v) => typeof v === "string" && v.trim()).join(" · ").slice(0, 180);

      let error = `Error HTTP ${respuesta.status}`;
      if (respuesta.status === 401) error = "HTTP 401: StreamZone rechazo la autenticacion.";
      if (respuesta.status === 429) error = "HTTP 429: limite de solicitudes alcanzado.";
      if (detalle) error += ` (${detalle})`;

      return { ok: false, status: respuesta.status, error };
    }

    return { ok: true, status: respuesta.status, payload: datos };
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con StreamZone."
    };
  }
}

export function obtenerPerfilStreamZone() {
  return consultar("/profile");
}

export function obtenerCatalogoStreamZone() {
  return consultar("/catalog");
}
