import { sql } from "@/lib/db";

let listo = null;

export function asegurarRegistro() {
  if (!listo) {
    listo = sql`
      create table if not exists registro_admin (
        id bigserial primary key,
        creado timestamptz not null default now(),
        accion text not null,
        entidad text,
        entidad_id int,
        detalle text
      )`.catch((e) => {
      listo = null;
      throw e;
    });
  }
  return listo;
}

export async function anotar(accion, entidad, entidadId, detalle) {
  try {
    await asegurarRegistro();
    await sql`
      insert into registro_admin (accion, entidad, entidad_id, detalle)
      values (${accion}, ${entidad}, ${entidadId ?? null}, ${detalle ?? null})`;
  } catch (e) {
    console.error("registro fallo", e);
  }
}
