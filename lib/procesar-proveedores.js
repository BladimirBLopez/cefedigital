import { procesarComprasStreamZone } from "@/lib/comprar-streamzone";
import { procesarComprasCentralOne } from "@/lib/comprar-central-one";

export async function procesarComprasProveedores(pedidoId, opciones = {}) {
  const resultado = {};
  let primerError = null;

  try {
    resultado.streamzone = await procesarComprasStreamZone(pedidoId);
  } catch (error) {
    primerError = primerError || error;
  }

  try {
    resultado.central_one = await procesarComprasCentralOne(pedidoId, opciones);
  } catch (error) {
    console.error("Procesamiento Central One:", error?.message || "");
    primerError = primerError || error;
  }

  if (primerError) throw primerError;

  return resultado;
}
