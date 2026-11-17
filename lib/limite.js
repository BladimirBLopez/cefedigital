import { headers } from "next/headers";
import { sql } from "@/lib/db";

export async function ipCliente() {
  const h = await headers();
  const xff = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  return xff || h.get("x-real-ip") || "desconocida";
}

export async function contar(tipo, clave, minutos) {
  try {
    const [r] = await sql`
      select count(*)::int as n from intentos
      where tipo = ${tipo} and clave = ${clave}
        and creado_en > now() - (${minutos}::int * interval '1 minute')`;
    return r.n;
  } catch {
    return 0;
  }
}

export async function anotar(tipo, clave) {
  try {
    await sql`insert into intentos (tipo, clave) values (${tipo}, ${clave})`;
    await sql`delete from intentos where creado_en < now() - interval '2 days'`;
  } catch {}
}
