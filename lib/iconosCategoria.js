import { FiShield, FiGrid, FiTv, FiMusic, FiCpu, FiCamera, FiBook, FiBookOpen, FiPenTool, FiBriefcase, FiHeart, FiLock } from "react-icons/fi";

export function iconoCategoria(c) {
  const x = String(c || "").toLowerCase();
  if (x.includes("+18") || x.includes("contenido")) return FiLock;
  if (x.includes("stream") || (x.includes("video") && x.includes("entret"))) return FiTv;
  if (x.includes("music") || x.includes("músic") || (x.includes("audio") && !x.includes("libro"))) return FiMusic;
  if (x.includes("inteligencia")) return FiCpu;
  if (x.includes("foto")) return FiCamera;
  if (x.includes("libro")) return FiBookOpen;
  if (x.includes("educ") || x.includes("idioma")) return FiBook;
  if (x.includes("vpn") || x.includes("antivirus") || x.includes("segur")) return FiShield;
  if (x.includes("dise")) return FiPenTool;
  if (x.includes("product") || x.includes("negocio")) return FiBriefcase;
  if (x.includes("bienestar") || x.includes("fitness")) return FiHeart;
  return FiGrid;
}
