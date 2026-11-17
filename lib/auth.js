import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const NOMBRE = "cefe_admin";
const DURACION = 60 * 60 * 24 * 7;

function firmar(valor) {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "").update(valor).digest("hex");
}

function iguales(a, b) {
  try {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export function claveCorrecta(clave) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || real === "CAMBIA_ESTA_CLAVE") return false;
  return iguales(clave || "", real);
}

export async function crearSesion() {
  const exp = String(Date.now() + DURACION * 1000);
  const c = await cookies();
  c.set(NOMBRE, `${exp}.${firmar(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION,
  });
}

export async function cerrarSesion() {
  const c = await cookies();
  c.delete(NOMBRE);
}

export async function haySesion() {
  if (!process.env.AUTH_SECRET) return false;
  const c = await cookies();
  const v = c.get(NOMBRE)?.value;
  if (!v) return false;
  const [exp, firma] = v.split(".");
  if (!exp || !firma) return false;
  if (!iguales(firma, firmar(exp))) return false;
  return Number(exp) > Date.now();
}

export async function requireAdmin() {
  if (!(await haySesion())) redirect("/admin/login");
}
