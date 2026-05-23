import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full px-20 py-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground bg-card">
      <span className="font-semibold text-foreground">PhotoApp</span>
      <div className="flex gap-6">
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
