import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

const COLOR = {
  pendiente: "text-amber-700 border-amber-300",
  entregado: "text-marino border-esmeralda",
  cancelado: "text-neutral-500 border-neutral-300",
  pagado: "text-electrico border-electrico",
};

const bs = (n) => "Bs " + Number(n || 0).toFixed(2);

function Atencion({ href, titulo, valor }) {
  const alerta = valor > 0;
  return (
    <Link
      href={href}
      className={"rounded-2xl border p-4 block " + (alerta ? "bg-amber-50 border-amber-300" : "bg-white border-neutral-200")}
    >
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className={"text-3xl font-semibold mt-1 " + (alerta ? "text-amber-700" : "")}>{valor}</p>
    </Link>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className="text-lg font-semibold mt-1">{valor}</p>
    </div>
  );
}

export default async function Resumen() {
  await requireAdmin();
  await asegurarEsquema();
  const [r] = await sql`
    with v as (
      select id, total,
        (coalesce(pagado_en::timestamptz, creado_en) at time zone 'America/La_Paz')::date as dia
      from pedidos where estado in ('pagado', 'entregado')
    ), h as (select (now() at time zone 'America/La_Paz')::date as d)
    select
      (select count(*)::int from productos where activo) as productos,
      (select count(*)::int from pedidos where estado = 'pendiente') as pendientes,
      (select count(*)::int from pedidos where estado = 'pagado') as por_entregar,
      (select coalesce(sum(total), 0)::float from v, h where v.dia = h.d) as hoy,
      (select coalesce(sum(total), 0)::float from v, h where v.dia >= h.d - 6) as semana,
      (select coalesce(sum(total), 0)::float from v, h where v.dia >= date_trunc('month', h.d::timestamp)::date) as mes,
      (select coalesce(sum(pi.cantidad * (pi.precio_unit - pi.costo_unit)), 0)::float
         from pedido_items pi join v on v.id = pi.pedido_id, h
         where pi.costo_unit is not null and v.dia >= date_trunc('month', h.d::timestamp)::date) as ganancia_mes,
      (select count(*)::int from pedido_items pi join pedidos pe on pe.id = pi.pedido_id
         where pe.estado = 'entregado' and pi.vence_en is not null and pi.avisado_en is null
           and pi.vence_en < now() + interval '2 days' and pi.vence_en > now() - interval '15 days') as por_avisar`;
  const ultimos = await sql`
    select p.codigo, p.total::float as total, p.estado, p.creado_en, c.nombre
    from pedidos p join clientes c on c.id = p.cliente_id
    order by p.id desc limit 5`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">Resumen</h1>

        <div className="grid grid-cols-3 gap-3">
          <Atencion href="/admin/pedidos?estado=pagado" titulo="Por entregar" valor={r.por_entregar} />
          <Atencion href="/admin/pedidos?estado=pendiente" titulo="Sin pagar" valor={r.pendientes} />
          <Atencion href="/admin/vencimientos" titulo="Por avisar" valor={r.por_avisar} />
        </div>

        <section>
          <h2 className="text-sm text-neutral-500 mb-2">Ventas cobradas</h2>
          <div className="grid grid-cols-3 gap-3">
            <Dato titulo="Hoy" valor={bs(r.hoy)} />
            <Dato titulo="7 días" valor={bs(r.semana)} />
            <Dato titulo="Este mes" valor={bs(r.mes)} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Dato titulo="Ganancia del mes" valor={bs(r.ganancia_mes)} />
          <Link href="/admin/productos" className="block">
            <Dato titulo="Productos a la venta" valor={r.productos} />
          </Link>
        </div>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-neutral-500">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-xs text-marino hover:underline">Ver todos</Link>
          </div>
          <ul className="space-y-2">
            {ultimos.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay pedidos.</li>}
            {ultimos.map((p) => (
              <li key={p.codigo} className="rounded-xl bg-white border border-neutral-200 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-acento">{p.codigo}</p>
                  <p className="text-sm truncate">{p.nombre} · {bs(p.total)}</p>
                </div>
                <span className={"shrink-0 text-xs rounded-full px-3 py-1 border " + (COLOR[p.estado] || "")}>{p.estado}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
