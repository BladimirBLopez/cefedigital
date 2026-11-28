import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function Diagnostico() {
  await requireAdmin();
  await asegurarEsquema();

  const [t] = await sql`
    select count(*)::int as total,
           count(*) filter (where activo)::int as venta,
           count(*) filter (where proveedor is null)::int as propios,
           count(*) filter (where proveedor = 'streamzone')::int as streamzone,
           count(*) filter (where proveedor = 'central_one')::int as central_one,
           count(*) filter (where precio_manual)::int as manuales
    from productos`;

  const sync = await sql`
    select proveedor,
           to_char(max(sincronizado_proveedor_en) at time zone 'America/La_Paz', 'DD/MM HH24:MI') as ultima,
           (extract(epoch from (now() - max(sincronizado_proveedor_en))) / 3600)::float as horas
    from productos
    where proveedor in ('streamzone', 'central_one')
    group by proveedor order by proveedor`;

  const comprobaciones = [
    {
      t: "A la venta con precio 0 o vacío",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where activo and (precio is null or precio <= 0) order by id desc limit 12`,
    },
    {
      t: "A la venta por debajo del costo (pierdes plata)",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where activo and (
          (proveedor = 'streamzone' and costo_proveedor_bs > 0 and precio < costo_proveedor_bs)
          or (proveedor = 'central_one' and costo_proveedor_bs_central_one > 0 and precio < costo_proveedor_bs_central_one)
        ) order by id desc limit 12`,
    },
    {
      t: "A la venta pero sin stock del proveedor",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where activo and proveedor is not null and not proveedor_disponible
        order by id desc limit 12`,
    },
    {
      t: "Cuentas a la venta sin planes activos",
      filas: await sql`
        select p.id, p.nombre, (count(*) over ())::int as total from productos p
        where p.activo and p.tipo = 'cuenta'
          and not exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo)
        order by p.id desc limit 12`,
    },
    {
      t: "Recargas propias sin campo del cliente (ID)",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where tipo = 'recarga' and proveedor is null and coalesce(campo_cliente, '') = ''
        order by id desc limit 12`,
    },
    {
      t: "A la venta sin foto (sin contar juegos de Central One)",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where activo and imagen_url is null and proveedor is distinct from 'central_one'
        order by id desc limit 12`,
    },
    {
      t: "Productos sin categoría",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where categoria is null or categoria = '' order by id desc limit 12`,
    },
    {
      t: "Juegos a la venta sin logo",
      base: "/admin/juegos/",
      filas: await sql`
        select p.central_one_family_id as id, max(p.central_one_family_name) as nombre,
               (count(*) over ())::int as total
        from productos p
        left join juegos_imagen j on j.familia_id = p.central_one_family_id
        where p.proveedor = 'central_one' and p.activo and p.central_one_family_id is not null and j.familia_id is null
        group by p.central_one_family_id
        order by 2 limit 12`,
    },
    {
      t: "Vencen en 7 días o ya vencieron",
      filas: await sql`
        select id, nombre, (count(*) over ())::int as total from productos
        where vence is not null and vence <= current_date + 7
        order by vence limit 12`,
    },
  ];

  const problemas = comprobaciones.reduce((a, c) => a + (c.filas[0]?.total ? 1 : 0), 0);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/admin/productos" className="text-xs text-marino hover:underline">← Productos</Link>
        <h1 className="mb-1 mt-2 text-xl font-semibold">Diagnóstico de productos</h1>
        <p className="mb-4 text-xs text-neutral-500">
          {problemas === 0 ? "Todo en orden." : problemas + " revisión(es) con avisos."}
        </p>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["Total", t.total],
            ["A la venta", t.venta],
            ["Precio manual", t.manuales],
            ["Propios", t.propios],
            ["StreamZone", t.streamzone],
            ["Central One", t.central_one],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-neutral-200 bg-white p-2 text-center">
              <p className="text-lg font-semibold text-marino">{v}</p>
              <p className="text-[10px] text-neutral-500">{k}</p>
            </div>
          ))}
        </div>

        <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-marino">Última sincronización con proveedores</h2>
          {sync.length === 0 && <p className="text-xs text-neutral-500">Sin datos de sincronización.</p>}
          {sync.map((s) => (
            <div key={s.proveedor} className="flex items-center justify-between py-1 text-sm">
              <span>{s.proveedor === "streamzone" ? "StreamZone" : "Central One"}</span>
              <span className={s.horas > 24 ? "text-amber-600" : "text-emerald-600"}>
                {s.ultima || "nunca"}{s.horas != null ? " · hace " + Math.round(s.horas) + " h" : ""}
              </span>
            </div>
          ))}
        </section>

        <div className="space-y-3">
          {comprobaciones.map((c) => {
            const n = c.filas[0]?.total || 0;
            return (
              <section key={c.t} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-marino">{c.t}</h2>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + (n === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    {n === 0 ? "OK" : n}
                  </span>
                </div>
                {n > 0 && (
                  <ul className="mt-2 divide-y divide-neutral-100">
                    {c.filas.map((x) => (
                      <li key={x.id} className="py-1.5">
                        <Link href={(c.base || "/admin/productos/") + encodeURIComponent(x.id)} className="block truncate text-xs text-marino hover:underline">
                          {x.nombre}
                        </Link>
                      </li>
                    ))}
                    {n > c.filas.length && <li className="pt-1.5 text-[11px] text-neutral-500">y {n - c.filas.length} más</li>}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
