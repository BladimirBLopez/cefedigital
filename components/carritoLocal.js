export const CLAVE = "cefe_carrito_v2";

const CLAVES_ANTERIORES = ["cefe_carrito"];

function eliminarCarritosAnteriores() {
  try {
    for (const clave of CLAVES_ANTERIORES) {
      localStorage.removeItem(clave);
    }
  } catch {}
}

export function leerCarrito() {
  try {
    eliminarCarritosAnteriores();

    const v = JSON.parse(localStorage.getItem(CLAVE) || "[]");

    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function guardarCarrito(items) {
  try {
    eliminarCarritosAnteriores();
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {}

  window.dispatchEvent(new Event("carrito:cambio"));
}
