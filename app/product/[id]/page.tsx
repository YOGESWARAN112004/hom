"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useShop, type Product, type ProductVariant, type ProductImage } from "@/hooks/use-shop";
import { generateImageSrcSet } from "@/lib/imageUtils";
import { UpscaledImage } from "@/components/UpscaledImage";
import {
    ShoppingBag,
    Heart,
    Share2,
    ChevronLeft,
    ChevronRight,
    Truck,
    Shield,
    RefreshCw,
    Minus,
    Plus,
    Check,
    ZoomIn,
} from "lucide-react";

export default function ProductPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { toast } = useToast();
    const { addToCart } = useShop();

    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);

    const { data: product, isLoading, error } = useQuery<Product>({
        queryKey: ['/api/products', id],
        queryFn: async () => {
            const res = await fetch(`/api/products/${id}`);
            if (!res.ok) throw new Error('Product not found');
            return res.json();
        },
        enabled: !!id,
    });

    // Extract unique sizes and colors
    const sizes = product?.variants
        ? Array.from(new Set(product.variants.map(v => v.size).filter(Boolean)))
        : [];
    const colors = product?.variants
        ? Array.from(new Set(product.variants.map(v => v.color).filter(Boolean)))
        : [];

    // Get selected variant
    const selectedVariant = product?.variants.find(
        v => v.size === selectedSize && v.color === selectedColor
    );

    // Calculate current price
    const basePrice = parseFloat(product?.basePrice || '0');
    const priceModifier = parseFloat(selectedVariant?.priceModifier || '0');
    const currentPrice = basePrice + priceModifier;
    const comparePrice = product?.compareAtPrice ? parseFloat(product.compareAtPrice) : null;

    // Get current stock
    const currentStock = product?.hasVariants
        ? (selectedVariant?.stock || 0)
        : (product?.stock || 0);

    // Get images to display
    const images = product?.images?.length ? product.images :
        (product?.imageUrl ? [{ id: '1', url: product.imageUrl, altText: null, isPrimary: true, sortOrder: 0 }] : []);

    // Update selected image when variant changes
    useEffect(() => {
        if (selectedVariant?.imageUrl) {
            const variantImageIndex = images.findIndex(img => img.url === selectedVariant.imageUrl);
            if (variantImageIndex >= 0) {
                setSelectedImageIndex(variantImageIndex);
            }
        }
    }, [selectedVariant, images]);

    // Auto-select first size/color if available
    useEffect(() => {
        if (sizes.length && !selectedSize) {
            setSelectedSize(sizes[0] as string);
        }
        if (colors.length && !selectedColor) {
            setSelectedColor(colors[0] as string);
        }
    }, [sizes, colors, selectedSize, selectedColor]);

    const handleAddToCart = () => {
        if (!product) return;

        if (product.hasVariants && !selectedVariant) {
            toast({
                title: "Please select options",
                description: "Select size and color before adding to cart",
                variant: "destructive",
            });
            return;
        }

        if (currentStock < quantity) {
            toast({
                title: "Not enough stock",
                description: `Only ${currentStock} items available`,
                variant: "destructive",
            });
            return;
        }

        addToCart(product, selectedVariant || undefined, quantity);

        toast({
            title: "Added to cart",
            description: `${product.name} has been added to your bag`,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-primary text-xl animate-pulse">Loading product...</div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <h1 className="text-2xl font-heading text-foreground mb-4">Product Not Found</h1>
                <Link href="/">
                    <Button variant="outline" className="border-primary text-primary">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Shop
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-4 sm:py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-8 overflow-x-auto">
                <Link href="/"><span className="hover:text-primary cursor-pointer whitespace-nowrap">Home</span></Link>
                <span>/</span>
                <Link href={`/shop?category=${product.category}`}>
                    <span className="hover:text-primary cursor-pointer whitespace-nowrap">{product.category}</span>
                </Link>
                <span>/</span>
                <span className="text-foreground truncate max-w-[150px] sm:max-w-none">{product.name}</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    {/* Main Image */}
                    <div
                        className="relative aspect-square bg-secondary rounded-lg cursor-zoom-in group flex items-center justify-center p-4"
                        onClick={() => setIsZoomed(!isZoomed)}
                    >
                        <AnimatePresence mode="wait">
                            {images[selectedImageIndex]?.url ? (
                                <motion.div
                                    key={selectedImageIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    <UpscaledImage
                                        src={images[selectedImageIndex].url}
                                        alt={images[selectedImageIndex]?.altText || product.name}
                                        className="max-w-full max-h-full w-auto h-auto object-contain"
                                        scale={2}
                                        fallbackScale={1.5}
                                        loading="eager"
                                        decoding="async"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder.svg';
                                            target.onerror = null;
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.img
                                    key="placeholder"
                                    src="/placeholder.svg"
                                    alt={product.name}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="max-w-full max-h-full w-auto h-auto object-contain"
                                />
                            )}
                        </AnimatePresence>

                        {/* Low Stock Badge */}
                        {currentStock > 0 && currentStock <= (product.lowStockThreshold || 5) && (
                            <Badge className="absolute top-4 left-4 bg-destructive">
                                Only {currentStock} left
                            </Badge>
                        )}

                        {/* Out of Stock Overlay */}
                        {currentStock === 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-2xl font-heading">OUT OF STOCK</span>
                            </div>
                        )}

                        {/* Zoom Icon */}
                        <div className="absolute bottom-4 right-4 bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-5 w-5 text-white" />
                        </div>

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImageIndex(i => i === 0 ? images.length - 1 : i - 1);
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImageIndex(i => i === images.length - 1 ? 0 : i + 1);
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Gallery */}
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {images.map((image, index) => (
                                <button
                                    key={image.id}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${selectedImageIndex === index ? 'border-primary' : 'border-transparent'
                                        }`}
                                >
                                    <UpscaledImage
                                        src={image.url || '/placeholder.svg'}
                                        alt={image.altText || `${product.name} ${index + 1}`}
                                        className="w-full h-full object-contain"
                                        scale={1.5}
                                        fallbackScale={1.2}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder.svg';
                                            target.onerror = null;
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    {/* Brand & Category */}
                    <div className="flex items-center gap-4">
                        <span className="text-primary text-sm uppercase tracking-widest">{product.brand}</span>
                        <Badge variant="secondary">{product.subCategory}</Badge>
                    </div>

                    {/* Name */}
                    <h1 className="font-heading text-3xl md:text-4xl text-foreground">{product.name}</h1>

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-mono text-primary">₹{currentPrice.toLocaleString()}</span>
                        {comparePrice && comparePrice > currentPrice && (
                            <>
                                <span className="text-lg text-muted-foreground line-through">
                                    ₹{comparePrice.toLocaleString()}
                                </span>
                                <Badge className="bg-green-500">
                                    {Math.round((1 - currentPrice / comparePrice) * 100)}% OFF
                                </Badge>
                            </>
                        )}
                    </div>

                    {/* Short Description */}
                    {product.shortDescription && (
                        <p className="text-muted-foreground">{product.shortDescription}</p>
                    )}

                    {/* Size Selector */}
                    {sizes.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-medium">Size</Label>
                                <button className="text-xs text-primary hover:underline">Size Guide</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sizes.map((size) => {
                                    const variantsWithSize = product.variants.filter(v => v.size === size);
                                    const hasStock = variantsWithSize.some(v => v.stock > 0);
                                    const isSelected = selectedSize === size;

                                    return (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size as string)}
                                            disabled={!hasStock}
                                            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${isSelected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : hasStock
                                                    ? 'border-white/20 hover:border-primary'
                                                    : 'border-white/10 text-muted-foreground line-through cursor-not-allowed'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Color Selector */}
                    {colors.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                Color: <span className="text-muted-foreground font-normal">{selectedColor}</span>
                            </Label>
                            <div className="flex flex-wrap gap-3">
                                {colors.map((color) => {
                                    const variant = product.variants.find(v => v.color === color);
                                    const hasStock = product.variants.some(v => v.color === color && v.stock > 0);
                                    const isSelected = selectedColor === color;

                                    return (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color as string)}
                                            disabled={!hasStock}
                                            className={`relative w-10 h-10 rounded-full border-2 transition-all ${isSelected ? 'border-primary scale-110' : 'border-white/20'
                                                } ${!hasStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            style={{ backgroundColor: variant?.colorCode || color as string }}
                                            title={color as string}
                                        >
                                            {isSelected && (
                                                <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
                                            )}
                                            {!hasStock && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-full h-0.5 bg-white rotate-45" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Quantity</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center border border-white/20 rounded-md">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="px-3 py-2 hover:bg-white/5 transition-colors"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="px-4 py-2 min-w-[50px] text-center font-mono">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(currentStock, q + 1))}
                                    className="px-3 py-2 hover:bg-white/5 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {currentStock} available
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            onClick={handleAddToCart}
                            disabled={currentStock === 0}
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-14 font-heading tracking-widest text-lg"
                        >
                            <ShoppingBag className="mr-2 h-5 w-5" />
                            {currentStock === 0 ? 'OUT OF STOCK' : 'ADD TO BAG'}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 border-white/20 hover:border-primary"
                        >
                            <Heart className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 border-white/20 hover:border-primary"
                        >
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                        <div className="text-center">
                            <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-xs text-muted-foreground">Free Shipping<br />over ₹10,000</p>
                        </div>
                        <div className="text-center">
                            <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-xs text-muted-foreground">100%<br />Authentic</p>
                        </div>
                        <div className="text-center">
                            <RefreshCw className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-xs text-muted-foreground">Easy<br />Returns</p>
                        </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div className="pt-6 border-t border-white/10">
                            <h3 className="font-heading text-lg mb-3">Description</h3>
                            <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                                {product.description}
                            </div>
                        </div>
                    )}

                    {/* SKU */}
                    {selectedVariant?.sku && (
                        <p className="text-xs text-muted-foreground">
                            SKU: {selectedVariant.sku}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
    return <label className={className}>{children}</label>;
}
