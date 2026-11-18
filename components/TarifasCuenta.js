"use client";

import { useState } from "react";

const MESES = [1, 2, 3, 6, 12];
const PANT = [1, 2, 3, 4, 5, 6, 7, 8];
const chip =
  "inline-block rounded-full border border-neutral-300 px-3 py-1 text-sm peer-checked:bg-intenso peer-checked:text-white peer-checked:border-intenso";
const celda =
  "h-10 w-full min-w-0 rounded-lg bg-neutral-100 border border-neutral-300 px-2 text-sm outline-none focus:border-intenso";
const etq = (m) => `${m} ${m === 1 ? "mes" : "meses"}`;
const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export default function TarifasCuenta() {
  const [pants, setPants] = useState([1]);
  const [meses, setMeses] = useState([1, 3, 6, 12]);
  const [precios, setPrecios] = useState({});
  const [costos, setCostos] = useState({});
  const [verCostos, setVerCostos] = useState(false);
  const [editando, setEditando] = useState(true);

  const alternar = (lista, setLista, v) =>
    setLista(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v].sort((a, b) => a - b));
  const k = (p, m) => `${p}-${m}`;
  const poner = (setter, p, m, v) => setter((o) => ({ ...o, [k(p, m)]: v }));

  const vacio = pants.length === 0 || meses.length === 0;
  const todos = pants.flatMap((p) => meses.map((m) => num(precios[k(p, m)]))).filter((n) => n !== null);
  const minimo = todos.length ? Math.min(...todos) : 0;
  const resumen =
    `${pants.join(", ")} ${pants.length === 1 && pants[0] === 1 ? "pantalla" : "pantallas"}` +
    ` · ${meses.join(", ")} ${meses.length === 1 && meses[0] === 1 ? "mes" : "meses"}`;

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-marino">Precios en Bs</p>
        <button type="button" onClick={() => setVerCostos((v) => !v)} className="text-xs text-intenso">
          {verCostos ? "Ocultar costos" : "+ Costos"}
        </button>
      </div>

      {editando ? (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div>
            <p className="mb-1 text-xs text-neutral-500">Pantallas</p>
            <div className="flex flex-wrap gap-1.5">
              {PANT.map((p) => (
                <label key={p} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="pantallas"
                    value={p}
                    checked={pants.includes(p)}
                    onChange={() => alternar(pants, setPants, p)}
                    className="peer sr-only"
                  />
                  <span className={chip}>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">Duración</p>
            <div className="flex flex-wrap gap-1.5">
              {MESES.map((m) => (
                <label key={m} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="meses"
                    value={m}
                    checked={meses.includes(m)}
                    onChange={() => alternar(meses, setMeses, m)}
                    className="peer sr-only"
                  />
                  <span className={chip}>{etq(m)}</span>
                </label>
              ))}
            </div>
          </div>
          {vacio && <p className="text-xs text-red-600">Elige al menos una pantalla y una duración.</p>}
          <button
            type="button"
            disabled={vacio}
            onClick={() => setEditando(false)}
            className="w-full rounded-lg bg-intenso py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Listo
          </button>
        </div>
      ) : (
        <>
          {pants.map((p) => (
            <input key={`hp${p}`} type="hidden" name="pantallas" value={p} />
          ))}
          {meses.map((m) => (
            <input key={`hm${m}`} type="hidden" name="meses" value={m} />
          ))}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left"
          >
            <span className="text-sm text-marino">{resumen}</span>
            <span className="text-xs text-intenso">Editar</span>
          </button>
        </>
      )}

      {!vacio &&
        pants.map((p, i) => (
          <div key={p}>
            <p className="mb-1.5 text-sm font-semibold text-marino">
              {p} {p === 1 ? "pantalla" : "pantallas"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {meses.map((m) => (
                <div key={m} className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                  <label className="block text-[11px] text-neutral-500">
                    {etq(m)}
                    <input
                      name={`precio_${i}_${m}`}
                      inputMode="decimal"
                      value={precios[k(p, m)] ?? ""}
                      onChange={(e) => poner(setPrecios, p, m, e.target.value)}
                      placeholder="Bs"
                      className={celda + " mt-1"}
                    />
                  </label>
                  {verCostos && (
                    <input
                      name={`costo_${i}_${m}`}
                      inputMode="decimal"
                      value={costos[k(p, m)] ?? ""}
                      onChange={(e) => poner(setCostos, p, m, e.target.value)}
                      placeholder="Costo"
                      aria-label={`Costo ${p} pantallas ${etq(m)}`}
                      className={celda + " mt-1 !bg-white"}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
