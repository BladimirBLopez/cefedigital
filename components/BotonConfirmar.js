"use client";

export default function BotonConfirmar({ mensaje, className, children }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
