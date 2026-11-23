"use client";

import { useEffect, useState } from "react";

export default function PrecioProducto({
  planes = [],
  precioBase = 0
}) {
  const [planId, setPlanId] = useState("");

  useEffect(() => {
    const actualizar = (evento) => {
      setPlanId(String(evento.detail?.planId || ""));
    };

    window.addEventListener(
      "cefe:seleccion-plan",
      actualizar
    );

    return () => {
      window.removeEventListener(
        "cefe:seleccion-plan",
        actualizar
      );
    };
  }, []);

  const seleccionado = planes.find(
    p => String(p.id) === planId
  );

  const precios = planes
    .map(p => Number(p.precio))
    .filter(Number.isFinite);

  const inicial = precios.length
    ? Math.min(...precios)
    : Number(precioBase);

  const precio = seleccionado
    ? Number(seleccionado.precio)
    : inicial;

  return (
    <div aria-live="polite" aria-atomic="true">
      <p className="text-xs font-medium text-neutral-500">
        {seleccionado
          ? "Precio del plan seleccionado"
          : planes.length > 1
            ? "Precio desde"
            : "Precio del producto"}
      </p>

      <p className="mt-1 text-3xl font-extrabold tracking-tight text-intenso sm:text-4xl">
        {Number.isFinite(precio)
          ? `Bs ${precio.toFixed(2)}`
          : "Precio no disponible"}
      </p>

      {planes.length > 1 && !seleccionado && (
        <p className="mt-1 text-xs text-neutral-500">
          El precio se actualizará al elegir tu plan.
        </p>
      )}
    </div>
  );
}
