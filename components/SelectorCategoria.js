"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

export default function SelectorCategoria({ categorias = [], actual = "" }) {
  const existe = actual && categorias.includes(actual);
  const [sel, setSel] = useState(actual ? (existe ? actual : "__nueva") : "");
  const [nueva, setNueva] = useState(actual && !existe ? actual : "");
  const valor = sel === "__nueva" ? nueva : sel;
  return (
    <div className="space-y-2">
      <label className="block text-xs text-neutral-500">
        Categoría en la tienda
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={campo + " mt-1"}>
          <option value="">Automática según el tipo</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__nueva">+ Nueva categoría</option>
        </select>
      </label>
      {sel === "__nueva" && (
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          maxLength={40}
          placeholder="Nombre (ej: Inteligencia Artificial)"
          className={campo}
        />
      )}
      <input type="hidden" name="categoria" value={valor} />
    </div>
  );
}
