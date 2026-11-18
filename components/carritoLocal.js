export const CLAVE = "cefe_carrito";

export function leerCarrito() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function guardarCarrito(items) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event("carrito:cambio"));
}
