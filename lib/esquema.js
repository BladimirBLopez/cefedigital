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
      await sql`alter table productos add column if not exists tipo_manual boolean not null default false`;
      
      await sql`alter table productos add column if not exists costo_proveedor_usd numeric(14,4)`;
      await sql`alter table productos add column if not exists costo_proveedor_bs_central_one numeric(14,4)`;
      await sql`alter table productos add column if not exists tipo_cambio_usd_bs numeric(14,8)`;

      await sql`alter table productos add column if not exists central_one_product_type text`;
      await sql`alter table productos add column if not exists central_one_category text`;
      await sql`alter table productos add column if not exists central_one_market text`;
      await sql`alter table productos add column if not exists central_one_region text`;
      await sql`alter table productos add column if not exists central_one_family_id text`;
      await sql`alter table productos add column if not exists central_one_family_name text`;
      await sql`alter table productos add column if not exists central_one_currency text`;

      await sql`alter table productos add column if not exists central_one_requires_target boolean not null default false`;
      await sql`alter table productos add column if not exists central_one_target_fields jsonb not null default '[]'::jsonb`;
      await sql`alter table productos add column if not exists central_one_target_schema jsonb not null default '[]'::jsonb`;
      await sql`alter table productos add column if not exists central_one_available_stock integer`;
      await sql`alter table productos add column if not exists central_one_price_updated_at timestamptz`;


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

      await sql`
        create table if not exists streamzone_compras (
          id bigserial primary key,
          pedido_item_id bigint not null unique
            references pedido_items(id) on delete cascade,
          pedido_id bigint not null
            references pedidos(id) on delete cascade,
          proveedor_producto_id text,
          cantidad integer not null,
          idempotency_key text not null unique,
          estado text not null default 'pendiente',
          streamzone_order_id text,
          credenciales_cifradas text,
          cobrado_cop numeric(14,2),
          error_code text,
          error_mensaje text,
          intentos integer not null default 0,
          procesando_en timestamptz,
          creado_en timestamptz not null default now(),
          actualizado_en timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists streamzone_compras_pedido_idx
        on streamzone_compras (pedido_id)
      `;

      await sql`alter table pedido_items add column if not exists target_payload jsonb`;

      await sql`
        create table if not exists central_one_compras (
          id bigserial primary key,
          pedido_item_id bigint not null unique
            references pedido_items(id) on delete cascade,
          pedido_id bigint not null
            references pedidos(id) on delete cascade,
          proveedor_producto_id text,
          cantidad integer not null,
          idempotency_key text not null unique,
          estado text not null default 'pendiente',
          central_one_order_id text,
          estado_proveedor text,
          lineas jsonb,
          codigos_cifrados text,
          costo_unitario_usd numeric(14,4),
          costo_total_usd numeric(14,4),
          error_code text,
          error_mensaje text,
          intentos integer not null default 0,
          procesando_en timestamptz,
          creado_en timestamptz not null default now(),
          actualizado_en timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists central_one_compras_pedido_idx
        on central_one_compras (pedido_id)
      `;

      await sql`
        create table if not exists juegos_imagen (
          familia_id text primary key,
          imagen_url text not null,
          actualizado_en timestamptz not null default now()
        )
      `;

    })().catch((e) => {
      listo = null;
      throw e;
    });
  }

  return listo;
}
