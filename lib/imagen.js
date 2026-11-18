export function optimizar(url, ancho = 600) {
  try {
    const u = String(url || "");
    if (!u.includes("res.cloudinary.com") || !u.includes("/image/upload/")) return u;
    if (/\/image\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(u)) return u;
    return u.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${ancho},c_limit/`);
  } catch {
    return url;
  }
}
