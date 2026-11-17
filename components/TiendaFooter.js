import { limpiarWhatsapp } from "@/lib/ajustes";
import { FaWhatsapp } from "react-icons/fa";
import { FiShield } from "react-icons/fi";

export default function TiendaFooter({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <footer className="mt-12 bg-marino text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm">
        <p className="text-lg font-bold">{nombre}</p>
        <p className="text-white/70 mt-1">Productos digitales con entrega rápida.</p>
        <div className="h-1 w-12 rounded bg-cian mt-3" />
        <a href="/garantia" className="mt-4 flex items-center gap-2 text-white/80 hover:text-turquesa"><FiShield className="h-4 w-4 text-turquesa" />Garantía y términos</a>
        {n && (
          <a href={`https://wa.me/${n}`} className="inline-flex items-center gap-2 mt-4 rounded-full bg-esmeralda text-marino font-semibold px-4 py-2">
            <FaWhatsapp className="h-4 w-4" />Soporte por WhatsApp
          </a>
        )}
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/60">© {new Date().getFullYear()} {nombre}. Productos digitales.</div>
    </footer>
  );
}
