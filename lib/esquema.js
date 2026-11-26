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
      await sql`alter table pedido_items add column if not exists duracion_dias integer`;

      await sql`alter table productos add column if not exists proveedor text`;
      await sql`alter table productos add column if not exists proveedor_producto_id text`;
      await sql`alter table productos add column if not exists proveedor_codigo text`;

      await sql`alter table productos add column if not exists costo_proveedor_cop numeric(14,2)`;
      await sql`alter table productos add column if not exists costo_proveedor_bs numeric(14,4)`;
      await sql`alter table productos add column if not exists tipo_cambio_cop_bs numeric(14,8)`;

      await sql`alter table productos add column if not exists margen_porcentaje numeric(7,2)`;
      await sql`alter table productos add column if not exists precio_sugerido numeric(14,2)`;
      await sql`alter table productos add column if not exists precio_manual boolean not null default false`;

      await sql`alter table productos add column if not exists proveedor_disponible boolean not null default true`;
      await sql`alter table productos add column if not exists stock_proveedor integer`;
      await sql`alter table productos add column if not exists sincronizado_proveedor_en timestamptz`;

      await sql`
        create unique index if not exists productos_proveedor_externo_uidx
        on productos (proveedor, proveedor_producto_id)
        where proveedor is not null
          and proveedor_producto_id is not null
      `;

      await sql`
        create table if not exists proveedor_sync_estado (
          proveedor text primary key,
          tipo_cambio numeric(14,8),
          fecha_cambio text,
          fuente_tasa text,
          sincronizado_en timestamptz,
          total_productos integer not null default 0,
          nuevos integer not null default 0,
          actualizados integer not null default 0,
          error text
        )
      `;

    })().catch((e) => {
      listo = null;
      throw e;
    });
  }

  return listo;
}
