/** Admin pages carry their own navigation, so this skeleton has no site header. */
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-96 max-w-full" />
      <div className="skeleton mt-8 h-12 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="paper-card p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-10 w-16" />
          </div>
        ))}
      </div>
      <div className="paper-card mt-6 p-5">
        <div className="skeleton h-56 w-full" />
      </div>
    </div>
  );
}
