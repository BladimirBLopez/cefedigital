import Decimal from "decimal.js";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerCambioUsdBs } from "@/lib/bcb";
import { obtenerCatalogoCentralOne } from "@/lib/central-one";

function diasDesdeFecha(fecha) {
  const m = String(fecha || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return Infinity;

  const anterior = Date.UTC(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1])
  );

  return Math.max(0, Math.floor((Date.now() - anterior) / 86400000));
}

function validarTarget(p) {
  const fields = Array.isArray(p.target_fields)
    ? p.target_fields
    : [];

  const schema = Array.isArray(p.target_schema)
    ? p.target_schema
    : [];

  if (p.requires_target === true) {
    if (!fields.length || schema.length !== fields.length) {
      throw new Error(`Campos dinámicos incompletos: ${p.sku}`);
    }

    const keys = schema.map(x => String(x?.key || ""));

    if (
      keys.some(x => !x) ||
      new Set(keys).size !== keys.length ||
      fields.some(x => !keys.includes(String(x)))
    ) {
      throw new Error(`Esquema de jugador inválido: ${p.sku}`);
    }

    for (const campo of schema) {
      if (!campo.label || !["text", "select"].includes(campo.type)) {
        throw new Error(`Campo no reconocido en ${p.sku}: clave=${campo.key}, tipo=${campo.type}, etiqueta=${campo.label ? "si" : "no"}`);
      }

      if (
        campo.type === "select" &&
        (!Array.isArray(campo.options) || !campo.options.length)
      ) {
        throw new Error(`Opciones de servidor incompletas: ${p.sku}`);
      }
    }
  } else if (fields.length || schema.length) {
    throw new Error(`Datos de jugador inesperados: ${p.sku}`);
  }

  return { fields, schema };
}

function prepararProducto(p, tasa, margenes) {
  const id = String(p.product_id || "").trim();
  const sku = String(p.sku || "").trim();
  const nombre = String(p.display_name || p.name || "").trim();
  const productType = String(p.product_type || "").toLowerCase();
  const currency = String(p.currency || "").toUpperCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    !sku || !nombre || currency !== "USD"
  ) {
    throw new Error("Producto Central One con identificación o moneda inválida.");
  }

  const tipos = {
    game_topup: "recarga",
    gift_card: "clave",
    account: "cuenta",
    subscription: "cuenta"
  };

  const tipo = tipos[productType];

  if (!tipo) {
    throw new Error(`Tipo de producto no reconocido: ${productType}`);
  }

  const precioUsd = new Decimal(String(p.reseller_price || ""));

  if (!precioUsd.isFinite() || precioUsd.lte(0)) {
    throw new Error(`Precio USD inválido: ${sku}`);
  }

  const { fields, schema } = validarTarget(p);

  const margen = new Decimal(String(margenes.get(id) ?? "20"));

  if (!margen.isFinite() || margen.lt(0) || margen.gte(100)) {
    throw new Error(`Margen inválido: ${sku}`);
  }

  const costoBs = precioUsd.mul(tasa).toDecimalPlaces(
    4,
    Decimal.ROUND_HALF_UP
  );

  const divisor = new Decimal(100).minus(margen).div(100);

  const precioSugerido = costoBs.div(divisor).toDecimalPlaces(
    2,
    Decimal.ROUND_CEIL
  );

  const stock = p.available_stock == null
    ? null
    : Number(p.available_stock);

  if (
    stock !== null &&
    (!Number.isInteger(stock) || stock < 0)
  ) {
    throw new Error(`Inventario inválido: ${sku}`);
  }

  const disponible =
    p.status === "active" &&
    p.in_stock === true &&
    (stock === null || stock > 0);

  const fechaPrecio = p.price_updated_at &&
    !Number.isNaN(Date.parse(p.price_updated_at))
      ? new Date(p.price_updated_at).toISOString()
      : null;

  return {
    proveedor_producto_id: id,
    proveedor_codigo: sku,
    nombre,
    tipo,
    costo_usd: precioUsd.toFixed(4),
    costo_bs: costoBs.toFixed(4),
    tipo_cambio: tasa.toFixed(8),
    margen: margen.toFixed(2),
    precio_sugerido: precioSugerido.toFixed(2),
    disponible,
    stock,
    slug: `co-${id.toLowerCase()}`,
    product_type: productType,
    category_provider: String(p.category || ""),
    market: String(p.market || ""),
    region: String(p.region || ""),
    family_id: String(p.product_family_id || ""),
    family_name: String(p.product_family_name || ""),
    currency,
    requires_target: p.requires_target === true,
    target_fields: fields,
    target_schema: schema,
    available_stock: stock,
    price_updated_at: fechaPrecio
  };
}

