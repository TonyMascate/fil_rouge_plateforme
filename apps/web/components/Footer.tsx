import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full px-6 md:px-20 py-6 md:py-4 border-t border-border flex flex-col md:flex-row items-center md:justify-between gap-4 md:gap-0 text-sm text-muted-foreground bg-card">
      <span className="font-semibold text-foreground">PhotoApp</span>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        <Link href="#" className="hover:text-foreground transition-colors">
          Confidentialité
        </Link>
        <Link href="#" className="hover:text-foreground transition-colors">
          Conditions
        </Link>
        <Link href="#" className="hover:text-foreground transition-colors">
          Contact
        </Link>
      </div>
      <span>© 2026 PhotoApp</span>
    </footer>
  );
}
