export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 animate-pulse" aria-busy="true">
      <div className="h-40 rounded-3xl bg-neutral-200" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-neutral-100" />
        ))}
      </div>
      <div className="mt-5 h-11 rounded-xl bg-neutral-100" />
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="aspect-square rounded-xl bg-neutral-200" />
            <div className="mt-3 h-3 w-1/3 rounded-full bg-neutral-200" />
            <div className="mt-2 h-4 w-3/4 rounded bg-neutral-200" />
            <div className="mt-4 h-5 w-1/2 rounded bg-neutral-200" />
            <div className="mt-3 h-9 rounded-xl bg-neutral-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
