"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const EXITOS = {
  producto_creado: "Producto creado correctamente.",
  producto_actualizado: "Producto actualizado correctamente.",
  producto_eliminado: "Producto eliminado correctamente.",
  producto_publicado: "Producto publicado correctamente.",
  producto_ocultado: "Producto ocultado correctamente.",
  plan_agregado: "Plan agregado correctamente.",
  plan_actualizado: "Cambios del plan guardados correctamente.",
  plan_activado: "Plan activado correctamente.",
  plan_desactivado: "Plan desactivado correctamente.",
  plan_borrado: "Plan eliminado correctamente.",
  pedido_entregado: "Pedido entregado correctamente.",
  pedido_cancelado: "Pedido cancelado correctamente.",
  ajustes_guardados: "Ajustes guardados correctamente.",
  vencimiento_avisado: "Servicio marcado como avisado.",
  sesion_iniciada: "Sesión iniciada correctamente.",
  sesion_cerrada: "Sesión cerrada correctamente.",
  pedido_creado: "Tu pedido fue creado correctamente."
};

export default function NotificacionRuta() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ultima = useRef("");
  const consulta = searchParams.toString();

  useEffect(() => {
    if (!consulta) {
      ultima.current = "";
      return;
    }

    const clave = `${pathname}?${consulta}`;
    if (ultima.current === clave) return;

    const params = new URLSearchParams(consulta);
    const aviso = params.get("aviso");
    const nuevo = params.get("nuevo");

    if (aviso && EXITOS[aviso]) {
      const mensaje = EXITOS[aviso];

      toast.success(mensaje);
    } else if (nuevo === "1") {
      toast.success(EXITOS.pedido_creado);
    } else {
      ultima.current = "";
      return;
    }

    ultima.current = clave;

    params.delete("aviso");
    params.delete("nuevo");

    const resto = params.toString();
    const hash = window.location.hash;

    window.history.replaceState(
      null,
      "",
      `${pathname}${resto ? `?${resto}` : ""}${hash}`
    );
  }, [pathname, consulta]);

  return null;
}
