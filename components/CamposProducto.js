"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export default function CamposProducto({ tipo = "clave", campoCliente = "", duracion = "", conPlan = false }) {
  const [t, setT] = useState(tipo || "clave");
  const [pant, setPant] = useState(1);
  const [pag, setPag] = useState(1);
  const [gra, setGra] = useState(0);
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  return (
    <>
      <label className="block text-xs text-neutral-500">
        ¿Qué vendes?
        <select name="tipo" value={t} onChange={(e) => setT(e.target.value)} className={campo + " mt-1"}>
          <option value="clave">Clave o licencia (Windows, Office, antivirus)</option>
          <option value="cuenta">Cuenta de streaming (Netflix, Disney, Spotify)</option>
          <option value="recarga">Recarga de juego (Free Fire, el cliente pone su ID)</option>
        </select>
      </label>
      {t === "cuenta" && !conPlan && (
        <label className="block text-xs text-neutral-500">
          Duración del servicio en días
          <input name="duracion_dias" inputMode="numeric" defaultValue={duracion || ""} placeholder="30" className={campo + " mt-1"} />
          <span className="block mt-1">Con esto el panel te avisa cuándo vence cada cuenta.</span>
        </label>
      )}
      {t === "recarga" && (
        <label className="block text-xs text-neutral-500">
          ¿Qué dato le pides al cliente?
          <input name="campo_cliente" defaultValue={campoCliente || ""} placeholder="Tu ID de jugador" className={campo + " mt-1"} />
          <span className="block mt-1">Le aparece en el formulario cuando hace su pedido.</span>
        </label>
      )}

      {conPlan && t === "cuenta" && (
        <div className="space-y-3 rounded-xl border border-esmeralda p-3">
          <p className="text-sm font-semibold text-marino">Primer plan de esta cuenta</p>
          <label className="block text-xs text-neutral-500">
            Dispositivos o pantallas
            <select name="pantallas" value={pant} onChange={(e) => setPant(Number(e.target.value))} className={campo + " mt-1"}>
              {rango(1, 10).map((n) => <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-neutral-500">
              Duración (meses que paga)
              <select name="meses_pagados" value={pag} onChange={(e) => setPag(Number(e.target.value))} className={campo + " mt-1"}>
                {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24, 36].map((n) => <option key={n} value={n}>{n} {n === 1 ? "mes" : "meses"}</option>)}
              </select>
            </label>
            <label className="block text-xs text-neutral-500">
              Meses de regalo
              <select name="meses_gratis" value={gra} onChange={(e) => setGra(Number(e.target.value))} className={campo + " mt-1"}>
                {rango(0, 12).map((n) => <option key={n} value={n}>{n === 0 ? "Ninguno" : `${n} ${n === 1 ? "mes" : "meses"}`}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-neutral-500">
            Lo que te cuesta (Bs, opcional)
            <input name="plan_costo" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="20" className={campo + " mt-1"} />
          </label>
        </div>
      )}
      {conPlan && (
        <label className="block text-xs text-neutral-500">
          {t === "cuenta" ? "Precio al cliente por este plan (Bs)" : "Precio en Bs"}
          <input name="precio" required inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio en Bs" className={campo + " mt-1"} />
        </label>
      )}
      {conPlan && t === "cuenta" && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm">
          <p className="font-semibold text-marino">{pant} {pant === 1 ? "pantalla" : "pantallas"} · {pag + gra} {pag + gra === 1 ? "mes" : "meses"} de servicio</p>
          <p className="text-xs text-neutral-500">Vence a los {(pag + gra) * 30} días de entregar.</p>
          {precio !== "" && Number.isFinite(Number(String(precio).replace(",", "."))) && (
            <p className="text-lg font-bold text-intenso mt-1">Total: Bs {Number(String(precio).replace(",", ".")).toFixed(2)}</p>
          )}
          {precio !== "" && costo !== "" && Number.isFinite(Number(String(precio).replace(",", "."))) && Number.isFinite(Number(String(costo).replace(",", "."))) && (
            <p className="text-xs text-neutral-500">Ganancia: Bs {(Number(String(precio).replace(",", ".")) - Number(String(costo).replace(",", "."))).toFixed(2)}</p>
          )}
        </div>
      )}
    </>
  );
}
