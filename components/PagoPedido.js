"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCopy, FiCheck, FiDownload, FiMessageCircle, FiClock } from "react-icons/fi";

const TARDA_MS = 6 * 60 * 1000;
const TOPE_MS = 20 * 60 * 1000;

export default function PagoPedido({ codigo, total, whatsapp, titular, instrucciones, avisado }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [sinQr, setSinQr] = useState(false);
  const [desde, setDesde] = useState(0);
  const [ahora, setAhora] = useState(0);
  const desdeRef = useRef(0);
  desdeRef.current = desde;
  const monto = Number(total).toFixed(2);
  const clave = `verif-${codigo}`;

  useEffect(() => {
    let v = 0;
    try {
      v = Number(sessionStorage.getItem(clave)) || 0;
    } catch {}
    if (!v && avisado) {
      v = Date.now();
      try {
        sessionStorage.setItem(clave, String(v));
      } catch {}
    }
    if (v && Date.now() - v < TOPE_MS) setDesde(v);
    setAhora(Date.now());
  }, [clave, avisado]);

  useEffect(() => {
    let oculto = 0;
    const alCambiar = () => {
      if (document.visibilityState === "hidden") {
        oculto = Date.now();
        return;
      }
      if (oculto && Date.now() - oculto > 4000) {
        const t = Date.now();
        setDesde((d) => d || t);
        try {
          if (!sessionStorage.getItem(clave)) sessionStorage.setItem(clave, String(t));
        } catch {}
      }
      oculto = 0;
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, [clave]);

  useEffect(() => {
    const inicio = Date.now();
    let t;
    const vuelta = () => {
      if (Date.now() - inicio > TOPE_MS) return;
      if (document.visibilityState === "visible") {
        router.refresh();
        setAhora(Date.now());
      }
      t = setTimeout(vuelta, desdeRef.current ? 4000 : 10000);
    };
    t = setTimeout(vuelta, 4000);
    return () => clearTimeout(t);
  }, [router]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(monto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  const verificando = desde > 0;
  const tarda = verificando && ahora - desde > TARDA_MS;

  const mensaje = encodeURIComponent(`Hola, ya pagué el pedido ${codigo} por Bs ${monto}. Te envío mi comprobante.`);
  const enlace = whatsapp ? `https://wa.me/${whatsapp}?text=${mensaje}` : "";

  const pasos = [
    "Abre tu app de pagos y escanea el QR",
    `Paga exactamente Bs ${monto}`,
    "Vuelve aquí: tu pago se confirma solo",
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-marino via-intenso to-electrico px-5 py-4 text-white">
        <p className="text-xs text-white/80">Total a pagar</p>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="text-3xl font-bold tracking-tight">Bs {monto}</p>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
          >
            {copiado ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar monto"}
          </button>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/80">
          {verificando ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Verificando tu pago…
            </>
          ) : (
            <>
              <FiClock className="h-3.5 w-3.5" /> Esperando tu pago · se confirma solo
            </>
          )}
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="mx-auto w-full max-w-[260px]">
          {!sinQr ? (
            <>
              <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
                <img src="/qr-pago.png" alt="Código QR para pagar" className="h-auto w-full" onError={() => setSinQr(true)} />
              </div>
              <a
                href="/qr-pago.png"
                download="qr-pago.png"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-intenso"
              >
                <FiDownload className="h-4 w-4" /> Descargar QR
              </a>
            </>
          ) : (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
              El QR no está disponible por ahora. Escríbenos por WhatsApp y te damos los datos.
            </p>
          )}
          {titular && (
            <p className="mt-2 text-center text-xs text-neutral-500">
              A nombre de <b className="text-marino">{titular}</b>
            </p>
          )}
        </div>

        <ol className="space-y-3 text-sm">
          {pasos.map((t, i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-intenso/10 text-xs font-bold text-intenso">
                {i + 1}
              </span>
              <span className="pt-0.5 text-neutral-700">{t}</span>
            </li>
          ))}
        </ol>

        {instrucciones && (
          <p className="whitespace-pre-line rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">{instrucciones}</p>
        )}

        {!verificando && (
          <div role="status" className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-sm font-semibold text-marino">Cuando pagues, aquí se confirma solo</p>
            <p className="mt-1 text-xs text-neutral-600">No tienes que tocar ningún botón. Puedes volver a esta pantalla después de pagar.</p>
          </div>
        )}

        {verificando && !tarda && (
          <div role="status" className="rounded-xl border border-esmeralda bg-esmeralda/10 p-4 text-center">
            <span className="mx-auto mb-2 block h-6 w-6 animate-spin rounded-full border-4 border-esmeralda/30 border-t-esmeralda" />
            <p className="text-sm font-semibold text-marino">Verificando tu pago…</p>
            <p className="mt-1 text-xs text-neutral-600">Normalmente toma de 1 a 5 minutos. No cierres esta pantalla.</p>
          </div>
        )}

        {tarda && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center">
            <p className="text-sm font-semibold text-marino">Aún no vemos tu pago</p>
            <p className="mt-1 text-xs text-neutral-600">Si ya pagaste, envíanos tu comprobante por WhatsApp y lo revisamos.</p>
          </div>
        )}

        {enlace && (
          <a
            href={enlace}
            className={
              "flex items-center justify-center gap-2 rounded-xl border border-esmeralda py-3 font-semibold text-marino transition " +
              (tarda ? "bg-esmeralda hover:brightness-95" : "bg-esmeralda/15 hover:bg-esmeralda/25")
            }
          >
            <FiMessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
