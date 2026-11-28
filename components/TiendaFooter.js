import Link from "next/link";
import { limpiarWhatsapp } from "@/lib/ajustes";
import { FaWhatsapp } from "react-icons/fa";
import { FiShield, FiClock, FiCreditCard } from "react-icons/fi";

export default function TiendaFooter({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <footer className="mt-12 bg-marino text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold">{nombre}</p>
          <p className="mt-1 text-white/70">Licencias, streaming y recargas con entrega rápida.</p>
          <div className="mt-3 h-1 w-12 rounded bg-cian" />
          {n && (
            <a href={`https://wa.me/${n}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-esmeralda px-4 py-2 font-semibold text-marino">
              <FaWhatsapp className="h-4 w-4" />Soporte por WhatsApp
            </a>
          )}
        </div>
        <div>
          <p className="font-semibold">Tienda</p>
          <ul className="mt-3 space-y-2 text-white/80">
            <li><Link href="/" className="hover:text-turquesa">Inicio</Link></li>
            <li><Link href="/?todos=1" className="hover:text-turquesa">Catálogo completo</Link></li>
            <li><Link href="/garantia" className="hover:text-turquesa">Garantía y términos</Link></li>
            <li><Link href="/carrito" className="hover:text-turquesa">Mi carrito</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Compra con confianza</p>
          <ul className="mt-3 space-y-3 text-white/80">
            <li className="flex items-center gap-2"><FiCreditCard className="h-4 w-4 shrink-0 text-turquesa" />Pago por QR</li>
            <li className="flex items-center gap-2"><FiClock className="h-4 w-4 shrink-0 text-turquesa" />Atención 24/7 por WhatsApp</li>
            <li className="flex items-center gap-2"><FiShield className="h-4 w-4 shrink-0 text-turquesa" />Garantía de 7 días</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/60">© {new Date().getFullYear()} {nombre}. Productos digitales.</div>
    </footer>
  );
}
