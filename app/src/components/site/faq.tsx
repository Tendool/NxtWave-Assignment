import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ITEMS = [
  {
    q: "I have never built anything with AI. Is this for me?",
    a: "Yes — that is exactly who it is for. If you can write a basic program in any language, you can follow along. We start from zero and every step is shown live.",
  },
  {
    q: "What exactly will I have at the end?",
    a: "A working AI project deployed on a public link, a GitHub repo with your code, and a one-page write-up you can drop straight into your resume or LinkedIn.",
  },
  {
    q: "Do I need to install or pay for anything?",
    a: "No. Everything runs in your browser using free tiers. A laptop and a stable connection are enough.",
  },
  {
    q: "I am in branches other than CSE. Can I join?",
    a: "Yes. ECE, EEE, Mechanical and Civil students are welcome. AI projects are not limited to software roles.",
  },
  {
    q: "Will there be a recording?",
    a: "Registered students get the recording and the project template on WhatsApp after the session. Live attendees also get a chance to be featured on the project gallery.",
  },
];

export function Faq() {
  return (
    <Accordion className="paper-card divide-y-[1.5px] divide-ink">
      {ITEMS.map((item, i) => (
        <AccordionItem key={i} value={`q${i}`} className="border-0 px-5">
          <AccordionTrigger className="py-5 text-left font-display text-xl hover:no-underline md:text-2xl">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
