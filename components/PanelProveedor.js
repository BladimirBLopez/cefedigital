export function EncabezadoProveedor({ nombre, descripcion, accion, etiquetaAccion }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-intenso">
          Proveedor externo
        </p>
        <h1 className="text-2xl font-bold text-marino">{nombre}</h1>
        <p className="mt-1 text-sm text-neutral-500">{descripcion}</p>
      </div>

      <form action={accion}>
        <button className="rounded-xl bg-intenso px-4 py-3 text-sm font-semibold text-white hover:bg-marino">
          {etiquetaAccion}
        </button>
      </form>
    </div>
  );
}

export function Aviso({ tipo = "ok", children }) {
  const estilo =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={"rounded-xl border p-3 text-sm " + estilo}>{children}</div>
  );
}

export function Tarjeta({ titulo, derecha, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-marino">{titulo}</h2>
        {derecha ? <span className="text-xs text-neutral-500">{derecha}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function EstadoVariables({ variables }) {
  return (
    <Tarjeta titulo="Variables">
      <ul className="space-y-1 text-sm text-neutral-600">
        {variables.map(({ nombre, estado }) => (
          <li key={nombre}>
            {nombre}:{" "}
            {estado === "ok"
              ? "✔ Configurada"
              : estado === "formato"
              ? "⚠ Formato incorrecto"
              : "✘ Falta"}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
