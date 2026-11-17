import crypto from "node:crypto";

const PREFIJO = "enc:v1:";

function llave() {
  const b = Buffer.from(process.env.CLAVES_SECRET || "", "base64");
  if (b.length !== 32) throw new Error("CLAVES_SECRET invalida");
  return b;
}

export function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", llave(), iv);
  const enc = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
  return PREFIJO + Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function descifrar(valor) {
  if (!valor || !String(valor).startsWith(PREFIJO)) return valor;
  const raw = Buffer.from(String(valor).slice(PREFIJO.length), "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", llave(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
