import Link from "next/link";
import { sql } from "@/lib/db";
import { limpiarWhatsapp } from "@/lib/ajustes";
import { iconoCategoria } from "@/lib/iconosCategoria";
import { FaWhatsapp } from "react-icons/fa";
import { FiSearch, FiGrid } from "react-icons/fi";
import BotonCarrito from "@/components/BotonCarrito";
import AccesoGoogle from "@/components/AccesoGoogle";

const pill =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-marino transition hover:border-intenso hover:text-intenso";

async function cargarCategorias() {
  try {
    const filas = await sql`
      select categoria
      from (
        select nombre as categoria, orden
        from categorias
        union all
        select categoria, 9999 as orden
        from productos
        where activo and (proveedor is null or proveedor_disponible = true) and categoria is not null
      ) t
      group by categoria
      order by min(orden), categoria
    `;
    return filas.map((f) => f.categoria).filter(Boolean);
  } catch {
    return [];
  }
}

function Buscador({ className = "" }) {
  return (
    <form method="GET" action="/" role="search" className={"relative " + className}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        name="q"
        type="search"
        maxLength={40}
        aria-label="Buscar productos"
        placeholder="Buscar productos..."
        className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-sm text-marino outline-none focus:border-intenso focus:bg-white"
      />
    </form>
  );
}

export default async function TiendaHeader({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  const cats = await cargarCategorias();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center font-semibold text-marino">
            <img src="/logo.png" alt={nombre} className="h-12 w-auto" />
          </Link>
          <Buscador className="hidden max-w-md flex-1 sm:block" />
          <div className="flex items-center gap-2">
            {n && (
              <a href={`https://wa.me/${n}`} className="flex items-center gap-1.5 text-xs font-semibold text-marino bg-esmeralda hover:brightness-95 rounded-full px-3 py-2">
                <FaWhatsapp className="h-4 w-4" />
                <span className="hidden sm:inline">Soporte por WhatsApp</span><span className="sm:hidden">Soporte</span>
              </a>
            )}
            <AccesoGoogle />
            <BotonCarrito />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:hidden">
          <Buscador />
        </div>
      </header>
      {cats.length > 0 && (
        <nav aria-label="Categorías" className="border-b border-neutral-100 bg-white">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
            <Link href="/?todos=1" className={pill}>
              <FiGrid className="h-3.5 w-3.5" />
              Todos
            </Link>
            {cats.map((c) => {
              const Icono = iconoCategoria(c);
              return (
                <Link key={c} href={`/?cat=${encodeURIComponent(c)}`} className={pill}>
                  <Icono className="h-3.5 w-3.5" />
                  {c}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
