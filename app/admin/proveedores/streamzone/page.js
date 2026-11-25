import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import {
  obtenerPerfilStreamZone,
  obtenerCatalogoStreamZone
} from "@/lib/streamzone";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl border border-neutral-200 bg-white p-4";

function numero(v) {
  return v == null || v === "" || !Number.isFinite(Number(v))
    ? "—"
    : Number(v).toFixed(2);
}

export default async function StreamZonePage() {
  await requireAdmin();

  const [perfil, catalogo] = await Promise.all([
    obtenerPerfilStreamZone(),
    obtenerCatalogoStreamZone()
  ]);

  const cuenta = perfil.ok ? perfil.payload?.data : null;
  const wallet = cuenta?.wallet;
  const productos = catalogo.ok &&
    Array.isArray(catalogo.payload?.products)
      ? catalogo.payload.products
      : [];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold">StreamZone</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Conexión con proveedor mayorista de streaming.
          </p>
        </div>

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
          <div className="flex justify-between items-center gap-2 mb-3">
            <h2 className="font-semibold">Catálogo mayorista</h2>
            <span className="text-xs text-neutral-500">
              {catalogo.ok ? `${catalogo.payload?.total ?? productos.length} productos` : "No disponible"}
            </span>
          </div>

          {!catalogo.ok ? (
            <p className="text-sm text-neutral-500">
              No se pudo cargar el catálogo.
            </p>
          ) : productos.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No hay productos disponibles.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {productos.slice(0, 15).map((p, i) => (
                <div key={p.id || p.code || i} className="py-3">
                  <p className="font-medium text-sm">{p.name || "Producto"}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {p.category || "Sin categoría"} · {p.durationDays || "—"} días
                  </p>
                  <div className="flex justify-between gap-2 mt-2 text-xs">
                    <span>USD {numero(p.priceUSD)} · COP {numero(p.priceCOP)}</span>
                    <span className={p.inStock ? "text-emerald-700" : "text-red-600"}>
                      {typeof p.inStock === "boolean"
                        ? (p.inStock ? `Disponible: ${p.stockAvailable ?? "Sí"}` : "Agotado")
                        : "Stock sin información"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Modo de consulta inicial. Todavía no se importan productos ni se realizan compras al proveedor.
        </div>
      </main>
    </>
  );
}
