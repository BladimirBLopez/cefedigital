"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { alternarJuego } from "@/app/admin/acciones-juego-ficha";

export default function InterruptorJuego({ familia, publicados, publicables, nombre }) {
  const [on, setOn] = useState(publicados > 0);
  const [pendiente, empezar] = useTransition();

  function alternar() {
    const anterior = on;
    const publicar = !on;
    if (publicar && publicables === 0) {
      toast.error("No hay paquetes para publicar (sin precio o sin stock).", { id: "juego_estado" });
      return;
    }
    const msg = publicar
      ? `¿Publicar ${publicables} paquetes de ${nombre}? Revisa que los precios estén bien.`
      : `¿Ocultar los ${publicados} paquetes publicados de ${nombre}?`;
    if (!window.confirm(msg)) return;

    setOn(publicar);
    const fd = new FormData();
    fd.set("familia_id", String(familia));
    fd.set("publicar", publicar ? "1" : "0");
    if (publicar) fd.set("confirmo", "on");
    empezar(async () => {
      try {
        const r = await alternarJuego(fd);
        if (!r?.ok) throw new Error("fallo");
        setOn(r.activo);
        toast.success(publicar ? `Publicados ${r.cambiados} paquetes.` : `Ocultados ${r.cambiados} paquetes.`, { id: "juego_estado" });
      } catch {
        setOn(anterior);
        toast.error("No se pudo cambiar el juego.", { id: "juego_estado" });
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Juego a la venta" : "Juego oculto"}
      onClick={alternar}
      disabled={pendiente}
      className={
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors " +
        (on ? "bg-esmeralda" : "bg-neutral-300") +
        (pendiente ? " opacity-60" : "")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-6" : "translate-x-1")
        }
      />
    </button>
  );
}