async function guardarLote(lote) {
  const json = JSON.stringify(lote);

  await sql`
    with datos as (
      select *
      from jsonb_to_recordset(${json}::jsonb) as x(
        proveedor_producto_id text,
        proveedor_codigo text,
        nombre text,
        tipo text,
        costo_usd numeric,
        costo_bs numeric,
        tipo_cambio numeric,
        margen numeric,
        precio_sugerido numeric,
        disponible boolean,
        stock integer,
        slug text,
        product_type text,
        category_provider text,
        market text,
        region text,
        family_id text,
        family_name text,
        currency text,
        requires_target boolean,
        target_fields jsonb,
        target_schema jsonb,
        available_stock integer,
        price_updated_at timestamptz
      )
    ),
    upsert as (
      insert into productos (
        nombre, slug, categoria, precio, tipo, activo,
        proveedor, proveedor_producto_id, proveedor_codigo,
        costo_proveedor_usd, costo_proveedor_bs_central_one,
        tipo_cambio_usd_bs, margen_porcentaje, precio_sugerido,
        precio_manual, proveedor_disponible, stock_proveedor,
        central_one_product_type, central_one_category,
        central_one_market, central_one_region,
        central_one_family_id, central_one_family_name,
        central_one_currency, central_one_requires_target,
        central_one_target_fields, central_one_target_schema,
        central_one_available_stock, central_one_price_updated_at,
        sincronizado_proveedor_en
      )
      select
        d.nombre, d.slug, 'Games', d.precio_sugerido,
        d.tipo, false, 'central_one',
        d.proveedor_producto_id, d.proveedor_codigo,
        d.costo_usd, d.costo_bs, d.tipo_cambio,
        d.margen, d.precio_sugerido, false,
        d.disponible, d.stock,
        d.product_type, d.category_provider,
        d.market, d.region, d.family_id, d.family_name,
        d.currency, d.requires_target,
        d.target_fields, d.target_schema,
        d.available_stock, d.price_updated_at, now()
      from datos d

      on conflict (proveedor, proveedor_producto_id)
      where proveedor is not null
        and proveedor_producto_id is not null

      do update set
        nombre = excluded.nombre,
        slug = excluded.slug,
        categoria = 'Games',
        tipo = case
          when productos.tipo_manual then productos.tipo
          else excluded.tipo
        end,
        proveedor_codigo = excluded.proveedor_codigo,
        costo_proveedor_usd = excluded.costo_proveedor_usd,
        costo_proveedor_bs_central_one = excluded.costo_proveedor_bs_central_one,
        tipo_cambio_usd_bs = excluded.tipo_cambio_usd_bs,
        margen_porcentaje = excluded.margen_porcentaje,
        precio_sugerido = excluded.precio_sugerido,
        precio = case
          when productos.precio_manual then productos.precio
          else excluded.precio_sugerido
        end,
        proveedor_disponible = excluded.proveedor_disponible,
        stock_proveedor = excluded.stock_proveedor,
        central_one_product_type = excluded.central_one_product_type,
        central_one_category = excluded.central_one_category,
        central_one_market = excluded.central_one_market,
        central_one_region = excluded.central_one_region,
        central_one_family_id = excluded.central_one_family_id,
        central_one_family_name = excluded.central_one_family_name,
        central_one_currency = excluded.central_one_currency,
        central_one_requires_target = excluded.central_one_requires_target,
        central_one_target_fields = excluded.central_one_target_fields,
        central_one_target_schema = excluded.central_one_target_schema,
        central_one_available_stock = excluded.central_one_available_stock,
        central_one_price_updated_at = excluded.central_one_price_updated_at,
        sincronizado_proveedor_en = now()

      returning id
    )
    select count(*)::int as total from upsert
  `;
}

