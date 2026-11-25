"use client";

import { MODALIDADES } from "@/lib/modalidades";

export default function SelectorModalidad({
  name = "modalidad",
  value = "",
  onChange,
  compact = false
}) {
  const controlado = typeof onChange === "function";

  const props = controlado
    ? {
        value: value ?? "",
        onChange: (e) => onChange(e.target.value)
      }
    : {
        defaultValue: value ?? ""
      };

  const estilo = compact
    ? "mt-1 h-10 w-full min-w-0 rounded-lg bg-neutral-100 border border-neutral-300 px-3 text-sm outline-none focus:border-intenso"
    : "mt-1 w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-intenso";

  return (
    <label className="block min-w-0">
      <span className={compact
        ? "text-[11px] font-medium text-neutral-500"
        : "text-xs font-medium text-neutral-500"
      }>
        Tipo de acceso
      </span>

      <select
        name={name}
        {...props}
        className={estilo}
      >
        {MODALIDADES.map(([v, tx]) => (
          <option key={v || "ninguna"} value={v}>
            {tx}
          </option>
        ))}
      </select>

      {!compact && (
        <p className="mt-1 text-[11px] text-neutral-500">
          La modalidad seleccionada se mostrará en la tienda.
        </p>
      )}
    </label>
  );
}
