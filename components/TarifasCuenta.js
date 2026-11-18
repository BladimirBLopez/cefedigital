"use client";

import { useState } from "react";

const MESES = [1, 2, 3, 6, 12];
const PANT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const celda =
  "h-10 w-full min-w-0 rounded-lg bg-neutral-100 border border-neutral-300 px-1 text-center text-sm outline-none focus:border-intenso";
const etq = (m) => `${m} ${m === 1 ? "mes" : "meses"}`;
const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export default function TarifasCuenta() {
  const [filas, setFilas] = useState([{ id: 1, pant: 1, precios: {}, costos: {} }]);
  const [meses, setMeses] = useState([1, 3, 6, 12]);
  const [verCostos, setVerCostos] = useState(false);

  const cambiarPant = (id, v) => setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, pant: v } : f)));
  const cambiarValor = (id, clave, m, v) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [clave]: { ...f[clave], [m]: v } } : f)));
  const agregar = () =>
    setFilas((fs) => {
      const usadas = fs.map((f) => f.pant);
      const sig = PANT.find((n) => !usadas.includes(n)) || 1;
      return [...fs, { id: Date.now(), pant: sig, precios: {}, costos: {} }];
    });
  const quitar = (id) => setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : fs));
  const alternar = (m) =>
    setMeses((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m].sort((a, b) => a - b)));

  const cuenta = {};
  filas.forEach((f) => (cuenta[f.pant] = (cuenta[f.pant] || 0) + 1));
  const hayRepetidas = Object.values(cuenta).some((n) => n > 1);
  const todos = filas.flatMap((f) => meses.map((m) => num(f.precios[m]))).filter((n) => n !== null);
  const minimo = todos.length ? Math.min(...todos) : 0;
  const cols = { gridTemplateColumns: `4.5rem repeat(${meses.length}, 3.75rem) 1.5rem` };

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-marino">Precios en Bs</p>
        <button type="button" onClick={() => setVerCostos((v) => !v)} className="text-xs text-intenso">
          {verCostos ? "Ocultar costos" : "+ Costos"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MESES.map((m) => (
          <label key={m} className="cursor-pointer">
            <input
              type="checkbox"
              name="meses"
              value={m}
              checked={meses.includes(m)}
              onChange={() => alternar(m)}
              className="peer sr-only"
            />
            <span className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-xs peer-checked:bg-intenso peer-checked:text-white peer-checked:border-intenso">
              {etq(m)}
            </span>
          </label>
        ))}
      </div>

      {meses.length === 0 ? (
        <p className="text-xs text-red-600">Marca al menos una duración.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-1.5">
            <div className="grid gap-1.5 text-center text-[11px] text-neutral-500" style={cols}>
              <span className="text-left">Pantallas</span>
              {meses.map((m) => (
                <span key={m}>{etq(m)}</span>
              ))}
              <span></span>
            </div>

            {filas.map((f, i) => (
              <div key={f.id} className="space-y-1.5">
                <div className="grid gap-1.5 items-center" style={cols}>
                  <select
                    name="pantallas"
                    value={f.pant}
                    onChange={(e) => cambiarPant(f.id, Number(e.target.value))}
                    aria-label="Pantallas"
                    className={celda + (cuenta[f.pant] > 1 ? " !border-red-400" : "")}
                  >
                    {PANT.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {meses.map((m) => (
                    <input
                      key={m}
                      name={`precio_${i}_${m}`}
                      inputMode="decimal"
                      value={f.precios[m] ?? ""}
                      onChange={(e) => cambiarValor(f.id, "precios", m, e.target.value)}
                      placeholder="—"
                      aria-label={`Precio ${f.pant} pantallas ${etq(m)}`}
                      className={celda}
                    />
                  ))}
                  {filas.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => quitar(f.id)}
                      aria-label="Quitar fila"
                      className="text-lg leading-none text-neutral-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  ) : (
                    <span></span>
                  )}
                </div>

                {verCostos && (
                  <div className="grid gap-1.5 items-center" style={cols}>
                    <span className="text-[11px] text-neutral-400">Costo</span>
                    {meses.map((m) => (
                      <input
                        key={m}
                        name={`costo_${i}_${m}`}
                        inputMode="decimal"
                        value={f.costos[m] ?? ""}
                        onChange={(e) => cambiarValor(f.id, "costos", m, e.target.value)}
                        placeholder="—"
                        aria-label={`Costo ${f.pant} pantallas ${etq(m)}`}
                        className={celda + " !bg-white"}
                      />
                    ))}
                    <span></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hayRepetidas && <p className="text-xs text-red-600">Hay pantallas repetidas. Cambia una.</p>}

      <button
        type="button"
        onClick={agregar}
        className="w-full rounded-lg border border-dashed border-intenso py-2 text-sm text-intenso"
      >
        + Dispositivos
      </button>
    </div>
  );
}
