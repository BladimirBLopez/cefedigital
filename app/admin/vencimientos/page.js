import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { limpiarWhatsapp } from "@/lib/ajustes";
import AdminNav from "@/components/AdminNav";
import { marcarAvisado } from "../acciones-vence";

export const dynamic = "force-dynamic";

const fecha = (v) => new Date(v).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" });

export default async function Vencimientos() {
  await requireAdmin();
  const filas = await sql`
    select pi.id, pi.avisado_en, pr.nombre as producto, c.nombre as cliente, c.whatsapp, p.codigo,
      pi.vence_en as vence_en
    from pedido_items pi
    join pedidos p on p.id = pi.pedido_id
    join productos pr on pr.id = pi.producto_id
    join clientes c on c.id = p.cliente_id
    where p.estado = 'entregado' and pi.vence_en is not null
      and pi.vence_en < now() + interval '2 days'
      and pi.vence_en > now() - interval '15 days'
    order by vence_en`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold">Servicios por vencer</h1>
        <p className="text-xs text-neutral-500 mb-4">Vencen en 2 días o menos, o vencieron hace poco.</p>
        <ul className="space-y-3">
          {filas.length === 0 && <li className="text-sm text-neutral-500">No hay servicios por vencer.</li>}
          {filas.map((f) => {
            const dias = Math.ceil((new Date(f.vence_en).getTime() - Date.now()) / 86400000);
            const estado = dias < 0 ? `Venció hace ${-dias} día(s)` : dias === 0 ? "Vence hoy" : `Vence en ${dias} día(s)`;
            const msg = encodeURIComponent(
              `Hola ${f.cliente}, tu servicio ${f.producto} (pedido ${f.codigo}) vence el ${fecha(f.vence_en)}. ¿Quieres renovarlo? Respóndenos por aquí y te ayudamos.`
            );
            return (
              <li key={f.id} className="rounded-2xl bg-white border border-neutral-200 p-4">
                <p className="font-medium">{f.producto}</p>
                <p className="text-xs text-neutral-500 mt-1">{f.cliente} · {f.codigo}</p>
                <p className={"text-sm mt-2 font-semibold " + (dias < 0 ? "text-red-600" : "text-amber-700")}>
                  {estado} · {fecha(f.vence_en)}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <a
                    href={`https://wa.me/${limpiarWhatsapp(f.whatsapp)}?text=${msg}`}
                    className="text-xs rounded-full bg-esmeralda text-marino font-semibold px-3 py-1.5"
                  >
                    Enviar aviso por WhatsApp
                  </a>
                  {f.avisado_en ? (
                    <span className="text-xs text-neutral-500 px-3 py-1.5">Avisado el {fecha(f.avisado_en)}</span>
                  ) : (
                    <form action={marcarAvisado}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="text-xs rounded-full border border-neutral-300 text-neutral-600 px-3 py-1.5">Marcar avisado</button>
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
