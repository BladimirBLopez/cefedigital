"use client";

export default function ConfirmarForm({ action, mensaje, className, children }) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      <input type="hidden" name="confirmo" value="on" />
      {children}
    </form>
  );
}
