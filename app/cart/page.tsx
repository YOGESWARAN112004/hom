"use client";

import { useShop } from "@/hooks/use-shop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, cartTotal, isLoadingProducts } = useShop();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (cart.length === 0) {
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

    const shippingEstimate = cartTotal > 10000 ? 0 : 500;
    const total = cartTotal + shippingEstimate;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.map((item) => (
                        <Card key={item.id}>
                            <CardContent className="p-4 flex gap-4">
                                <div className="h-24 w-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div>
                                            <h3 className="font-medium text-lg">{item.name}</h3>
                                            <p className="text-sm text-gray-500">{formatPrice(parseFloat(item.price))}</p>
                                            {(item.size || item.color) && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {item.size && `Size: ${item.size}`}{item.size && item.color && ' | '}{item.color && `Color: ${item.color}`}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive h-8 w-8"
                                            onClick={() => removeFromCart(item.id)}
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
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none"
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="font-medium">
                                            {formatPrice(parseFloat(item.price) * item.quantity)}
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
                                <span>{formatPrice(cartTotal)}</span>
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
