"use client";

import { useState } from "react";

export default function SelectorPlanes({ grupos }) {
  const [sel, setSel] = useState(String(grupos[0]?.items[0]?.id ?? ""));
  const todos = grupos.flatMap((g) => g.items.map((i) => ({ ...i, perfil: g.perfil })));
  const actual = todos.find((x) => String(x.id) === sel);
  const total = actual ? actual.meses_pagados + actual.meses_gratis : 0;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-marino">Elige tu plan</h3>
      {grupos.map((g) => (
        <div key={g.perfil}>
          <p className="text-xs font-medium text-neutral-500 mb-1.5">{g.perfil}</p>
          <div className="grid grid-cols-2 gap-2">
            {g.items.map((pl) => (
              <label key={pl.id} className="block cursor-pointer">
                <input type="radio" name="plan_id" value={pl.id} required checked={String(pl.id) === sel} onChange={() => setSel(String(pl.id))} className="peer sr-only" />
                <div className="rounded-xl border border-neutral-300 px-3 py-2 text-center peer-checked:border-intenso peer-checked:bg-intenso/10 peer-checked:ring-1 peer-checked:ring-intenso">
                  <p className="text-sm font-semibold text-marino">{pl.meses_pagados} {pl.meses_pagados === 1 ? "mes" : "meses"}</p>
                  {pl.meses_gratis > 0 && <p className="inline-block rounded-full bg-turquesa/25 text-marino text-[11px] font-medium px-2">+ {pl.meses_gratis} {pl.meses_gratis === 1 ? "mes gratis" : "meses gratis"}</p>}
                  <p className="text-sm font-bold text-intenso mt-0.5">Bs {pl.precio.toFixed(2)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
      {actual && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm">
          <p className="text-xs text-neutral-500">Tu elección</p>
          <p className="font-semibold text-marino">{actual.perfil} · {total} {total === 1 ? "mes" : "meses"} de servicio</p>
          <p className="text-lg font-bold text-intenso">Total: Bs {actual.precio.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
