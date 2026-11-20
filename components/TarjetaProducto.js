import Link from "next/link";
import { optimizar } from "@/lib/imagen";
import { iconoCategoria } from "@/lib/iconosCategoria";

export default function TarjetaProducto({ p, fila = false }) {
  const I = iconoCategoria(p.categoria);
  return (
    <Link
      href={`/producto/${p.slug}`}
      className={
        "group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg " +
        (fila ? "w-40 shrink-0 snap-start" : "")
      }
    >
      {p.imagen_url ? (
        <img src={optimizar(p.imagen_url, 500)} alt={p.nombre} loading="lazy" className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-intenso/10 to-turquesa/20">
          <I className="h-10 w-10 text-intenso/40" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-marino">{p.nombre}</p>
        <p className="mt-auto pt-2 text-base font-bold text-intenso">
          {p.con_planes && <span className="text-[11px] font-medium text-neutral-500">Desde </span>}
          Bs {Number(p.precio).toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
