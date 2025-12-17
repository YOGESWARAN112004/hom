
"use client";

import { useShop } from "@/hooks/use-shop";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function BrandPage() {
    const { slug } = useParams();
    const { products, addToCart } = useShop();
    const [brandName, setBrandName] = useState<string>("");

    const brandSlug = Array.isArray(slug) ? slug[0] : slug;

    // Filter products by brand slug (approximate matching for now)
    // Ideally, we should fetch brand details by slug from API
    const brandProducts = products.filter(p => {
        // Simple normalization for matching
        const pBrandSlug = p.brand.toLowerCase().replace(/\s+/g, '-');
        return pBrandSlug === brandSlug || p.brand.toLowerCase() === brandSlug?.replace(/-/g, ' ');
    });

    useEffect(() => {
        if (brandSlug) {
            // Capitalize for display
            const name = brandSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            setBrandName(name);
        }
    }, [brandSlug]);

    if (!brandSlug) return <div>Invalid Brand</div>;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>
                <h1 className="font-heading text-4xl sm:text-6xl mt-4 mb-2">{brandName}</h1>
                <p className="text-muted-foreground">Discover the latest collection from {brandName}.</p>
            </div>

            {brandProducts.length === 0 ? (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                    <p className="text-xl mb-4">No products found for this brand.</p>
                    <Link href="/shop">
                        <Button>View All Collections</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {brandProducts.map(product => (
                        <div key={product.id} className="group cursor-pointer">
                            <Link href={`/product/${product.id}`}>
                                <div className="relative aspect-[3/4] bg-secondary mb-4 overflow-hidden">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-heading text-lg group-hover:text-primary transition-colors">{product.name}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{product.category}</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono">₹{product.basePrice}</span>
                                </div>
                            </Link>
                            <Button
                                onClick={() => addToCart(product)}
                                className="w-full mt-3"
                                variant="outline"
                            >
                                Add to Cart
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
