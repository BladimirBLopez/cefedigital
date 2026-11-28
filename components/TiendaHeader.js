import Link from "next/link";
import { limpiarWhatsapp } from "@/lib/ajustes";
import { FaWhatsapp } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import BotonCarrito from "@/components/BotonCarrito";
import AccesoGoogle from "@/components/AccesoGoogle";

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

export default function TiendaHeader({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
        <Link href="/" className="order-1 flex shrink-0 items-center font-semibold text-marino">
          <img src="/logo.png" alt={nombre} className="h-12 w-auto" />
        </Link>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          {n && (
            <a href={`https://wa.me/${n}`} className="flex items-center gap-1.5 text-xs font-semibold text-marino bg-esmeralda hover:brightness-95 rounded-full px-3 py-2">
              <FaWhatsapp className="h-4 w-4" />
              <span className="hidden sm:inline">Soporte por WhatsApp</span><span className="sm:hidden">Soporte</span>
            </a>
          )}
          <AccesoGoogle />
          <BotonCarrito />
        </div>
        <Buscador className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-md sm:flex-1" />
      </div>
    </header>
  );
}
