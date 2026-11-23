import Link from "next/link";
import { optimizar } from "@/lib/imagen";
import { iconoCategoria } from "@/lib/iconosCategoria";
import { FiArrowRight } from "react-icons/fi";

export default function TarjetaProducto({ p, fila = false }) {
  const Icono = iconoCategoria(p.categoria);

  const precio = Number(p.precio);
  const tienePrecio =
    p.precio !== null &&
    p.precio !== undefined &&
    Number.isFinite(precio);

  return (
    <Link
      href={`/producto/${p.slug}`}
      aria-label={`Ver ${p.nombre}`}
      className={
        "group flex min-w-0 flex-col overflow-hidden " +
        "rounded-2xl border border-neutral-200 bg-white " +
        "shadow-sm transition duration-200 " +
        "hover:-translate-y-0.5 hover:border-intenso/30 " +
        "hover:shadow-md focus-visible:outline " +
        "focus-visible:outline-2 focus-visible:outline-intenso " +
        (fila
          ? "w-[170px] shrink-0 snap-start sm:w-[190px]"
          : "w-full")
      }
    >
      {/* IMAGEN DEL PRODUCTO */}
      <div
        className="relative flex aspect-[4/3] w-full
          items-center justify-center overflow-hidden
          border-b border-neutral-100 bg-neutral-50"
      >
        {p.imagen_url ? (
          <img
            src={optimizar(p.imagen_url, 480)}
            alt={p.nombre}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-2
              transition-transform duration-300
              group-hover:scale-105"
          />
        ) : (
          <Icono className="h-10 w-10 text-intenso/40" />
        )}
      </div>

      {/* INFORMACION */}
      <div className="flex flex-1 flex-col p-3">
        {/* CATEGORIA */}
        <p
          className="mb-1 truncate text-[10px]
            font-medium text-neutral-500"
        >
          {p.categoria || "Producto digital"}
        </p>

        {/* NOMBRE */}
        <h3
          className="line-clamp-2 min-h-[40px]
            text-[13px] font-bold leading-5 text-marino"
        >
          {p.nombre}
        </h3>

        {/* PRECIO */}
        <div className="mt-2">
          {p.con_planes && (
            <p className="text-[10px] font-medium text-neutral-500">
              Desde
            </p>
          )}

          {tienePrecio ? (
            <p
              className="text-lg font-extrabold
                tracking-tight text-intenso"
            >
              <span className="mr-1 text-xs font-semibold">
                Bs
              </span>
              {precio.toFixed(2)}
            </p>
          ) : (
            <p className="text-xs font-semibold text-intenso">
              Consultar precio
            </p>
          )}
        </div>

        {/* ACCION */}
        <div className="mt-auto pt-3">
          <span
            className="flex w-full items-center
              justify-center gap-2 rounded-xl
              bg-intenso px-2 py-2.5
              text-[11px] font-bold text-white
              transition group-hover:bg-marino"
          >
            {p.con_planes ? "Elegir plan" : "Ver producto"}
            <FiArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
