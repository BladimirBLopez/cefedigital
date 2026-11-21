import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { auth } from "@/lib/cliente-auth";
import { getMigrations } from "better-auth/db/migration";
import { migrarAuth } from "./acciones";

export const dynamic = "force-dynamic";

const VARS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
const caja = "rounded-2xl bg-white border border-neutral-200 p-4";

export default async function PaginaAuth({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  let crear = [];
  let agregar = [];
  let fallo = sp?.error ? "No se pudieron crear las tablas. Mira los logs en Vercel." : "";
  try {
    const m = await getMigrations(auth.options);
    crear = (m.toBeCreated || []).map((x) => x.table);
    agregar = (m.toBeAdded || []).map((x) => x.table);
  } catch (e) {
    fallo = "No se pudo revisar la base: " + String(e?.message || e).slice(0, 160);
  }
  const pendientes = crear.length + agregar.length;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Acceso con Google</h1>

        {fallo && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{fallo}</p>}

        <section className={caja}>
          <h2 className="mb-2 text-sm font-semibold text-marino">Variables en Vercel</h2>
          <ul className="space-y-1 text-sm">
            {VARS.map((v) => (
              <li key={v} className="flex justify-between gap-3">
                <span className="font-mono text-xs">{v}</span>
                <span className={process.env[v] ? "font-semibold text-marino" : "font-semibold text-red-600"}>
                  {process.env[v] ? "OK" : "FALTA"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 break-all text-xs text-neutral-500">URL: {process.env.BETTER_AUTH_URL || "—"}</p>
        </section>

        <section className={caja}>
          <h2 className="mb-2 text-sm font-semibold text-marino">Tablas</h2>
          {pendientes === 0 && !fallo && <p className="text-sm text-marino">Todo listo.</p>}
          {crear.length > 0 && <p className="text-sm">Por crear: {crear.join(", ")}</p>}
          {agregar.length > 0 && <p className="text-sm">Columnas por agregar en: {agregar.join(", ")}</p>}
          {pendientes > 0 && (
            <form action={migrarAuth} className="mt-3">
              <button className="rounded-xl bg-intenso px-5 py-2.5 text-sm font-semibold text-white hover:bg-marino">Crear tablas</button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