export async function sincronizarCatalogoCentralOne() {
  await asegurarEsquema();

  const [catalogo, anteriores, margenesRows] = await Promise.all([
    obtenerCatalogoCentralOne(),
    sql`
      select tipo_cambio::text as tipo_cambio,
             fecha_cambio, fuente_tasa
      from proveedor_sync_estado
      where proveedor = 'central_one'
    `,
    sql`
      select proveedor_producto_id,
             margen_porcentaje::text as margen
      from productos
      where proveedor = 'central_one'
    `
  ]);

  const productos = catalogo?.items;

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new Error("Catálogo Central One vacío. No se modificaron productos.");
  }

  const previo = anteriores[0];
  let cambio;
  let tasaRespaldo = false;

  try {
    cambio = await obtenerCambioUsdBs();
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

  const tasa = new Decimal(String(cambio.tasa));

  if (!tasa.isFinite() || tasa.lte(0)) {
    throw new Error("Tipo de cambio USD inválido.");
  }

  const margenes = new Map(
    margenesRows.map(x => [
      String(x.proveedor_producto_id),
      x.margen
    ])
  );

  const vistos = new Set();
  const omitidos = [];
  const filas = [];

  for (const p of productos) {
    let fila;

    try {
      fila = prepararProducto(p, tasa, margenes);
    } catch (e) {
      omitidos.push(String(e?.message || "producto inválido").slice(0, 160));
      console.warn("Central One producto omitido:", e?.message || "");
      continue;
    }

    if (vistos.has(fila.proveedor_producto_id)) continue;

    vistos.add(fila.proveedor_producto_id);
    filas.push(fila);
  }

  if (omitidos.length > Math.max(5, Math.floor(productos.length * 0.2))) {
    throw new Error("Demasiados productos inválidos (" + omitidos.length + "): " + omitidos[0]);
  }

  if (!filas.length) {
    throw new Error("No existen productos válidos para importar.");
  }

  const [antes] = await sql`
    select count(*)::int as total
    from productos
    where proveedor = 'central_one'
  `;

  for (let i = 0; i < filas.length; i += 500) {
    await guardarLote(filas.slice(i, i + 500));
  }

  const ids = JSON.stringify(
    filas.map(x => x.proveedor_producto_id)
  );

  await sql`
    update productos p
    set proveedor_disponible = false,
        stock_proveedor = 0,
        central_one_available_stock = 0,
        sincronizado_proveedor_en = now()
    where p.proveedor = 'central_one'
      and not exists (
        select 1
        from jsonb_array_elements_text(${ids}::jsonb) as x(id)
        where x.id = p.proveedor_producto_id
      )
  `;

  const [despues] = await sql`
    select count(*)::int as total
    from productos
    where proveedor = 'central_one'
  `;

  const nuevos = Math.max(
    0,
    Number(despues.total) - Number(antes.total)
  );

  const actualizados = Math.max(0, filas.length - nuevos);

  await sql`
    insert into proveedor_sync_estado (
      proveedor, tipo_cambio, fecha_cambio, fuente_tasa,
      sincronizado_en, total_productos, nuevos, actualizados, error
    )
    values (
      'central_one', ${tasa.toFixed(8)}, ${cambio.fecha},
      ${cambio.fuente}, now(), ${filas.length},
      ${nuevos}, ${actualizados}, null
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
    tipoCambio: tasa.toFixed(8),
    fechaCambio: cambio.fecha,
    tasaRespaldo,
    omitidos: omitidos.length,
    omitidosDetalle: omitidos.slice(0, 3).join(" | ")
  };
}
