import Link from "next/link";
import { limpiarWhatsapp } from "@/lib/ajustes";

export default function TiendaHeader({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center font-semibold text-marino"><img src="/logo.png" alt={nombre} className="h-12 w-auto" /></Link>
        {n && (
          <a href={`https://wa.me/${n}`} className="text-xs font-medium text-marino bg-esmeralda rounded-full px-3 py-1.5">
            Soporte por WhatsApp
          </a>
        )}
      </div>
    </header>
  );
}
