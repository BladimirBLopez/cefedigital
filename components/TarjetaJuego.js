import Link from "next/link";
import { optimizar } from "@/lib/imagen";

export default function TarjetaJuego({ j }) {
  const precio = Number(j.precio);
  const tienePrecio = Number.isFinite(precio) && precio > 0;
  const inicial = String(j.nombre || "?").trim().charAt(0).toUpperCase();
  const n = Number(j.paquetes) || 0;

  return (
    <Link
      href={`/juego/${encodeURIComponent(j.id)}`}
      aria-label={`Ver paquetes de ${j.nombre}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-intenso/25 bg-marino shadow-md transition-all duration-200 hover:border-electrico hover:shadow-lg"
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-white">
        {j.imagen ? (
          <img
            src={optimizar(j.imagen, 480)}
            alt={j.nombre}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="text-5xl font-extrabold text-intenso">{inicial}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
        <p className="mb-1 truncate text-xs font-medium text-white/70">
          {j.categoria === "gift_card" ? "Tarjeta de regalo" : "Recarga de juego"}
        </p>
        <p className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-white">
          {j.nombre}
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-0.5 text-xs text-white/70">
              {n} {n === 1 ? "paquete" : "paquetes"} · Desde
            </p>
            <p className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-cian sm:text-lg">
              {tienePrecio ? "Bs " + precio.toFixed(2) : "Consultar precio"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
