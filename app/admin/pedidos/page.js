import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { limpiarWhatsapp } from "@/lib/ajustes";
import AdminNav from "@/components/AdminNav";
import BotonConfirmar from "@/components/BotonConfirmar";
import { confirmarPago, cancelarPedido } from "../acciones-pedidos";

export const dynamic = "force-dynamic";

const COLOR = {
  pendiente: "text-amber-700 border-amber-300",
  entregado: "text-marino border-esmeralda",
  cancelado: "text-neutral-500 border-neutral-300",
  pagado: "text-electrico border-electrico",
};

const ESTADOS = [
  ["pendiente", "Pendientes"],
  ["pagado", "Pagados"],
  ["entregado", "Entregados"],
  ["cancelado", "Cancelados"],
];

const ERRORES = {
  sin_stock: "No alcanza el stock de claves",
  ya_entregado: "Ese pedido ya estaba entregado",
  cancelado: "Ese pedido está cancelado",
  no_existe: "El pedido no existe",
  fallo: "No se pudo confirmar, intenta de nuevo",
  cancelacion: "No se pudo cancelar. Comprueba que el pedido siga pendiente.",
};

const fecha = (d) => new Date(d).toLocaleString("es-BO", { timeZone: "America/La_Paz" });
const chip = (activo) =>
  "rounded-full border px-3 py-1 text-xs " +
  (activo ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600");
const boton = "text-xs rounded-full bg-intenso hover:bg-marino text-white font-semibold px-3 py-1.5";

export default async function Pedidos({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp?.q ? String(sp.q).trim().slice(0, 40) : null;
  const estado = ESTADOS.some(([e]) => e === sp?.estado) ? sp.estado : null;

  const conteos = await sql`select estado, count(*)::int as n from pedidos group by estado`;
  const cuenta = Object.fromEntries(conteos.map((c) => [c.estado, c.n]));
  const total = conteos.reduce((s, c) => s + c.n, 0);

  const pedidos = await sql`
    select p.id, p.codigo, p.total::float as total, p.estado, p.creado_en, p.entregado_en, c.nombre, c.whatsapp,
      (select string_agg(pi.cantidad || ' x ' || pr.nombre || coalesce(' (' || pi.plan_nombre || ')', '') || coalesce(' [ID: ' || pi.dato_cliente || ']', ''), ', ')
         from pedido_items pi join productos pr on pr.id = pi.producto_id
         where pi.pedido_id = p.id) as detalle,
      (select sum(pi.cantidad * (pi.precio_unit - pi.costo_unit))::float
         from pedido_items pi where pi.pedido_id = p.id and pi.costo_unit is not null) as ganancia
    from pedidos p join clientes c on c.id = p.cliente_id
    where (${q}::text is null or p.codigo ilike '%' || ${q} || '%' or c.nombre ilike '%' || ${q} || '%' or c.whatsapp ilike '%' || ${q} || '%')
      and (${estado}::text is null or p.estado = ${estado})
    order by p.id desc limit 50`;

  const href = (e) => {
    const u = new URLSearchParams();
    if (e) u.set("estado", e);
    if (q) u.set("q", q);
    const s = u.toString();
    return "/admin/pedidos" + (s ? "?" + s : "");
  };

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Pedidos</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <a href={href(null)} className={chip(!estado)}>Todos · {total}</a>
          {ESTADOS.map(([e, t]) => (
            <a key={e} href={href(e)} className={chip(estado === e)}>{t} · {cuenta[e] || 0}</a>
          ))}
        </div>

        <form method="GET" className="flex gap-2 mb-4">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <input name="q" defaultValue={q || ""} placeholder="Buscar por código, nombre o WhatsApp" className="w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-acento" />
          <button className="rounded-xl bg-intenso hover:bg-marino text-white text-sm font-semibold px-4">Buscar</button>
        </form>
        {q && <p className="text-xs text-neutral-500 mb-3">Resultados para "{q}" · <a href={href(estado)} className="underline text-marino">Quitar búsqueda</a></p>}

        {sp?.error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error] || ERRORES.fallo}</p>}

        <ul className="space-y-3">
          {pedidos.length === 0 && <li className="text-sm text-neutral-500">{q || estado ? "No se encontró ningún pedido." : "Todavía no hay pedidos."}</li>}
          {pedidos.map((p) => {
            const mensaje = encodeURIComponent(`Hola ${p.nombre}, te escribo por tu pedido ${p.codigo}: ${p.detalle}.`);
            return (
              <li key={p.id} className="rounded-2xl bg-white border border-neutral-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-acento">{p.codigo}</p>
                    <p className="text-sm mt-1">{p.detalle}</p>
                    <p className="text-xs text-neutral-500 mt-1">{p.nombre} · {fecha(p.creado_en)}</p>
                    {p.estado === "entregado" && p.entregado_en && (
                      <p className="text-xs text-neutral-500">Entregado: {fecha(p.entregado_en)}</p>
                    )}
                  </div>
                  <span className={"text-xs rounded-full px-3 py-1 border " + (COLOR[p.estado] || "")}>{p.estado}</span>
                </div>
                <p className="font-semibold mt-2">
                  Bs {p.total.toFixed(2)}
                  {p.ganancia != null && <span className="ml-2 text-xs font-medium text-marino">Ganancia Bs {p.ganancia.toFixed(2)}</span>}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {limpiarWhatsapp(p.whatsapp) && (<a
                    href={`https://wa.me/${limpiarWhatsapp(p.whatsapp)}?text=${mensaje}`}
                    className="text-xs rounded-full border border-neutral-300 text-neutral-600 px-3 py-1.5"
                  >
                    WhatsApp
                  </a>)}
                  {p.estado === "pendiente" && (
                    <>
                      <form action={confirmarPago}>
                        <input type="hidden" name="id" value={p.id} />
                        <BotonConfirmar mensaje={`¿Confirmar el pago y entregar el pedido ${p.codigo}?`} className={boton}>
                          Ya pagó: entregar
                        </BotonConfirmar>
                      </form>
                      <form action={cancelarPedido}>
                        <input type="hidden" name="id" value={p.id} />
                        <BotonConfirmar mensaje={`¿Cancelar el pedido ${p.codigo}?`} className="text-xs rounded-full border border-red-300 text-red-600 px-3 py-1.5">
                          Cancelar
                        </BotonConfirmar>
                      </form>
                    </>
                  )}
                  {p.estado === "pagado" && (
                    <form action={confirmarPago}>
                      <input type="hidden" name="id" value={p.id} />
                      <BotonConfirmar mensaje={`¿Marcar como entregado el pedido ${p.codigo}?`} className={boton}>
                        Marcar entregado
                      </BotonConfirmar>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
