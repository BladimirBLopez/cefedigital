const API = "https://streamzone.app/api/v1";

async function consultar(endpoint) {
  const apiKeyOriginal = process.env.STREAMZONE_API_KEY || "";
  const apiKey = apiKeyOriginal.trim();

  const diagnostico = [
    `variable=${apiKeyOriginal ? "presente" : "ausente"}`,
    `prefijo_sz_live=${apiKey.startsWith("sz_live_") ? "si" : "no"}`,
    `longitud=${apiKey.length}`,
    `bearer_incluido=${/^Bearer\s/i.test(apiKey) ? "si" : "no"}`,
    `comillas_iniciales=${/^["']/.test(apiKey) ? "si" : "no"}`
  ].join("; ");

  if (!apiKey) {
    return { ok: false, error: "No se encontro STREAMZONE_API_KEY." };
  }

  if (!apiKey.startsWith("sz_live_")) {
    return {
      ok: false,
      error: `Clave API con formato incorrecto. ${diagnostico}`
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
        typeof datos?.error === "string"
          ? datos.error
          : datos?.error?.message,
        datos?.detail,
        datos?.code
      ].filter(v => typeof v === "string" && v.trim())
        .join(" · ").slice(0, 180);

      let error = `Error HTTP ${respuesta.status}`;

      if (respuesta.status === 401)
        error = "HTTP 401: autenticación rechazada.";

      if (respuesta.status === 402)
        error = "HTTP 402: saldo insuficiente.";

      if (respuesta.status === 429)
        error = "HTTP 429: límite de solicitudes alcanzado.";

      if (detalle) error += ` (${detalle})`;

      return {
        ok: false,
        status: respuesta.status,
        error: `${error} | ${diagnostico}`
      };
    }

    return { ok: true, status: respuesta.status, payload: datos };
  } catch {
    return { ok: false, error: "No se pudo conectar con StreamZone." };
  }
}

export function obtenerPerfilStreamZone() {
  return consultar("/profile");
}

export function obtenerCatalogoStreamZone() {
  return consultar("/catalog");
}

export async function comprarProductoStreamZone({
  productId,
  quantity,
  idempotencyKey
}) {
  const apiKey = (process.env.STREAMZONE_API_KEY || "").trim();

  if (!apiKey.startsWith("sz_live_")) {
    throw new Error("STREAMZONE_API_KEY no está configurada correctamente.");
  }

  if (
    !productId ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1 ||
    Number(quantity) > 10 ||
    !idempotencyKey
  ) {
    throw new Error("Datos inválidos para comprar en StreamZone.");
  }

  const respuesta = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      productId,
      quantity: Number(quantity),
      idempotencyKey
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25000)
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok || datos?.ok === false) {
    let mensaje = `Error HTTP ${respuesta.status}`;

    if (respuesta.status === 401)
      mensaje = "StreamZone rechazó la clave API.";

    if (respuesta.status === 402)
      mensaje = "Saldo insuficiente en la billetera StreamZone.";

    if (respuesta.status === 409)
      mensaje = "Producto agotado temporalmente en StreamZone.";

    if (respuesta.status === 429)
      mensaje = "Límite de solicitudes de StreamZone alcanzado.";

    const detalle = [
      datos?.message,
      typeof datos?.error === "string"
        ? datos.error
        : datos?.error?.message,
      datos?.detail
    ].filter(v => typeof v === "string" && v.trim())
      .join(" · ").slice(0, 150);

    const error = new Error(
      detalle ? `${mensaje} (${detalle})` : mensaje
    );

    error.code = String(respuesta.status);
    throw error;
  }

  return datos;
}
