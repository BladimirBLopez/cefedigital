import Link from "next/link";
import { limpiarWhatsapp } from "@/lib/ajustes";

export default function TiendaHeader({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0d0d0f]/95 backdrop-blur">
      <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-acento">{nombre}</Link>
        {n && (
          <a href={`https://wa.me/${n}`} className="text-xs text-neutral-300 border border-neutral-700 rounded-full px-3 py-1">
            Soporte por WhatsApp
          </a>
        )}
      </div>
    </header>
  );
}
