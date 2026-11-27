const URL_BCB = "https://indicadores.bcb.gob.bo/ServiciosBCB/indicadores";

function fechaBolivia() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

function extraerDato(xml, codigo) {
  const bloques = xml.match(
    /<return\b[^>]*>[\s\S]*?<\/return>/gi
  ) || [];

  for (const bloque of bloques) {
    const codigoEncontrado = bloque.match(
      /<codDato>\s*([\s\S]*?)\s*<\/codDato>/i
    )?.[1]?.trim();

    if (codigoEncontrado?.toLowerCase() === codigo.toLowerCase()) {
      return bloque.match(
        /<dato>\s*([\s\S]*?)\s*<\/dato>/i
      )?.[1]?.trim() || null;
    }
  }

  return null;
}

export async function obtenerCambioCopBs() {
  const fecha = fechaBolivia();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.bcb.gob.bo">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:obtenerIndicador>
      <codIndicador>1</codIndicador>
      <codMoneda>9</codMoneda>
      <fecha>${fecha}</fecha>
    </tns:obtenerIndicador>
  </soapenv:Body>
</soapenv:Envelope>`;

  const respuesta = await fetch(URL_BCB, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '""'
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  if (!respuesta.ok) {
    throw new Error(`BCB HTTP ${respuesta.status}`);
  }

  const xml = await respuesta.text();

  const codigoError = extraerDato(xml, "CodError");
  const codigoMoneda = extraerDato(xml, "CodMoneda");
  const descripcion = extraerDato(xml, "DesIndicador");
  const valor = extraerDato(xml, "Valor");
  const fechaRespuesta = extraerDato(xml, "Fecha");

  const tasa = Number(String(valor || "").replace(",", "."));

  if (codigoError !== "0") {
    throw new Error(`BCB CodError inesperado: ${codigoError || "ausente"}`);
  }

  if (codigoMoneda !== "9") {
    throw new Error(`BCB devolvió moneda inesperada: ${codigoMoneda || "ausente"}`);
  }

  if (descripcion !== "Tipos de Cambio") {
    throw new Error(`Indicador BCB inesperado: ${descripcion || "ausente"}`);
  }

  if (!Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("El BCB devolvió una cotización COP inválida.");
  }

  return {
    tasa,
    fecha: fechaRespuesta || fecha,
    fuente: "Banco Central de Bolivia"
  };
}

export async function obtenerCambioUsdBs() {
  const fecha = fechaBolivia();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.bcb.gob.bo">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:obtenerIndicador>
      <codIndicador>1</codIndicador>
      <codMoneda>35</codMoneda>
      <fecha>${fecha}</fecha>
    </tns:obtenerIndicador>
  </soapenv:Body>
</soapenv:Envelope>`;

  const respuesta = await fetch(URL_BCB, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '""'
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  if (!respuesta.ok) {
    throw new Error(`BCB USD HTTP ${respuesta.status}`);
  }

  const xml = await respuesta.text();

  const error = extraerDato(xml, "CodError");
  const moneda = extraerDato(xml, "CodMoneda");
  const descripcion = extraerDato(xml, "DesIndicador");
  const valor = extraerDato(xml, "Valor");
  const fechaRespuesta = extraerDato(xml, "Fecha");

  const tasa = Number(String(valor || "").replace(",", "."));

  if (error !== "0" || moneda !== "35" ||
      descripcion !== "Tipos de Cambio" ||
      !Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("Cotización USD del BCB inválida.");
  }

  return {
    tasa,
    fecha: fechaRespuesta || fecha,
    fuente: "Banco Central de Bolivia - USD venta"
  };
}
