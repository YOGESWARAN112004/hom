"use client";

import { motion } from "framer-motion";
import { useShop, type Product } from "@/hooks/use-shop";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Star, ShoppingBag } from "lucide-react";
import { trackViewItemList, trackSelectItem, trackAddToCart } from "@/lib/analytics";
import { useEffect, SyntheticEvent } from "react";
import { generateImageSrcSet, generateImageSizes } from "@/lib/imageUtils";
import { useQuery } from "@tanstack/react-query";

interface Brand {
    id: string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
    description: string | null;
    isActive: boolean;
}

export default function Home() {
    const { products, addToCart, isLoadingProducts } = useShop();

    // Featured product (first one)
    const heroProduct = products[0];

    // Fetch brands from API
    const { data: brands = [] } = useQuery<Brand[]>({
        queryKey: ['/api/brands'],
        queryFn: async () => {
            const res = await fetch('/api/brands');
            if (!res.ok) throw new Error('Failed to fetch brands');
            return res.json();
        }
    });

    // Get active brands with images, fallback to static images
    const activeBrands = brands.filter(b => b.isActive && b.logoUrl).slice(0, 4);

    // Placeholder images for now
    const ralphImg = "/assets/generated_images/ralph_lauren_style_luxury_polo_fashion.png";
    const mclarenImg = "/assets/generated_images/mclaren_luxury_automotive_accessories.png";
    const gucciImg = "/assets/generated_images/gucci_style_high_fashion_floral_dress.png";
    const coachImg = "/assets/generated_images/coach_style_leather_handbag_craftsmanship.png";

    const BRAND_SPOTLIGHTS = activeBrands.length >= 4
        ? activeBrands.map(brand => ({
            name: brand.name,
            image: brand.logoUrl!,
            desc: brand.description || `${brand.name} Collection`,
            slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-'),
        }))
        : [
            { name: "Ralph Lauren", image: ralphImg, desc: "Classic American Luxury", slug: "ralph-lauren" },
            { name: "McLaren", image: mclarenImg, desc: "Precision & Performance", slug: "mclaren" },
            { name: "Gucci", image: gucciImg, desc: "Maximalist Renaissance", slug: "gucci" },
            { name: "Coach", image: coachImg, desc: "Modern Heritage", slug: "coach" },
        ];

    // Track view item list when products load
    useEffect(() => {
        if (products.length > 0) {
            trackViewItemList('homepage_products', 'Latest Treasures', products.slice(0, 8).map((p: Product) => ({
                item_id: p.id,
                item_name: p.name,
                item_brand: p.brand,
                item_category: p.category,
                price: parseFloat(p.basePrice || p.price || '0'),
            })));
        }
    }, [products]);

    const handleAddToCart = (product: Product) => {
        addToCart(product);
        trackAddToCart({
            item_id: product.id,
            item_name: product.name,
            item_brand: product.brand,
            item_category: product.category,
            price: parseFloat(product.basePrice || product.price || '0'),
            quantity: 1,
        });
    };

    const handleProductClick = (product: Product) => {
        trackSelectItem('homepage_products', 'Latest Treasures', {
            item_id: product.id,
            item_name: product.name,
            item_brand: product.brand,
            item_category: product.category,
            price: parseFloat(product.basePrice || product.price || '0'),
        });
    };

    if (isLoadingProducts) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-primary text-xl animate-pulse">Loading luxury collection...</div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Hero Section */}
            <section className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] w-full overflow-hidden bg-black">
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
                {heroProduct?.imageUrl && (
                    <img
                        src={heroProduct.imageUrl}
                        srcSet={generateImageSrcSet(heroProduct.imageUrl, { widths: [1920, 2560, 3840], maxWidth: 3840 }) || undefined}
                        sizes="100vw"
                        alt="Hero Luxury"
                        className="absolute inset-0 h-full w-full object-contain opacity-60 scale-105 animate-in fade-in zoom-in duration-1000"
                        loading="eager"
                        decoding="async"
                        onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                )}

                <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm font-medium mb-3 sm:mb-4 block">
                            The New Collection
                        </span>
                        <h1 className="font-heading text-3xl sm:text-5xl md:text-7xl lg:text-8xl text-white mb-4 sm:mb-6 leading-tight">
                            MYTH OF <br /> <span className="text-primary">ELEGANCE</span>
                        </h1>
                        <p className="text-sm sm:text-lg text-gray-300 max-w-xl mb-6 sm:mb-10 font-light leading-relaxed">
                            Discover pieces that transcend time. Crafted for the modern deity, inspired by ancient legends.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <Link href="/shop?category=Women">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-lg font-heading tracking-widest w-full sm:w-auto">
                                    SHOP NOW
                                </Button>
                            </Link>
                            <Link href="/lookbook">
                                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white rounded-none h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-lg font-heading tracking-widest w-full sm:w-auto">
                                    VIEW LOOKBOOK
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Brand Spotlight */}
            <section className="py-12 sm:py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8 sm:mb-16">
                        <span className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">Featured Houses</span>
                        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground">ICONIC BRANDS</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                        {BRAND_SPOTLIGHTS.map((brand, idx) => (
                            <motion.div
                                key={brand.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="group relative h-[200px] sm:h-[350px] md:h-[500px] overflow-hidden cursor-pointer border border-white/5"
                            >
                                <img
                                    src={brand.image}
                                    alt={brand.name}
                                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 w-full p-3 sm:p-8 text-center">
                                    <h3 className="font-heading text-sm sm:text-2xl text-white mb-1 sm:mb-2">{brand.name}</h3>
                                    <p className="text-[8px] sm:text-xs text-white/70 uppercase tracking-widest mb-2 sm:mb-4 hidden sm:block">{brand.desc}</p>
                                    <Link href={`/brand/${brand.slug}`}>
                                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest text-[10px] sm:text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 sm:h-9">
                                            View
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Product Grid */}
            <section className="py-12 sm:py-24 bg-secondary/30 border-y border-white/5">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-end mb-6 sm:mb-12">
                        <div>
                            <span className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">New Arrivals</span>
                            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground">LATEST TREASURES</h2>
                        </div>
                        <Link href="/products">
                            <Button variant="link" className="text-primary hover:text-primary/80 uppercase tracking-widest hidden md:flex">
                                View All Products
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                        {products.slice(0, 8).map((product) => {
                            const price = parseFloat(product.basePrice || product.price || '0');
                            const primaryImage = product.images?.find(img => img.isPrimary)?.url ||
                                product.images?.[0]?.url ||
                                product.imageUrl;

                            return (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    className="group"
                                    data-testid={`card-product-${product.id}`}
                                >
                                    <Link href={`/product/${product.id}`} onClick={() => handleProductClick(product)}>
                                        <div className="relative aspect-[3/4] bg-secondary mb-4 overflow-hidden cursor-pointer">
                                            {primaryImage ? (
                                                <img
                                                    src={primaryImage}
                                                    srcSet={generateImageSrcSet(primaryImage, { widths: [400, 800, 1200, 1600], maxWidth: 1600 }) || undefined}
                                                    sizes={generateImageSizes({
                                                        mobile: '50vw',
                                                        tablet: '33vw',
                                                        desktop: '25vw',
                                                        large: '25vw',
                                                    })}
                                                    alt={product.name}
                                                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder.svg';
                                                        target.onerror = null;
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-secondary flex items-center justify-center">
                                                    <span className="text-muted-foreground text-xs">No Image</span>
                                                </div>
                                            )}
                                            {product.stock < 5 && product.stock > 0 && (
                                                <div className="absolute top-2 right-2 bg-destructive text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider">
                                                    Low Stock
                                                </div>
                                            )}
                                            {product.stock === 0 && (
                                                <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px] uppercase font-bold px-2 py-1 tracking-wider">
                                                    Out of Stock
                                                </div>
                                            )}
                                            {product.compareAtPrice && parseFloat(product.compareAtPrice) > price && (
                                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider">
                                                    Sale
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (product.hasVariants) {
                                                // Navigate to product page to select variant
                                                window.location.href = `/product/${product.id}`;
                                            } else {
                                                handleAddToCart(product);
                                            }
                                        }}
                                        disabled={product.stock === 0}
                                        className="w-full bg-primary text-primary-foreground py-2 sm:py-3 font-heading uppercase tracking-widest text-xs sm:text-sm hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-4"
                                        data-testid={`button-add-to-cart-${product.id}`}
                                    >
                                        <ShoppingBag className="inline-block mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">{product.hasVariants ? 'Select Options' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                                        <span className="sm:hidden">{product.hasVariants ? 'Options' : product.stock === 0 ? 'Sold Out' : 'Add'}</span>
                                    </button>

                                    <div className="text-center">
                                        <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1" data-testid={`text-brand-${product.id}`}>
                                            {product.brand}
                                        </span>
                                        <Link href={`/product/${product.id}`} onClick={() => handleProductClick(product)}>
                                            <h3 className="font-heading text-xs sm:text-lg text-foreground mb-1 group-hover:text-primary transition-colors cursor-pointer line-clamp-2" data-testid={`text-name-${product.id}`}>
                                                {product.name}
                                            </h3>
                                        </Link>
                                        <p className="text-[10px] sm:text-sm text-muted-foreground mb-1 sm:mb-2 hidden sm:block">{product.category} / {product.subCategory}</p>
                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                            <p className="font-mono text-primary text-xs sm:text-base" data-testid={`text-price-${product.id}`}>
                                                ₹{price.toLocaleString()}
                                            </p>
                                            {product.compareAtPrice && parseFloat(product.compareAtPrice) > price && (
                                                <p className="font-mono text-muted-foreground line-through text-[10px] sm:text-sm">
                                                    ₹{parseFloat(product.compareAtPrice).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Mobile View All Button */}
                    <div className="mt-12 text-center md:hidden">
                        <Link href="/products">
                            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest">
                                View All Products
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Brand Story / Statement */}
            <section className="py-32 container mx-auto px-4 text-center max-w-3xl">
                <Star className="h-8 w-8 text-primary mx-auto mb-8" />
                <h2 className="font-heading text-3xl md:text-5xl text-foreground mb-8 leading-snug">
                    "WE DON'T SELL PRODUCTS. WE CURATE ARTIFACTS FOR THE MODERN LEGEND."
                </h2>
                <p className="font-heading text-primary uppercase tracking-widest text-sm">
                    — The House of Medusa
                </p>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-secondary/30 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="w-12 h-12 mx-auto mb-4 border border-primary rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="font-heading text-sm uppercase tracking-widest mb-2">100% Authentic</h3>
                            <p className="text-xs text-muted-foreground">Every item verified genuine</p>
                        </div>
                        <div>
                            <div className="w-12 h-12 mx-auto mb-4 border border-primary rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h3 className="font-heading text-sm uppercase tracking-widest mb-2">Free Shipping</h3>
                            <p className="text-xs text-muted-foreground">On orders over ₹10,000</p>
                        </div>
                        <div>
                            <div className="w-12 h-12 mx-auto mb-4 border border-primary rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="font-heading text-sm uppercase tracking-widest mb-2">Easy Returns</h3>
                            <p className="text-xs text-muted-foreground">14-day hassle-free returns</p>
                        </div>
                        <div>
                            <div className="w-12 h-12 mx-auto mb-4 border border-primary rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="font-heading text-sm uppercase tracking-widest mb-2">Secure Payment</h3>
                            <p className="text-xs text-muted-foreground">256-bit SSL encryption</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
