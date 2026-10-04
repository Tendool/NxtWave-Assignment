import { SiteHeader } from "@/components/site/chrome";

/** Instant feedback while a page's data loads: the page's shape in shimmering placeholders. */
export default function Loading() {
  return (
    <>
    <SiteHeader />
    <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 md:py-16" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-4 h-12 w-3/4 max-w-lg" />
      <div className="skeleton mt-4 h-4 w-2/3 max-w-md" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="paper-card p-5">
            <div className="skeleton h-10 w-20" />
            <div className="skeleton mt-4 h-3 w-full" />
            <div className="skeleton mt-2 h-3 w-4/5" />
            <div className="skeleton mt-6 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
