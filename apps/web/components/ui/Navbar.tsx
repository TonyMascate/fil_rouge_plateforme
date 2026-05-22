"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const links = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Explorer", href: "/explore" },
  { label: "Tarifs", href: "/tarifs" },
];

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-10 h-16 bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <Link href="/" className="text-lg font-semibold text-foreground">
        PhotoApp
      </Link>

      {/* Desktop */}
      <NavigationMenu className="hidden md:flex">
        <NavigationMenuList>
          {links.map(({ label, href }) => (
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
          <Link href="#">Se connecter</Link>
        </Button>
        <Button asChild className="rounded-full">
          <Link href="#">Créer un compte</Link>
        </Button>
      </div>

      {/* Mobile */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-full flex flex-col gap-8 pt-12 px-6">
          <SheetTitle className="text-xl font-semibold">PhotoApp</SheetTitle>
          <nav className="flex flex-col">
            {links.map(({ label, href }) => (
              <Link key={label} href={href} className="py-4 text-base font-medium border-b border-border last:border-0 hover:text-primary transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3">
            <Button variant="outline" asChild className="w-full h-12">
              <Link href="#">Se connecter</Link>
            </Button>
            <Button asChild className="w-full h-12 rounded-full">
              <Link href="#">Créer un compte</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
