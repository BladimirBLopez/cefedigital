"use client";

import { useRef, useState } from "react";

async function reducir(file) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1000 / Math.max(img.width, img.height));
  const w = Math.round(img.width * k);
  const h = Math.round(img.height * k);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export default function SubirFoto({ actual }) {
  const ref = useRef(null);
  const [vista, setVista] = useState(actual || "");
  const [quitar, setQuitar] = useState(false);

  async function alElegir(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setQuitar(false);
    try {
      const p = await reducir(f);
      const dt = new DataTransfer();
      dt.items.add(p);
      ref.current.files = dt.files;
      setVista(URL.createObjectURL(p));
    } catch {
      setVista(URL.createObjectURL(f));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center text-xs text-neutral-400">
        {vista ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista} alt="" className="h-full w-full object-contain" />
        ) : (
          "Sin foto"
        )}
      </div>
      <label className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-marino">
        {vista ? "Cambiar foto" : "Subir foto"}
        <input ref={ref} type="file" name="foto" accept="image/*" onChange={alElegir} className="hidden" />
      </label>
      {vista && (
        <button type="button" onClick={() => { setVista(""); setQuitar(true); if (ref.current) ref.current.value = ""; }} className="text-sm text-red-600">Quitar</button>
      )}
      <input type="hidden" name="quitar_foto" value={quitar ? "1" : ""} />
    </div>
  );
}
