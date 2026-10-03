import ReactMarkdown from "react-markdown";

/** Renders markdown the organisers (or an AI) wrote. react-markdown never renders raw HTML, and unsafe URLs are dropped. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-[0.95rem] leading-relaxed">
      <ReactMarkdown
        components={{
          h1: (p) => <h3 className="mt-5 font-display text-3xl" {...p} />,
          h2: (p) => <h3 className="mt-6 border-t border-ink/20 pt-4 font-display text-2xl text-flame first:mt-0 first:border-0 first:pt-0" {...p} />,
          h3: (p) => <h4 className="mt-4 font-display text-xl" {...p} />,
          p: (p) => <p {...p} />,
          ul: (p) => <ul className="list-disc space-y-1.5 pl-5" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-flame" {...p} />,
          code: (p) => <code className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-[0.85em]" {...p} />,
          pre: (p) => <pre className="overflow-x-auto rounded-md border-[1.5px] border-ink bg-secondary p-3 font-mono text-sm" {...p} />,
          a: (p) => <a className="font-semibold underline decoration-flame decoration-2 underline-offset-4" target="_blank" rel="noopener noreferrer nofollow" {...p} />,
          strong: (p) => <strong className="font-semibold" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
