import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import AdminNav from "@/components/AdminNav";
import {
  obtenerPerfilStreamZone,
  obtenerCatalogoStreamZone
} from "@/lib/streamzone";
import { sincronizarStreamZone } from "./actions";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl border border-neutral-200 bg-white p-4";

function numero(v, decimales = 2) {
  return v == null || v === "" || !Number.isFinite(Number(v))
    ? "—"
    : Number(v).toFixed(decimales);
}

export default async function StreamZonePage({ searchParams }) {
  await requireAdmin();
  await asegurarEsquema();

  const sp = await searchParams;

  const [perfil, catalogo, estados, importados] = await Promise.all([
    obtenerPerfilStreamZone(),
    obtenerCatalogoStreamZone(),
    sql`
      select tipo_cambio::float as tipo_cambio, fecha_cambio,
             fuente_tasa, sincronizado_en, total_productos,
             nuevos, actualizados
      from proveedor_sync_estado
      where proveedor = 'streamzone'
    `,
    sql`
      select count(*)::int as total
      from productos
      where proveedor = 'streamzone'
    `
  ]);

  const cuenta = perfil.ok ? perfil.payload?.data : null;
  const wallet = cuenta?.wallet;
  const estado = estados[0];
  const tasa = estado?.tipo_cambio != null ? Number(estado.tipo_cambio) : null;

  const productos =
    catalogo.ok && Array.isArray(catalogo.payload?.products)
      ? catalogo.payload.products
      : [];

  if (catalogo.ok && productos.length) {
    const seguro = (v) => {
      if (typeof v === "string") return v.slice(0, 100);
      if (typeof v === "number" || typeof v === "boolean") return v;
      return null;
    };

    const campos = [
      "type", "productType", "product_type",
      "deliveryType", "delivery_type",
      "deliveryMode", "delivery_mode",
      "serviceType", "service_type",
      "activationType", "activation_type",
      "accountType", "account_type",
      "method", "format", "platform"
    ];

    for (const p of productos) {
      const registro = {
        id: seguro(p.id),
        code: seguro(p.code),
        name: seguro(p.name),
        category: seguro(p.category),
        durationDays: seguro(p.durationDays),
        priceCOP: seguro(p.priceCOP),
        priceUSD: seguro(p.priceUSD),
        inStock: seguro(p.inStock),
        stockAvailable: seguro(p.stockAvailable),
        fields: Object.keys(p),
        classification: Object.fromEntries(
          campos.map(k => [k, seguro(p[k])])
            .filter(([,v]) => v !== null)
        )
      };

      console.log(
        "[DIAGNOSTICO STREAMZONE PRODUCTO]",
        JSON.stringify(registro)
      );
    }
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">StreamZone</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Catálogo mayorista y sincronización con Cefe Digital.
            </p>
          </div>

          <form action={sincronizarStreamZone}>
            <button className="rounded-xl bg-intenso hover:bg-marino text-white px-4 py-3 text-sm font-semibold">
              Sincronizar e importar
            </button>
          </form>
        </div>

        {sp?.ok === "1" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Sincronización completada. Nuevos: {sp.nuevos || 0} · Actualizados: {sp.actualizados || 0}.
          </div>
        )}

        {sp?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudo completar la sincronización. Revisa la conexión con el proveedor y el BCB.
          </div>
        )}

        <section className={panel}>
          <h2 className="font-semibold mb-3">Estado de conexión</h2>
          <p className="text-sm">
            Perfil: {perfil.ok ? "Conectado" : "Sin conexión"}
          </p>
          {!perfil.ok && (
            <p className="text-sm text-red-600 mt-2">{perfil.error}</p>
          )}
          <p className="text-sm mt-2">
            Catálogo: {catalogo.ok ? "Consultado correctamente" : "No disponible"}
          </p>
          {!catalogo.ok && (
            <p className="text-sm text-red-600 mt-2">{catalogo.error}</p>
          )}
          {cuenta && (
            <p className="text-sm text-neutral-500 mt-3">
              Cuenta: {cuenta.name || "Revendedor"} · API: {cuenta.apiStatus || "Sin estado"}
            </p>
          )}
        </section>

        <section className={panel}>
          <h2 className="font-semibold mb-3">Billetera del proveedor</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-neutral-500">Saldo USD</p>
              <p className="text-lg font-semibold">
                {wallet?.formattedUSD || (wallet?.balanceUSD != null
                  ? `USD ${numero(wallet.balanceUSD)}`
                  : "—")}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Saldo COP</p>
              <p className="text-lg font-semibold">
                {wallet?.formattedCOP || (wallet?.balanceCOP != null
                  ? `COP ${numero(wallet.balanceCOP)}`
                  : "—")}
              </p>
            </div>
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-semibold mb-3">Cotización referencial COP a Bs</h2>
          <p className="text-xs text-neutral-500 mb-2">
            Las cotizaciones de monedas distintas al dólar estadounidense son indicativas según el BCB.
          </p>
          <p className="text-2xl font-bold text-marino">
            {tasa ? `1 COP = Bs ${numero(tasa, 8)}` : "Pendiente de sincronización"}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Fuente: {estado?.fuente_tasa || "Banco Central de Bolivia"}
          </p>
          <p className="text-xs text-neutral-500">
            Fecha de cotización: {estado?.fecha_cambio || "—"}
          </p>
          <p className="text-xs text-neutral-500">
            Última sincronización: {estado?.sincronizado_en
              ? new Date(estado.sincronizado_en).toLocaleString("es-BO", { timeZone: "America/La_Paz" })
              : "Todavía no sincronizado"}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Margen bruto objetivo: 20%.
          </p>
        </section>

        <section className={panel}>
          <div className="flex justify-between items-center gap-2 mb-3">
            <h2 className="font-semibold">Catálogo mayorista completo</h2>
            <span className="text-xs text-neutral-500">
              {catalogo.ok ? `${catalogo.payload?.total ?? productos.length} productos` : "No disponible"}
            </span>
          </div>

          <p className="text-xs text-neutral-500 mb-3">
            Importados en tu tienda: {importados[0]?.total || 0}
          </p>

          {!catalogo.ok ? (
            <p className="text-sm text-neutral-500">
              No se pudo cargar el catálogo.
            </p>
          ) : productos.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No hay productos disponibles en el catálogo.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {productos.map((p, i) => {
                const costoBs =
                  tasa && Number.isFinite(Number(p.priceCOP))
                    ? Number(p.priceCOP) * tasa
                    : null;

                const sugerido =
                  costoBs == null
                    ? null
                    : Math.ceil((costoBs / 0.80 - 0.000000001) * 100) / 100;

                return (
                  <div key={p.id || p.code || i} className="py-3">
                    <p className="font-medium text-sm">{p.name || "Producto"}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {p.category || "Sin categoría"} · {p.durationDays || "—"} días
                    </p>
                    <div className="flex justify-between gap-2 mt-2 text-xs flex-wrap">
                      <span>
                        COP {numero(p.priceCOP)} · USD {numero(p.priceUSD)}
                      </span>
                      <span className={p.inStock ? "text-emerald-700" : "text-red-600"}>
                        {p.inStock
                          ? `Disponible: ${p.stockAvailable ?? "Sí"}`
                          : "Agotado"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Costo convertido: {costoBs == null ? "—" : `Bs ${numero(costoBs, 4)}`}
                      {" · "}
                      Venta sugerida (margen bruto 20%): {sugerido == null ? "—" : `Bs ${numero(sugerido)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-xs text-neutral-500">
          La sincronización actualiza costos y disponibilidad. Los precios que hayas editado manualmente se conservan.
        </p>
      </main>
    </>
  );
}
