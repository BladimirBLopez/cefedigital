import { sql } from "@/lib/db";

let listo = null;

export function asegurarEsquema() {
  if (!listo) {
    listo = (async () => {
      await sql`alter table productos add column if not exists vence date`;
      await sql`alter table planes add column if not exists compartida boolean`;
      await sql`alter table pedido_items add column if not exists plan_compartida boolean`;

      await sql`
        alter table pedido_items
        add column if not exists duracion_dias integer
      `;

      // Conserva la duración originalmente contratada
      // antes de retirar los meses gratuitos de los planes activos.
      await sql`
        update pedido_items pi
        set duracion_dias = (
          select coalesce(pl.duracion_dias, pr.duracion_dias)
          from productos pr
          left join planes pl on pl.id = pi.plan_id
          where pr.id = pi.producto_id
        )
        where pi.duracion_dias is null
      `;

      // Ningún plan comercial debe conservar meses gratuitos.
      await sql`
        update planes
        set meses_gratis = 0,
            duracion_dias = greatest(coalesce(meses_pagados, 1), 1) * 30,
            nombre = concat(
              perfil, ' · ', meses_pagados, ' ',
              case when meses_pagados = 1 then 'mes' else 'meses' end
            )
        where coalesce(meses_gratis, 0) > 0
      `;
    })().catch((e) => {
      listo = null;
      throw e;
    });
  }

  return listo;
}
