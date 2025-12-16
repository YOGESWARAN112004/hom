
"use client";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils"; // Assuming utils exists, otherwise I'll use simple formatting
import { useEffect, useState } from "react";

export default function CartPage() {
    const cart = useCart();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (cart.items.length === 0) {
        return (
            <div className="container mx-auto py-16 px-4 text-center">
                <div className="flex justify-center mb-4">
                    <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
                <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link href="/shop">
                    <Button>Start Shopping</Button>
                </Link>
            </div>
        );
    }

    const subtotal = cart.getSubtotal();
    const shippingEstimate = subtotal > 10000 ? 0 : 500;
    const total = subtotal + shippingEstimate;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.items.map((item) => (
                        <Card key={`${item.productId}-${item.variantId}`}>
                            <CardContent className="p-4 flex gap-4">
                                {item.imageUrl && (
                                    <div className="h-24 w-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div>
                                            <h3 className="font-medium text-lg">{item.name}</h3>
                                            <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive h-8 w-8"
                                            onClick={() => cart.removeItem(item.productId, item.variantId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="flex items-center space-x-2 border rounded-md">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none"
                                                onClick={() => cart.updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.variantId)}
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none"
                                                onClick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="font-medium">
                                            {formatPrice(item.price * item.quantity)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping Estimate</span>
                                <span>{shippingEstimate === 0 ? "Free" : formatPrice(shippingEstimate)}</span>
                            </div>
                            <div className="border-t pt-4 flex justify-between font-medium text-lg">
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" size="lg" onClick={() => router.push("/checkout")}>
                                Proceed to Checkout
                            </Button>
                        </CardFooter>
                    </Card>
                    <div className="mt-4 text-center">
                        <Link href="/shop" className="text-sm text-primary hover:underline">
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatPrice(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
