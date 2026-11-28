import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerBalanceCentralOne } from "@/lib/central-one";
import AdminNav from "@/components/AdminNav";
import { sincronizarCentralOneAction, comprobarPermisosCentralOneAction } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fecha = d => d
  ? new Date(d).toLocaleString("es-BO", {
      timeZone: "America/La_Paz"
    })
  : "Sin registro";

export default async function CentralOne({ searchParams }) {
  await requireAdmin();
  await asegurarEsquema();

  const sp = await searchParams;

  const [resumen] = await sql`
    select
      count(*)::int as total,
      count(*) filter (where activo)::int as publicados,
      count(*) filter (where not activo)::int as ocultos,
      count(*) filter (where proveedor_disponible)::int as disponibles
    from productos
    where proveedor = 'central_one'
  `;

  const [sync] = await sql`
    select tipo_cambio::text as tipo_cambio,
           fecha_cambio, fuente_tasa, sincronizado_en,
           total_productos, nuevos, actualizados
    from proveedor_sync_estado
    where proveedor = 'central_one'
  `;

  let balance = null;
  let errorBalance = false;

  try {
    balance = await obtenerBalanceCentralOne();
  } catch {
    errorBalance = true;
  }

  return (
    <>
      <AdminNav />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-intenso">
            Proveedor externo
          </p>
          <h1 className="text-2xl font-bold text-marino">
            Central One
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Catálogo de Games, recargas y tarjetas digitales.
          </p>
        </div>

        {sp?.error === "sync" && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudo sincronizar. Revisa la conexión, la clave API y el BCB.
          </p>
        )}

        {sp?.ok && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Sincronización completada: {sp.total} productos,
            {` ${sp.nuevos} nuevos y ${sp.actualizados} actualizados.`}
          </p>
        )}

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-marino">Catálogo importado</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total", resumen.total],
              ["Publicados", resumen.publicados],
              ["Ocultos", resumen.ocultos],
              ["Disponibles", resumen.disponibles]
            ].map(([titulo, valor]) => (
              <div key={titulo} className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">{titulo}</p>
                <p className="mt-1 text-xl font-bold text-marino">{valor}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-marino">Saldo del proveedor</h2>

          {balance ? (
            <p className="mt-2 text-2xl font-bold text-marino">
              {balance.available_balance} USD
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              {errorBalance
                ? "Saldo no disponible. Comprueba que la llave tenga balance:read."
                : "Sin información."}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-marino">Última sincronización</h2>

          <div className="mt-3 space-y-2 text-sm text-neutral-600">
            <p>Fecha: {fecha(sync?.sincronizado_en)}</p>
            <p>Productos: {sync?.total_productos ?? 0}</p>
            <p>Tipo de cambio USD/Bs: {sync?.tipo_cambio ?? "Sin registro"}</p>
            <p>Fuente: {sync?.fuente_tasa || "Sin registro"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-marino">Permisos de la llave</h2>

          <p className="text-sm text-neutral-600">
            Comprueba lectura de saldo, catálogo y pedidos. No compra nada.
            El permiso para crear pedidos se confirma en el portal de Central One.
          </p>

          {sp?.permisos && (
            <ul className="text-sm space-y-1">
              {String(sp.permisos).split(",").map((x) => {
                const [n, e] = x.split("-");
                const t = { saldo: "Saldo", catalogo: "Catálogo", pedidos: "Consultar pedidos" }[n] || n;
                const r = e === "ok" ? "✔ Permitido" : e === "denegado" ? "✘ Sin permiso" : "⚠ No se pudo comprobar";
                return <li key={n}>{t}: {r}</li>;
              })}
            </ul>
          )}

          <form action={comprobarPermisosCentralOneAction}>
            <button className="w-full rounded-xl border border-intenso px-4 py-3 font-semibold text-intenso hover:bg-neutral-50">
              Comprobar permisos
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-marino">Sincronizar catálogo</h2>

          <p className="text-sm text-neutral-600">
            Importa los productos habilitados de Central One,
            actualiza precios, disponibilidad y campos dinámicos.
            Los productos nuevos se crean ocultos para publicación manual.
          </p>

          <form action={sincronizarCentralOneAction}>
            <button className="w-full rounded-xl bg-intenso px-4 py-3 font-semibold text-white hover:bg-marino">
              Sincronizar ahora
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
