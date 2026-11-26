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

function extraerCampo(xml, nombre) {
  const etiqueta = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patron = new RegExp(
    `<(?:[\\w.-]+:)?${etiqueta}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${etiqueta}\\s*>`,
    "i"
  );

  const valor = xml.match(patron)?.[1];

  return valor
    ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim() || null;
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
    signal: AbortSignal.timeout(8000)
  });

  if (!respuesta.ok) {
    throw new Error(`BCB HTTP ${respuesta.status}`);
  }

  const xml = await respuesta.text();

  const codigoError = extraerCampo(xml, "codError");
  const codigoMoneda = extraerCampo(xml, "codMoneda");
  const descripcion = extraerCampo(xml, "desIndicador");
  const valor = extraerCampo(xml, "valor");
  const fechaRespuesta = extraerCampo(xml, "fecha");

  const tasa = Number(String(valor || "").replace(",", "."));

  if (
    Number(codigoError) !== 0 ||
    Number(codigoMoneda) !== 9 ||
    descripcion?.toLowerCase() !== "tipos de cambio" ||
    !Number.isFinite(tasa) ||
    tasa <= 0
  ) {
    throw new Error("El BCB no devolvió una cotización COP válida.");
  }

  return {
    tasa,
    fecha: fechaRespuesta || fecha,
    fuente: "Banco Central de Bolivia (cotización referencial)"
  };
}
