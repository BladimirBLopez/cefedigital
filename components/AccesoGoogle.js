"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { FiLogOut, FiUser, FiX } from "react-icons/fi";
import { createAuthClient } from "better-auth/react";

const cliente = createAuthClient();

export default function AccesoGoogle() {
  const { data, isPending } = cliente.useSession();
  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState("");
  const caja = useRef(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [menu]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
        setError("");
        setCargando(false);
      }
    };
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    setError("");
    setCargando(false);
  }

  async function entrar() {
    setCargando(true);
    setError("");
    try {
      const r = await cliente.signIn.social({
        provider: "google",
        callbackURL: window.location.pathname + window.location.search,
      });
      if (r && r.error) throw new Error("fallo");
    } catch {
      setError("No se pudo conectar con Google. Intenta de nuevo.");
      setCargando(false);
    }
  }

  async function salir() {
    setSaliendo(true);
    try {
      await cliente.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } });
    } catch {
      setSaliendo(false);
    }
  }

  if (isPending) {
    return (
      <div data-acceso="v2">
        <span className="block h-9 w-9 animate-pulse rounded-full bg-neutral-100 sm:w-20" aria-hidden="true" />
      </div>
    );
  }

  if (!data?.user) {
    const modal = (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-marino/60 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={cerrar}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="acceso-titulo"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-8 shadow-2xl sm:rounded-3xl sm:pb-6"
        >
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <FiX className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-intenso/10 text-intenso">
            <FiUser className="h-6 w-6" />
          </div>
          <h2 id="acceso-titulo" className="text-center text-xl font-semibold text-marino">
            Entra a tu cuenta
          </h2>
          <p className="mt-1 text-center text-sm text-neutral-500">
            Usa tu cuenta de Google. Sin contraseñas ni formularios.
          </p>
          <button
            type="button"
            onClick={entrar}
            disabled={cargando}
            autoFocus
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-intenso hover:bg-neutral-50 disabled:opacity-60"
          >
            <FcGoogle className="h-5 w-5" />
            {cargando ? "Conectando con Google…" : "Continuar con Google"}
          </button>
          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            o
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-marino hover:bg-neutral-100"
          >
            Seguir sin cuenta
          </button>
          <p className="mt-2 text-center text-xs text-neutral-400">No necesitas cuenta para comprar.</p>
        </div>
      </div>
    );

    return (
      <div data-acceso="v2">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Entrar"
          className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-full bg-intenso text-sm font-semibold text-white transition hover:bg-marino sm:w-auto sm:px-4"
        >
          <FiUser className="h-4 w-4" />
          <span className="hidden sm:inline">Entrar</span>
        </button>
        {montado && abierto && createPortal(modal, document.body)}
      </div>
    );
  }

  const u = data.user;
  const inicial = String(u.name || u.email || "?").trim().charAt(0).toUpperCase();
  const foto = u.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={u.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
  ) : (
    inicial
  );

  return (
    <div ref={caja} className="relative" data-acceso="v2">
      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        aria-label="Mi cuenta"
        aria-expanded={menu}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-intenso text-sm font-semibold text-white ring-2 ring-white"
      >
        {foto}
      </button>
      {menu && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-intenso text-sm font-semibold text-white">
              {foto}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-marino">{u.name}</p>
              <p className="truncate text-xs text-neutral-500">{u.email}</p>
            </div>
          </div>
          <div className="my-3 h-px bg-neutral-100" />
          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
          >
            <FiLogOut className="h-4 w-4" />
            {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
