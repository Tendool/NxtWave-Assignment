import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { KitForm } from "@/components/site/kit-form";

export const metadata = { title: "Ambassador kit — Build60" };

export default function KitPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <p className="label-mono text-flame">For campus leads</p>
        <h1 className="mt-2 max-w-2xl text-5xl md:text-6xl">Get your college on the board.</h1>
        <p className="mt-4 max-w-2xl text-ink/75">
          Running a club or a class group? Make a tracking link and three messages you can forward in one tap. Every
          registration through your link counts towards your college.
        </p>
        <div className="mt-10">
          <KitForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
