import { sql } from "@/lib/db";

let listo = null;

export function asegurarEsquema() {
  if (!listo) {
    listo = (async () => {
      await sql`alter table productos add column if not exists vence date`;

      await sql`
        insert into categorias (nombre, orden)
        select 'Games',
          coalesce((select max(orden) + 1 from categorias), 1)
        where not exists (
          select 1 from categorias
          where lower(nombre) = lower('Games')
        )
      `;

      await sql`alter table planes add column if not exists compartida boolean`;
      await sql`alter table planes add column if not exists perfiles integer`;
      await sql`alter table planes add column if not exists dispositivos text`;
      await sql`alter table planes add column if not exists calidad text`;

      await sql`alter table pedido_items add column if not exists plan_compartida boolean`;
      await sql`alter table pedido_items add column if not exists plan_pantallas integer`;
      await sql`alter table pedido_items add column if not exists plan_perfiles integer`;
      await sql`alter table pedido_items add column if not exists plan_dispositivos text`;
      await sql`alter table pedido_items add column if not exists plan_calidad text`;

      await sql`
        alter table pedido_items
        add column if not exists duracion_dias integer
      `;

      // No modificar duraciones de pedidos históricos.
      // No sobrescribir duraciones personalizadas de planes.
      // Los nuevos planes se crean sin meses gratuitos.
    })().catch((e) => {
      listo = null;
      throw e;
    });
  }

  return listo;
}
