import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FeatureText({ tag, title, description, children }: { tag: string; title: ReactNode; description: string; children?: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col gap-5 max-w-sm">
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">{tag}</span>
      <h2 className="text-4xl font-bold leading-tight tracking-tight">{title}</h2>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
      {children}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function FeatureRow({ reverse, children }: { reverse?: boolean; children: ReactNode }) {
  return <section className={`w-full flex items-center gap-16 ${reverse ? "flex-row-reverse" : ""}`}>{children}</section>;
}

export function DotBackground() {
  return (
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

interface CtaSectionProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle: string;
  footnote?: string;
  className?: string;
}

export function CtaSection({ title, subtitle, footnote, className = "" }: CtaSectionProps) {
  return (
    <div className={`flex flex-col items-center gap-6 text-center ${className}`}>
      <h2 className="text-5xl font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground max-w-md">{subtitle}</p>
      <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
        <Link href="/register">Créer un compte gratuit</Link>
      </Button>
      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
