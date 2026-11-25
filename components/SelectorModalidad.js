"use client";

import { useId, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { MODALIDADES } from "@/lib/modalidades";

export default function SelectorModalidad({
  name = "modalidad",
  value = "",
  onChange,
  compact = false
}) {
  const grupo = useId().replace(/:/g, "");
  const [interno, setInterno] = useState(value ?? "");
  const controlado = typeof onChange === "function";
  const actual = controlado ? (value ?? "") : interno;

  function elegir(v) {
    if (controlado) onChange(v);
    else setInterno(v);
  }

  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className={compact ? "text-[11px] font-medium text-neutral-500" : "text-xs font-medium text-neutral-500"}>
        Tipo de acceso
      </legend>

      <input type="hidden" name={name} value={actual} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MODALIDADES.map(([v, tx]) => {
          const activo = actual === v;
          const id = `${grupo}-${v || "sin-etiqueta"}`;

          return (
            <div key={v || "ninguna"} className="min-w-0">
              <input
                id={id}
                type="radio"
                name={`selector-${grupo}`}
                value={v}
                checked={activo}
                onChange={() => elegir(v)}
                className="sr-only peer"
              />

              <label
                htmlFor={id}
                className={
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-intenso " +
                  (activo
                    ? "border-intenso bg-intenso/5 text-marino"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-intenso")
                }
              >
                {activo ? (
                  <FiCheckCircle className="h-4 w-4 shrink-0 text-intenso" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-300" />
                )}

                <span className="text-xs font-semibold leading-tight">
                  {v ? tx : "Sin etiqueta"}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-neutral-500">
        La tienda mostrará únicamente la modalidad seleccionada. «Sin etiqueta» no mostrará ningún texto.
      </p>
    </fieldset>
  );
}
