"use client";

import { useEffect, useRef, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { createAuthClient } from "better-auth/react";

const cliente = createAuthClient();

export default function AccesoGoogle() {
  const { data, isPending } = cliente.useSession();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  if (isPending) return <span className="inline-block h-9 w-9" aria-hidden="true" />;

  if (!data?.user) {
    return (
      <button
        type="button"
        onClick={() =>
          cliente.signIn.social({
            provider: "google",
            callbackURL: window.location.pathname + window.location.search,
          })
        }
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-marino transition hover:border-intenso"
      >
        <FaGoogle className="h-4 w-4" />
        <span className="hidden sm:inline">Ingresar con Google</span>
        <span className="sm:hidden">Ingresar</span>
      </button>
    );
  }

  const u = data.user;
  const inicial = String(u.name || u.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Mi cuenta"
        aria-expanded={abierto}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-intenso text-sm font-semibold text-white"
      >
        {u.image ? (
          <img src={u.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          inicial
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="truncate text-sm font-semibold text-marino">{u.name}</p>
          <p className="truncate text-xs text-neutral-500">{u.email}</p>
          <button
            type="button"
            onClick={() => cliente.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            <FiLogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
