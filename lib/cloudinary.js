import { createHash } from "crypto";

export async function subirFoto(file) {
  if (!file || typeof file === "string" || !file.size) return null;
  if (file.size > 4 * 1024 * 1024) throw new Error("grande");
  const cloud = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "cefedigital";
  const firma = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest("hex");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", key);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("signature", firma);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const j = await r.json();
  if (!r.ok || !j.secure_url) throw new Error(j?.error?.message || "cloudinary");
  return j.secure_url;
}
