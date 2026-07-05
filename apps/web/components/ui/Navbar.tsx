"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Menu, Upload, LogOut, Settings, CreditCard } from "lucide-react";
import { QuotaResponseDto } from "@repo/shared";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UploadDialog } from "@/components/UploadDialog";
import { Spinner } from "./spinner";

const PUBLIC_LINKS = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Explorer", href: "/explore" },
  { label: "Tarifs", href: "/tarifs" },
];

const AUTH_LINKS = [
  { label: "Galerie", href: "/galerie" },
  { label: "Albums", href: "/albums" },
  { label: "Exploration chromatique", href: "/explore", highlight: true },
];

export interface NavbarUser {
  firstName: string;
  lastName: string;
  email: string;
}

export default function Navbar({ user }: Readonly<{ user: NavbarUser | null }>) {
  if (user) return <AuthedNavbar user={user} />;
  return <PublicNavbar />;
}

function PublicNavbar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      <nav className="w-full flex items-center justify-between px-5 sm:px-10 h-16 bg-card backdrop-blur-sm border-b border-border">
        <Link href="/" className="text-lg font-semibold text-foreground">
          PhotoApp
        </Link>

        {/* Desktop */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {PUBLIC_LINKS.map(({ label, href }) => (
              <NavigationMenuItem key={label}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/register">Créer un compte</Link>
          </Button>
        </div>

        {/* Mobile */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-full flex flex-col gap-8 pt-12 px-6">
            <SheetTitle className="text-xl font-semibold">PhotoApp</SheetTitle>
            <nav className="flex flex-col">
              {PUBLIC_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="py-4 text-base font-medium border-b border-border last:border-0 hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3">
              <Button variant="outline" asChild className="w-full h-12">
                <Link href="/login">Se connecter</Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-full">
                <Link href="/register">Créer un compte</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}

function bytesToMb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function AuthedNavbar({ user }: Readonly<{ user: NavbarUser }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  const { data: quota } = useQuery<QuotaResponseDto>({
    queryKey: ["photos", "quota"],
    queryFn: async () => (await api.get("/photos/quota")).data,
    staleTime: 30 * 1000,
  });

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // router.refresh() invalide le cache RSC : le RootLayout (Server Component)
      // re-fetch GetSession() → la navbar repasse en mode non-connecté.
      // Sans ça, l'avatar reste affiché jusqu'au prochain full reload.
      router.push("/login");
      router.refresh();
    }
  };

  const usedMb = quota ? bytesToMb(quota.usedBytes) : 0;
  const maxMb = quota ? bytesToMb(quota.maxBytes) : 500;
  const percent = quota && quota.maxBytes > 0 ? Math.min(100, (quota.usedBytes / quota.maxBytes) * 100) : 0;

  return (
    <>
      <header className="sticky top-0 z-50">
      <nav className="w-full flex items-center justify-between px-4 sm:px-8 h-16 bg-card backdrop-blur-sm border-b border-border">
        {/* Brand + nav links */}
        <div className="flex items-center gap-6">
          <Link href="/galerie" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-base text-foreground font-semibold tracking-tight">PhotoApp</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {AUTH_LINKS.map(({ label, href, highlight }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors", isActive && "bg-background text-foreground border border-border shadow-sm", !isActive && highlight && "text-primary hover:bg-muted", !isActive && !highlight && "text-muted-foreground hover:text-foreground hover:bg-muted", isActive && highlight && "text-primary")}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quota + Upload + Avatar */}
        <div className="flex items-center gap-4">
          {quota ? (
            <div className="hidden md:flex items-center gap-2.5">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {usedMb} / {maxMb} MB
              </span>
            </div>
          ) : (
            <Spinner className="text-muted-foreground" />
          )}

          <Button onClick={() => setUploadOpen(true)} className="hidden md:inline-flex rounded-full bg-foreground text-background hover:bg-foreground/85">
            <Upload className="size-4" />
            Importer
          </Button>
          <Button onClick={() => setUploadOpen(true)} size="icon" className="md:hidden rounded-full bg-foreground text-background hover:bg-foreground/85" aria-label="Importer">
            <Upload className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex size-9 rounded-full bg-primary/10 text-primary text-sm font-semibold items-center justify-center hover:bg-primary/15 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/30">{getInitials(user.firstName, user.lastName)}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <div className="text-sm font-semibold leading-tight">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/subscription">
                  <CreditCard />
                  Abonnement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile : avatar ouvre un Sheet unifié */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="size-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center hover:bg-primary/15 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/30">{getInitials(user.firstName, user.lastName)}</button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm flex flex-col gap-6 pt-12 px-6">
              <SheetTitle className="sr-only">Menu utilisateur</SheetTitle>

              <div>
                <div className="text-base font-semibold leading-tight">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
              </div>

              <nav className="flex flex-col">
                {AUTH_LINKS.map(({ label, href, highlight }) => (
                  <Link key={href} href={href} className={cn("py-3 text-base font-medium border-b border-border last:border-0 transition-colors", highlight ? "text-primary" : "hover:text-primary")}>
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col">
                <Link href="/settings" className="flex items-center gap-3 py-3 text-base font-medium border-b border-border hover:text-primary transition-colors">
                  <Settings className="size-4" />
                  Paramètres
                </Link>
                <Link href="/subscription" className="flex items-center gap-3 py-3 text-base font-medium border-b border-border hover:text-primary transition-colors">
                  <CreditCard className="size-4" />
                  Abonnement
                </Link>
              </div>

              <button onClick={handleLogout} className="flex items-center gap-3 py-3 text-base font-medium text-destructive hover:text-destructive/80 transition-colors mt-auto">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      </header>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
