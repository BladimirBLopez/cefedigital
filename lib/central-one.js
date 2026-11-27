const API = "https://portal.centraloneglobal.com/api/v1";

function obtenerClave() {
  const key = String(process.env.CO_API_KEY || "").trim();

  if (!key.startsWith("co_live_")) {
    throw new Error("CO_API_KEY no está configurada correctamente.");
  }

  return key;
}

export async function consultarCentralOne(endpoint, opciones = {}) {
  const {
    method = "GET",
    body,
    idempotencyKey,
    timeout = 15000
  } = opciones;

  const headers = {
    Authorization: `Bearer ${obtenerClave()}`,
    Accept: "application/json"
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const respuesta = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeout)
  });

  const texto = await respuesta.text();
  let datos = null;

  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {}

  if (!respuesta.ok) {
    const codigo = datos?.error?.code || `http_${respuesta.status}`;
    const mensaje = datos?.error?.message || `Central One HTTP ${respuesta.status}`;

    const error = new Error(`${mensaje} (${codigo})`);
    error.code = codigo;
    error.status = respuesta.status;
    error.requestId =
      respuesta.headers.get("X-Request-Id") ||
      datos?.error?.request_id ||
      null;

    throw error;
  }

  return datos;
}

export function obtenerCatalogoCentralOne() {
  return consultarCentralOne("/catalog?lang=es", {
    timeout: 30000
  });
}

export function obtenerBalanceCentralOne() {
  return consultarCentralOne("/balance");
}
