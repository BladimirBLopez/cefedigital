"use client";

import { useState } from "react";

export default function SwitchVenta({ defecto = true }) {
  const [on, setOn] = useState(defecto);
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3">
      <span className="text-sm text-marino">{on ? "A la venta" : "Oculto"}</span>
      <input type="hidden" name="activo" value={on ? "1" : "0"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="A la venta"
        onClick={() => setOn((v) => !v)}
        className={
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors " +
          (on ? "bg-esmeralda" : "bg-neutral-300")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (on ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}
