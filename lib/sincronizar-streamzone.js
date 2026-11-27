import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerCatalogoStreamZone } from "@/lib/streamzone";
import { obtenerCambioCopBs } from "@/lib/bcb";

function redondearVenta(n) {
  return Math.ceil((n - 0.000000001) * 100) / 100;
}

function diasDesdeFecha(fecha) {
  const m = String(fecha || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return Infinity;

  const anterior = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Math.max(0, Math.floor((Date.now() - anterior) / 86400000));
}

export async function sincronizarCatalogoStreamZone() {
  await asegurarEsquema();

  const [catalogo, anteriores] = await Promise.all([
    obtenerCatalogoStreamZone(),
    sql`
      select tipo_cambio::float as tipo_cambio,
             fecha_cambio, fuente_tasa
      from proveedor_sync_estado
      where proveedor = 'streamzone'
    `
  ]);

  if (!catalogo.ok) {
    throw new Error(catalogo.error || "No se pudo consultar StreamZone.");
  }

  const productos = catalogo.payload?.products;
  const totalDeclarado = Number(catalogo.payload?.total);

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new Error("Catálogo vacío. No se modificaron los productos existentes.");
  }

  const previo = anteriores[0];
  let cambio;
  let tasaRespaldo = false;

  try {
    cambio = await obtenerCambioCopBs();
  } catch (error) {
    if (
      !previo ||
      !Number.isFinite(Number(previo.tipo_cambio)) ||
      Number(previo.tipo_cambio) <= 0 ||
      diasDesdeFecha(previo.fecha_cambio) > 7
    ) {
      throw error;
    }

    cambio = {
      tasa: Number(previo.tipo_cambio),
      fecha: previo.fecha_cambio,
      fuente: previo.fuente_tasa || "Última cotización BCB guardada"
    };
    tasaRespaldo = true;
  }

  if (
    Number.isFinite(totalDeclarado) &&
    totalDeclarado > productos.length
  ) {
    throw new Error("StreamZone devolvió un catálogo incompleto.");
  }

  const tasa = Number(cambio.tasa);
  const vistos = new Set();
  const filas = [];

  for (const p of productos) {
    const id = String(p.id || p.code || "").trim();
    const nombre = String(p.name || "").trim();
    const costoCOP = Number(p.priceCOP);

    if (
      !id ||
      !nombre ||
      !Number.isFinite(costoCOP) ||
      costoCOP <= 0
    ) {
      throw new Error("Un producto del proveedor contiene datos inválidos.");
    }

    if (vistos.has(id)) continue;
    vistos.add(id);

    const stockNumero =
      p.stockAvailable == null || p.stockAvailable === ""
        ? null
        : Number(p.stockAvailable);

    const stock = Number.isFinite(stockNumero)
      ? Math.max(0, Math.floor(stockNumero))
      : null;

    const disponible =
      p.inStock === true
        ? stock === null || stock > 0
        : p.inStock === false
          ? false
          : stock !== null && stock > 0;

    const costoBs = Number((costoCOP * tasa).toFixed(4));
    const precioSugerido = redondearVenta(costoBs / 0.80);

    const idSlug = id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32) || "producto";
    const idHash = createHash("sha256").update(id).digest("hex").slice(0, 12);
    const duracion = Number(p.durationDays);

    filas.push({
      proveedor_producto_id: id,
      proveedor_codigo: String(p.code || "").trim() || null,
      nombre,
      categoria: String(p.category || "").trim() || "Sin categoría",
      tipo: Number.isInteger(duracion) && duracion > 0 ? "cuenta" : "clave",
      duracion_dias:
        Number.isInteger(duracion) && duracion > 0 ? duracion : null,
      costo_cop: costoCOP,
      costo_bs: costoBs,
      tipo_cambio: tasa,
      margen: 20,
      precio_sugerido: precioSugerido,
      disponible,
      stock,
      slug: `sz-${idSlug}-${idHash}`
    });
  }

  if (!filas.length) {
    throw new Error("No hay productos válidos para importar.");
  }

  const [antes] = await sql`
    select count(*)::int as total
    from productos
    where proveedor = 'streamzone'
  `;

  const json = JSON.stringify(filas);

  await sql`
    with datos as (
      select *
      from jsonb_to_recordset(${json}::jsonb) as x(
        proveedor_producto_id text,
        proveedor_codigo text,
        nombre text,
        categoria text,
        tipo text,
        duracion_dias integer,
        costo_cop numeric,
        costo_bs numeric,
        tipo_cambio numeric,
        margen numeric,
        precio_sugerido numeric,
        disponible boolean,
        stock integer,
        slug text
      )
    ),
    upsert as (
      insert into productos (
        nombre, slug, descripcion, categoria, precio, tipo,
        duracion_dias, activo, proveedor, proveedor_producto_id,
        proveedor_codigo, costo_proveedor_cop, costo_proveedor_bs,
        tipo_cambio_cop_bs, margen_porcentaje, precio_sugerido,
        precio_manual, proveedor_disponible, stock_proveedor,
        sincronizado_proveedor_en
      )
      select
        d.nombre, d.slug, null, d.categoria, d.precio_sugerido,
        d.tipo, d.duracion_dias, true, 'streamzone',
        d.proveedor_producto_id, d.proveedor_codigo,
        d.costo_cop, d.costo_bs, d.tipo_cambio,
        d.margen, d.precio_sugerido, false,
        d.disponible, d.stock, now()
      from datos d

      on conflict (proveedor, proveedor_producto_id)
      where proveedor is not null
        and proveedor_producto_id is not null

      do update set
        nombre = excluded.nombre,
        categoria = excluded.categoria,
        tipo = case when productos.tipo_manual then productos.tipo else excluded.tipo end,
        duracion_dias = case when productos.tipo_manual then productos.duracion_dias else excluded.duracion_dias end,
        proveedor_codigo = excluded.proveedor_codigo,
        costo_proveedor_cop = excluded.costo_proveedor_cop,
        costo_proveedor_bs = excluded.costo_proveedor_bs,
        tipo_cambio_cop_bs = excluded.tipo_cambio_cop_bs,
        margen_porcentaje = excluded.margen_porcentaje,
        precio_sugerido = excluded.precio_sugerido,
        precio = case
          when productos.precio_manual then productos.precio
          else excluded.precio_sugerido
        end,
        proveedor_disponible = excluded.proveedor_disponible,
        stock_proveedor = excluded.stock_proveedor,
        sincronizado_proveedor_en = now()

      returning id
    )
    select count(*)::int as total from upsert
  `;

  const ids = JSON.stringify(filas.map(p => p.proveedor_producto_id));

  await sql`
    update productos p
    set proveedor_disponible = false,
        stock_proveedor = 0,
        sincronizado_proveedor_en = now()
    where p.proveedor = 'streamzone'
      and not exists (
        select 1
        from jsonb_array_elements_text(${ids}::jsonb) as x(id)
        where x.id = p.proveedor_producto_id
      )
  `;

  const [despues] = await sql`
    select count(*)::int as total
    from productos
    where proveedor = 'streamzone'
  `;

  const nuevos = Math.max(0, Number(despues.total) - Number(antes.total));
  const actualizados = Math.max(0, filas.length - nuevos);

  await sql`
    insert into proveedor_sync_estado (
      proveedor, tipo_cambio, fecha_cambio, fuente_tasa,
      sincronizado_en, total_productos, nuevos, actualizados, error
    )
    values (
      'streamzone', ${tasa}, ${cambio.fecha}, ${cambio.fuente},
      now(), ${filas.length}, ${nuevos}, ${actualizados}, null
    )
    on conflict (proveedor) do update set
      tipo_cambio = excluded.tipo_cambio,
      fecha_cambio = excluded.fecha_cambio,
      fuente_tasa = excluded.fuente_tasa,
      sincronizado_en = now(),
      total_productos = excluded.total_productos,
      nuevos = excluded.nuevos,
      actualizados = excluded.actualizados,
      error = null
  `;

  return {
    total: filas.length,
    nuevos,
    actualizados,
    tasa,
    fecha: cambio.fecha,
    tasaRespaldo
  };
}
