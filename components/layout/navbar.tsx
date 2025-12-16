"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingBag, Menu, X, User, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import React from "react";
import { cn } from "@/lib/utils";

const menCategories = [
    { title: "T-Shirts", href: "/shop?category=men&type=t-shirts", description: "Premium cotton basics." },
    { title: "Shirts", href: "/shop?category=men&type=shirts", description: "Button-downs and casuals." },
    { title: "Polos", href: "/shop?category=men&type=polos", description: "Classic pique polos." },
    { title: "Sweaters", href: "/shop?category=men&type=sweaters", description: "Knits and cardigans." },
    { title: "Jeans", href: "/shop?category=men&type=jeans", description: "Denim essentials." },
    { title: "Suits", href: "/shop?category=men&type=suits", description: "Tailored magnificence." },
    { title: "Outerwear", href: "/shop?category=men&type=outerwear", description: "Jackets and coats." },
    { title: "Shoes", href: "/shop?category=men&type=shoes", description: "Handcrafted leather." },
    { title: "Bags", href: "/shop?category=men&type=bags", description: "Briefcases and backpacks." },
    { title: "Wallets", href: "/shop?category=men&type=wallets", description: "Leather accessories." },
];

const womenCategories = [
    { title: "Dresses", href: "/shop?category=women&type=dresses", description: "Evening gowns and casual wear." },
    { title: "Tops & Shirts", href: "/shop?category=women&type=tops", description: "Blouses, shirts, and tees." },
    { title: "Sweaters", href: "/shop?category=women&type=sweaters", description: "Cozy knits and cardigans." },
    { title: "Jeans", href: "/shop?category=women&type=jeans", description: "Designer denim." },
    { title: "Handbags", href: "/shop?category=women&type=handbags", description: "Signature luxury bags." },
    { title: "Shoes", href: "/shop?category=women&type=shoes", description: "Heels, boots, and sneakers." },
    { title: "Wallets", href: "/shop?category=women&type=wallets", description: "Classic leather wallets." },
    { title: "Clutches", href: "/shop?category=women&type=clutches", description: "Evening essentials." },
];

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <a
                    ref={ref}
                    className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        className
                    )}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </a>
            </NavigationMenuLink>
        </li>
    )
})
ListItem.displayName = "ListItem"

export default function Navbar() {
    const pathname = usePathname();
    const { cartItemCount } = useShop();
    const { user, isAuthenticated, logout } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const routes = [
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
        { href: "/affiliates/apply", label: "Affiliate" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Mobile Menu */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                        <nav className="flex flex-col gap-4 mt-8">
                            <Link href="/" className="text-lg font-medium">Home</Link>
                            <Link href="/shop?category=men" className="text-lg font-medium">Men</Link>
                            <Link href="/shop?category=women" className="text-lg font-medium">Women</Link>
                            <Link href="/shop?category=accessories" className="text-lg font-medium">Accessories</Link>
                            <Link href="/contact" className="text-lg font-medium">Contact</Link>
                            <Link href="/affiliates/apply" className="text-lg font-medium">Affiliate</Link>
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img src="/logo.jpg" alt="House of Medusa" className="h-12 w-auto object-contain" />
                    <span className="sr-only">HOUSES OF MEDUSA</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <Link href="/" legacyBehavior passHref>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Home
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuTrigger>Men</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                        {menCategories.map((component) => (
                                            <ListItem key={component.title} title={component.title} href={component.href}>
                                                {component.description}
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuTrigger>Women</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                        {womenCategories.map((component) => (
                                            <ListItem key={component.title} title={component.title} href={component.href}>
                                                {component.description}
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuTrigger>Accessories</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <a
                                                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                                    href="/shop?category=accessories"
                                                >
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Accessories
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Complete your look with our curated selection.
                                                    </p>
                                                </a>
                                            </NavigationMenuLink>
                                        </li>
                                        <ListItem href="/shop?category=accessories&type=watches" title="Watches">
                                            Timeless elegance.
                                        </ListItem>
                                        <ListItem href="/shop?category=accessories&type=handbags" title="Handbags">
                                            Luxury carriers.
                                        </ListItem>
                                        <ListItem href="/shop?category=accessories&type=wallets" title="Wallets">
                                            Small leather goods.
                                        </ListItem>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <Link href="/contact" legacyBehavior passHref>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Contact
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                        <Search className="h-5 w-5" />
                    </Button>

                    <Link href="/cart">
                        <Button variant="ghost" size="icon" className="relative">
                            <ShoppingBag className="h-5 w-5" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                                    {cartItemCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {isAuthenticated ? (
                        <Link href="/account">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
