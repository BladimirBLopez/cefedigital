"use client";

import { useEffect } from "react";
import { guardarCarrito } from "./carritoLocal";

export default function VaciarCarrito() {
  useEffect(() => {
    guardarCarrito([]);
  }, []);
  return null;
}
