import { limpiarWhatsapp } from "@/lib/ajustes";

export default function TiendaFooter({ nombre, whatsapp }) {
  const n = limpiarWhatsapp(whatsapp);
  return (
    <footer className="mt-12 bg-marino text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm">
        <p className="font-semibold">{nombre}</p>
        <p className="text-white/70 mt-1">Productos digitales con entrega rápida.</p>
        <div className="h-1 w-12 rounded bg-cian mt-3" />
        <a href="/garantia" className="block mt-4 text-white/80 underline">Garantía y términos</a>
        {n && (
          <a href={`https://wa.me/${n}`} className="inline-block mt-2 text-turquesa underline">
            Soporte por WhatsApp
          </a>
        )}
      </div>
    </footer>
  );
}
