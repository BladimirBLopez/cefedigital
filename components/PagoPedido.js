"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiCopy, FiCheck, FiDownload, FiMessageCircle, FiClock } from "react-icons/fi";
import { avisarPago } from "@/app/pedido/acciones";

export default function PagoPedido({ codigo, total, whatsapp, titular, instrucciones, avisado }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [avisoListo, setAvisoListo] = useState(Boolean(avisado));
  const [sinQr, setSinQr] = useState(false);
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  const monto = Number(total).toFixed(2);

  useEffect(() => {
    let veces = 0;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      veces += 1;
      if (veces > 60) {
        clearInterval(t);
        return;
      }
      router.refresh();
    }, 10000);
    return () => clearInterval(t);
  }, [router]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(monto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  function yaPague() {
    setError("");
    iniciar(async () => {
      const r = await avisarPago(codigo);
      if (r && r.ok) setAvisoListo(true);
      else setError("No se pudo avisar. Escríbenos por WhatsApp con tu comprobante.");
    });
  }

  const mensaje = encodeURIComponent(`Hola, ya pagué el pedido ${codigo} por Bs ${monto}. Te envío mi comprobante.`);
  const enlace = whatsapp ? `https://wa.me/${whatsapp}?text=${mensaje}` : "";

  const pasos = [
    "Abre tu app de pagos y escanea el QR",
    `Paga exactamente Bs ${monto}`,
    "Toca «Ya pagué» para avisarnos",
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
          <FiClock className="h-3.5 w-3.5" /> Esperando tu pago · esta pantalla se actualiza sola
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

        {!avisoListo ? (
          <button
            type="button"
            onClick={yaPague}
            disabled={enviando}
            className="w-full rounded-xl bg-intenso py-3 font-semibold text-white transition hover:bg-marino disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Ya pagué"}
          </button>
        ) : (
          <div className="rounded-xl border border-esmeralda bg-esmeralda/10 p-4 text-center">
            <p className="text-sm font-semibold text-marino">Aviso enviado. Estamos verificando tu pago.</p>
            <p className="mt-1 text-xs text-neutral-600">Cuando se confirme, esta pantalla cambia sola.</p>
          </div>
        )}

        {enlace && (
          <a
            href={enlace}
            className="flex items-center justify-center gap-2 rounded-xl border border-esmeralda bg-esmeralda/15 py-3 font-semibold text-marino transition hover:bg-esmeralda/25"
          >
            <FiMessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
          </a>
        )}

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
