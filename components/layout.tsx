import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, ShieldCheck, UserCircle, ChevronDown, Check, LogOut, User, Package, Heart, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { AnnouncementBar } from "@/components/announcement-bar";
const logoImg = "/WhatsApp_Image_2025-12-11_at_19.54.19_da70f618_1765463204248.jpg";

interface Brand {
  id: string;
  name: string;
  slug: string | null;
}

const STATIC_CATEGORIES = [
  {
    title: "Men",
    items: [
      { title: "Clothing", href: "/category/men/clothing" },
      { title: "Accessories", href: "/category/men/accessories" },
      { title: "Shoes", href: "/category/men/shoes" },
      { title: "Watches", href: "/category/men/watches" },
    ]
  },
  {
    title: "Women",
    items: [
      { title: "Clothing", href: "/category/women/clothing" },
      { title: "Bags", href: "/category/women/bags" },
      { title: "Jewelry", href: "/category/women/jewelry" },
      { title: "Shoes", href: "/category/women/shoes" },
    ]
  },
  {
    title: "Kids",
    items: [
      { title: "Boys", href: "/category/kids/boys" },
      { title: "Girls", href: "/category/kids/girls" },
      { title: "Baby", href: "/category/kids/baby" },
    ]
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const { cart, cartTotal, removeFromCart } = useShop();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch brands for navigation
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
  });

  // Build dynamic navigation categories including brands
  const MAIN_CATEGORIES = [
    ...STATIC_CATEGORIES,
    {
      title: "Brands",
      items: brands.length > 0
        ? brands.map(brand => ({
          title: brand.name,
          href: `/brand/${brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-')}`,
        }))
        : [{ title: "Loading...", href: "/shop" }]
    }
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body selection:bg-primary selection:text-primary-foreground relative">
      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-background border-r border-white/10 w-[300px] overflow-y-auto">
              <div className="flex flex-col gap-6 mt-8">
                {MAIN_CATEGORIES.map((cat) => (
                  <div key={cat.title}>
                    <h3 className="font-heading text-primary mb-2 text-lg">{cat.title}</h3>
                    <div className="flex flex-col gap-2 pl-4 border-l border-white/10">
                      {cat.items.map((item) => (
                        <Link key={item.title} href={item.href}>
                          <span onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground text-sm py-1 block cursor-pointer">
                            {item.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="h-px bg-white/10 my-2" />

                <Link href="/affiliate" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className={`font-heading text-lg ${location === '/affiliate' ? 'text-primary' : 'hover:text-primary'} cursor-pointer flex items-center gap-2`}>
                    <Users className="h-4 w-4" /> Affiliate Program
                  </span>
                </Link>

                <div className="h-px bg-white/10 my-2" />

                {isAuthenticated ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Signed in as <span className="text-foreground">{user?.email}</span>
                    </div>
                    {user?.role === 'admin' && (
                      <Link href="/admin"><span className="font-heading text-lg text-primary cursor-pointer">Admin Panel</span></Link>
                    )}
                    {user?.role === 'affiliate' && (
                      <Link href="/affiliate"><span className="font-heading text-lg text-primary cursor-pointer">Affiliate Portal</span></Link>
                    )}
                    <button onClick={handleLogout} className="text-left font-heading text-lg hover:text-primary cursor-pointer">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login"><span className="font-heading text-lg hover:text-primary cursor-pointer">Sign In</span></Link>
                    <Link href="/register"><span className="font-heading text-lg text-primary cursor-pointer">Create Account</span></Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 group cursor-pointer">
              <img
                src={logoImg}
                alt="Houses of Medusa"
                className="h-12 w-12 rounded-full border border-primary/50 group-hover:border-primary transition-colors object-cover"
              />
              <div className="flex flex-col">
                <span className="font-heading text-xl md:text-2xl font-bold tracking-widest text-primary group-hover:text-primary/80 transition-colors">
                  HOUSES OF MEDUSA
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground hidden sm:block">
                  Luxury Outlet Retail
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav - Mega Menu */}
          <div className="hidden md:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                {MAIN_CATEGORIES.map((category) => (
                  <NavigationMenuItem key={category.title}>
                    <NavigationMenuTrigger className="bg-transparent text-foreground hover:text-primary hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent font-medium tracking-wide uppercase text-xs">
                      {category.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 bg-background border border-white/10 md:w-[500px] md:grid-cols-2">
                        {category.items.map((item) => (
                          <li key={item.title}>
                            <Link href={item.href}>
                              <span className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-white/5 hover:text-primary focus:bg-white/5 focus:text-primary cursor-pointer">
                                <div className="text-sm font-medium leading-none">{item.title}</div>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {user?.role === 'admin' && (
              <Link href="/admin">
                <span className={`hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${location === '/admin' ? 'text-primary' : 'text-foreground/80'} text-xs uppercase tracking-wide font-medium`}>
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              </Link>
            )}

            <Link href="/affiliate">
              <span className={`hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${location === '/affiliate' ? 'text-primary' : 'text-foreground/80'} text-xs uppercase tracking-wide font-medium`}>
                <Users className="h-3 w-3" /> Affiliate Program
              </span>
            </Link>

            <Link href="/blog">
              <span className={`hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${location.startsWith('/blog') ? 'text-primary' : 'text-foreground/80'} text-xs uppercase tracking-wide font-medium`}>
                Blog
              </span>
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-foreground hover:text-primary">
                    <UserCircle className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {user?.firstName || 'Hello'} {user?.lastName || ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" />
                    Addresses
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Heart className="mr-2 h-4 w-4" />
                    Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary hidden md:flex">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Cart */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-foreground hover:text-primary hover:bg-transparent">
                  <ShoppingBag className="h-6 w-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md border-l border-white/10 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="border-b border-white/10 pb-6 mb-6">
                  <SheetTitle className="font-heading text-2xl text-primary tracking-widest text-center">
                    Your Selection
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col h-full">
                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <ShoppingBag className="h-16 w-16 opacity-20" />
                      <p className="uppercase tracking-widest text-sm">Your bag is empty</p>
                      <Link href="/">
                        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest mt-4">
                          Continue Shopping
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-6">
                        {cart.map((item) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="h-24 w-24 bg-secondary overflow-hidden rounded-sm border border-white/5">
                              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                              <div>
                                <h4 className="font-heading text-sm text-foreground mb-1">{item.name}</h4>
                                <p className="text-xs text-muted-foreground uppercase">{item.brand}</p>
                              </div>
                              <div className="flex justify-between items-end">
                                <p className="font-mono text-primary">₹{parseFloat(item.price).toLocaleString()}</p>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-xs text-destructive hover:text-destructive/80 uppercase tracking-wider"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-white/10 pt-6 mt-6 pb-20">
                        <div className="flex justify-between items-center mb-6">
                          <span className="uppercase tracking-widest text-sm text-muted-foreground">Subtotal</span>
                          <span className="font-mono text-xl text-primary">₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <Link href="/cart">
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-widest py-6 text-lg rounded-none mb-3">
                            VIEW BAG
                          </Button>
                        </Link>
                        <Link href="/checkout">
                          <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-heading tracking-widest py-6 text-lg rounded-none">
                            CHECKOUT
                          </Button>
                        </Link>
                        <p className="text-[10px] text-center mt-4 text-muted-foreground uppercase tracking-wider">
                          Secure Checkout via Razorpay
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-secondary border-t border-white/5 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <span className="font-heading text-lg text-primary block mb-4">HOUSES OF MEDUSA</span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Curating the finest in luxury lifestyle and accessories. Where myth meets modernity in a celebration of elegance.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-sm text-foreground mb-6">Client Services</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="tel:9940244607" className="hover:text-primary transition-colors flex items-center gap-2">
                    Contact Us
                    <span className="text-primary font-mono">9940244607</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Shipping & Returns
                    <span className="block text-xs text-muted-foreground/70 mt-1">15 to 21 days</span>
                  </a>
                </li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Care Instructions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm text-foreground mb-6">The House</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><Link href="/affiliate" className="hover:text-primary transition-colors">Become an Affiliate</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm text-foreground mb-6">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  className="bg-background/50 border border-white/10 px-4 py-2 text-sm w-full focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
                />
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none">
                  JOIN
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground uppercase tracking-wider">
            <p>&copy; 2025 Houses of Medusa. All rights reserved.</p>
            <div className="flex gap-6">
              <span>Instagram</span>
              <span>Facebook</span>
              <span>Twitter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
