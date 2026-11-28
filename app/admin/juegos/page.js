import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import { guardarLogoJuego } from "../acciones-juegos";

export const dynamic = "force-dynamic";

const ERRORES = {
  foto: "No se pudo subir la foto (máx. 4 MB)",
  juego: "Ese juego no existe",
};

export default async function Juegos({ searchParams }) {
  await requireAdmin();
  await asegurarEsquema();
  const sp = await searchParams;
  const q = String(sp?.q || "").trim().slice(0, 40);
  const sin = sp?.sin === "1";
  const patron = q ? "%" + q.replace(/[%_\\]/g, "") + "%" : null;

  const juegos = await sql`
    select p.central_one_family_id as id,
           max(p.central_one_family_name) as nombre,
           count(*)::int as paquetes,
           max(j.imagen_url) as imagen
    from productos p
    left join juegos_imagen j on j.familia_id = p.central_one_family_id
    where p.proveedor = 'central_one'
      and p.central_one_family_id is not null
      and (${patron}::text is null or p.central_one_family_name ilike ${patron})
    group by p.central_one_family_id
    having (${sin}::boolean = false or max(j.imagen_url) is null)
    order by max(p.central_one_family_name)
    limit 60
  `;

  const [{ con_logo }] = await sql`select count(*)::int as con_logo from juegos_imagen`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold">Juegos</h1>
        <p className="mb-4 text-xs text-neutral-500">
          {con_logo} con logo · mostrando {juegos.length} (máx. 60, usa el buscador)
        </p>

        {ERRORES[sp?.error] && (
          <p className="mb-3 text-sm text-red-600">{ERRORES[sp.error]}</p>
        )}

        <form method="get" className="mb-3 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar juego"
            className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 outline-none focus:border-acento"
          />
          {sin && <input type="hidden" name="sin" value="1" />}
          <button className="rounded-xl bg-intenso px-4 text-sm font-semibold text-white">
            Buscar
          </button>
        </form>

        <div className="mb-4 flex gap-2 text-xs">
          <Link
            href={"/admin/juegos" + (q ? "?q=" + encodeURIComponent(q) : "")}
            className={"rounded-full border px-3 py-1.5 font-semibold " + (!sin ? "border-intenso bg-intenso text-white" : "border-neutral-300 bg-white text-marino")}
          >
            Todos
          </Link>
          <Link
            href={"/admin/juegos?sin=1" + (q ? "&q=" + encodeURIComponent(q) : "")}
            className={"rounded-full border px-3 py-1.5 font-semibold " + (sin ? "border-intenso bg-intenso text-white" : "border-neutral-300 bg-white text-marino")}
          >
            Sin logo
          </Link>
        </div>

        <div className="space-y-3">
          {juegos.map((g) => (
            <form
              key={g.id}
              action={guardarLogoJuego}
              className="rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <input type="hidden" name="familia_id" value={g.id} />
              <input type="hidden" name="q" value={q} />
              <p className="mb-2 text-sm font-semibold">
                {g.nombre}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  · {g.paquetes} paquetes
                </span>
              </p>
              <SubirFoto actual={g.imagen || ""} />
              <button className="mt-3 w-full rounded-xl bg-intenso py-2 text-sm font-semibold text-white">
                Guardar logo
              </button>
            </form>
          ))}
        </div>

        {juegos.length === 0 && (
          <p className="mt-6 text-center text-sm text-neutral-500">
            No hay juegos con ese filtro.
          </p>
        )}
      </main>
    </>
  );
}
