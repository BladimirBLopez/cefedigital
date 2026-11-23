import Link from "next/link";
import { optimizar } from "@/lib/imagen";
import { iconoCategoria } from "@/lib/iconosCategoria";
import AccionTarjeta from "./AccionTarjeta";

export default function TarjetaProducto({ p }) {
  const Icono = iconoCategoria(p.categoria);
  const precio = Number(p.precio);

  const tienePrecio =
    p.precio !== null &&
    p.precio !== undefined &&
    Number.isFinite(precio);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#454545] bg-[#292929] shadow-sm transition hover:shadow-lg">

      <Link
        href={`/producto/${p.slug}`}
        aria-label={`Ver detalles de ${p.nombre}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-white"
      >
        {p.imagen_url ? (
          <img
            src={optimizar(p.imagen_url, 480)}
            alt={p.nombre}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-1.5 transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100">
            <Icono className="h-12 w-12 text-intenso" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {p.categoria && (
          <p className="mb-1 truncate text-[10px] text-neutral-400">
            {p.categoria}
          </p>
        )}

        <Link
          href={`/producto/${p.slug}`}
          className="line-clamp-2 min-h-[42px] text-[13px] font-medium leading-[21px] text-white hover:text-cian sm:text-sm"
        >
          {p.nombre}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="min-w-0">
            {p.con_planes && (
              <p className="mb-0.5 text-[10px] text-neutral-400">
                Desde
              </p>
            )}

            {tienePrecio ? (
              <p className="whitespace-nowrap text-[16px] font-extrabold tracking-tight text-[#39B9F8] sm:text-lg">
                Bs {precio.toFixed(2)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-[#39B9F8]">
                Consultar
              </p>
            )}
          </div>

          <AccionTarjeta p={p} />
        </div>
      </div>
    </article>
  );
}
