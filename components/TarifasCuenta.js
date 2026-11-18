"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-3 py-2 outline-none focus:border-intenso";
const MESES = [1, 2, 3, 6, 12];
const PANT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const etq = (m) => `${m} ${m === 1 ? "mes" : "meses"}`;
const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export default function TarifasCuenta() {
  const [filas, setFilas] = useState([{ id: 1, pant: 1, precios: {}, costos: {} }]);
  const [meses, setMeses] = useState([1, 3, 6, 12]);

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

  const repetidas = new Set(filas.map((f) => f.pant)).size !== filas.length;
  const todos = filas.flatMap((f) => meses.map((m) => num(f.precios[m]))).filter((n) => n !== null);
  const minimo = todos.length ? Math.min(...todos) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />
      <p className="text-sm font-semibold text-marino">Precios por dispositivos y duración</p>
      <p className="text-xs text-neutral-500">Escribe tú el precio de cada duración. Deja vacío lo que no vendes.</p>

      <div>
        <p className="text-xs text-neutral-500 mb-1.5">Duraciones que vendes</p>
        <div className="flex flex-wrap gap-2">
          {MESES.map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="checkbox" name="meses" value={m} checked={meses.includes(m)} onChange={() => alternar(m)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-sm peer-checked:bg-intenso peer-checked:text-white peer-checked:border-intenso">
                {etq(m)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {filas.map((f, i) => (
        <div key={f.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-2">
          <label className="block text-xs text-neutral-500">
            Dispositivos o pantallas
            <select name="pantallas" value={f.pant} onChange={(e) => cambiarPant(f.id, Number(e.target.value))} className={campo + " mt-1"}>
              {PANT.map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>
              ))}
            </select>
          </label>

          {meses.length === 0 ? (
            <p className="text-xs text-red-600">Marca al menos una duración.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 text-xs text-neutral-500">
                <span></span>
                <span>Precio (Bs)</span>
                <span>Te cuesta (opc.)</span>
              </div>
              {meses.map((m) => (
                <div key={m} className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 items-center">
                  <span className="text-sm font-medium text-marino">{etq(m)}</span>
                  <input
                    name={`precio_${i}_${m}`}
                    inputMode="decimal"
                    value={f.precios[m] ?? ""}
                    onChange={(e) => cambiarValor(f.id, "precios", m, e.target.value)}
                    placeholder="0"
                    className={campo}
                  />
                  <input
                    name={`costo_${i}_${m}`}
                    inputMode="decimal"
                    value={f.costos[m] ?? ""}
                    onChange={(e) => cambiarValor(f.id, "costos", m, e.target.value)}
                    placeholder="0"
                    className={campo}
                  />
                </div>
              ))}
            </div>
          )}

          {filas.length > 1 && (
            <button type="button" onClick={() => quitar(f.id)} className="text-xs text-red-600">Quitar esta opción</button>
          )}
        </div>
      ))}

      {repetidas && <p className="text-xs text-red-600">Repetiste la misma cantidad de pantallas. Cambia una.</p>}

      <button type="button" onClick={agregar} className="w-full rounded-xl border border-intenso text-intenso font-semibold py-2 text-sm">
        + Agregar otra opción de dispositivos
      </button>

      <div className="rounded-xl bg-white border border-neutral-200 p-3 text-sm space-y-2">
        <p className="text-xs text-neutral-500">Así lo verá el cliente</p>
        {filas.map((f) => {
          const vistos = meses.filter((m) => num(f.precios[m]) !== null);
          return (
            <div key={f.id}>
              <p className="font-semibold text-marino">{f.pant} {f.pant === 1 ? "pantalla" : "pantallas"}</p>
              {vistos.length === 0 ? (
                <p className="text-xs text-neutral-500">Escribe al menos un precio.</p>
              ) : (
                <p className="text-xs text-neutral-600">
                  {vistos.map((m) => `${etq(m)}: Bs ${num(f.precios[m]).toFixed(2)}`).join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
