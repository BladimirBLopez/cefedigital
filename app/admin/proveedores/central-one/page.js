import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerBalanceCentralOne } from "@/lib/central-one";
import AdminNav from "@/components/AdminNav";
import {
  EncabezadoProveedor,
  Aviso,
  Tarjeta,
  EstadoVariables
} from "@/components/PanelProveedor";
import {
  sincronizarCentralOneAction,
  comprobarPermisosCentralOneAction
} from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fecha = d => d
  ? new Date(d).toLocaleString("es-BO", { timeZone: "America/La_Paz" })
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

  const variables = [
    {
      nombre: "CO_API_KEY",
      estado: process.env.CO_API_KEY
        ? String(process.env.CO_API_KEY).trim().startsWith("co_live_") ? "ok" : "formato"
        : "falta"
    },
    { nombre: "CENTRAL_ONE_WEBHOOK_SECRET", estado: process.env.CENTRAL_ONE_WEBHOOK_SECRET ? "ok" : "falta" },
    { nombre: "CRON_SECRET", estado: process.env.CRON_SECRET ? "ok" : "falta" },
    {
      nombre: "Clave de cifrado de códigos",
      estado: /^[a-f0-9]{64}$/i.test(
        process.env.CENTRAL_ONE_CODES_SECRET || process.env.STREAMZONE_CREDENTIALS_SECRET || ""
      ) ? "ok" : "falta"
    }
  ];

  return (
    <>
      <AdminNav />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <EncabezadoProveedor
          nombre="Central One"
          descripcion="Catálogo de Games, recargas y tarjetas digitales."
          accion={sincronizarCentralOneAction}
          etiquetaAccion="Sincronizar ahora"
        />

        {sp?.ok && (
          <Aviso>
            Sincronización completada: {sp.total} productos,
            {` ${sp.nuevos} nuevos y ${sp.actualizados} actualizados.`}
          </Aviso>
        )}

        {sp?.ok && Number(sp.omitidos) > 0 && (
          <Aviso tipo="error">
            {sp.omitidos} producto(s) omitidos por datos no reconocidos. No se podrán comprar hasta corregirlo.
            {sp.omit && (
              <span className="mt-1 block font-mono text-xs">{String(sp.omit)}</span>
            )}
          </Aviso>
        )}

        {sp?.error === "sync" && (
          <Aviso tipo="error">
            No se pudo sincronizar. Revisa la conexión, la clave API y el BCB.
            {sp?.detalle && (
              <span className="mt-1 block font-mono text-xs">
                Motivo: {String(sp.detalle)}
              </span>
            )}
          </Aviso>
        )}

        <Tarjeta titulo="Saldo del proveedor">
          {balance ? (
            <p className="text-2xl font-bold text-marino">
              {balance.available_balance} USD
            </p>
          ) : (
            <p className="text-sm text-neutral-500">
              {errorBalance
                ? "Saldo no disponible. Comprueba que la llave tenga balance:read."
                : "Sin información."}
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Cotización USD a Bs y sincronización">
          <p className="text-2xl font-bold text-marino">
            {sync?.tipo_cambio ? `1 USD = Bs ${Number(sync.tipo_cambio).toFixed(2)}` : "Pendiente de sincronización"}
          </p>
          <div className="mt-2 space-y-1 text-xs text-neutral-500">
            <p>Fuente: {sync?.fuente_tasa || "Sin registro"}</p>
            <p>Fecha de cotización: {sync?.fecha_cambio || "Sin registro"}</p>
            <p>Última sincronización: {fecha(sync?.sincronizado_en)}</p>
            <p>Productos: {sync?.total_productos ?? 0}</p>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Catálogo importado">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </Tarjeta>

        <Tarjeta titulo="Permisos de la llave">
          <p className="mb-3 text-sm text-neutral-600">
            Comprueba lectura de saldo, catálogo y pedidos. No compra nada.
            El permiso para crear pedidos se confirma en el portal de Central One.
          </p>

          {sp?.permisos && (
            <ul className="mb-3 space-y-1 text-sm">
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
        </Tarjeta>

        <EstadoVariables variables={variables} />

        <p className="text-xs text-neutral-500">
          La sincronización importa los productos habilitados, actualiza precios, disponibilidad y campos dinámicos.
          Los productos nuevos se crean ocultos para publicación manual. Los precios que hayas editado manualmente se conservan.
        </p>
      </main>
    </>
  );
}
