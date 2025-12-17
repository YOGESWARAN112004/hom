
"use client";

import { useShop } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";
import Script from "next/script";

// Define strict types for Razorpay
declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CheckoutPage() {
    const { cart, cartTotal, clearCart } = useShop();
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);

    // Checkout State
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

    // Shipping State
    const [shippingDetails, setShippingDetails] = useState({
        fullName: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
    });

    useEffect(() => {
        setIsMounted(true);
        if (user) {
            setShippingDetails(prev => ({
                ...prev,
                email: user.email,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            }));
        }
    }, [user]);

    if (!isMounted || authLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (cart.length === 0) {
        router.push("/cart");
        return null;
    }

    const subtotal = cartTotal;
    const shippingCost = subtotal > 10000 ? 0 : 500;
    const finalTotal = Math.max(0, subtotal + shippingCost - discount);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setLoading(true);
        try {
            const res = await fetch(getApiUrl("/api/coupons/validate"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: couponCode, amount: subtotal }),
            });

            const data = await res.json();
            if (data.valid) {
                setDiscount(data.discount);
                setAppliedCoupon(couponCode);
                toast({ title: "Coupon Applied", description: `You saved ${formatCurrency(data.discount)}!` });
            } else {
                toast({ title: "Invalid Coupon", description: data.message, variant: "destructive" });
                setDiscount(0);
                setAppliedCoupon(null);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to validate coupon", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Order (Pending)
            const orderRes = await fetch(getApiUrl("/api/orders"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart, // Pass cart items explicitly if needed by API, though backend usually refetches
                    shippingAddress: shippingDetails,
                    couponCode: appliedCoupon,
                    paymentMethod: "razorpay"
                }),
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const order = await orderRes.json();

            // 2. Initialize Razorpay Payment
            const paymentRes = await fetch(getApiUrl("/api/payments/create-order"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id }),
            });

            if (!paymentRes.ok) throw new Error("Payment initialization failed");
            const paymentData = await paymentRes.json();

            // 3. Open Razorpay Modal
            const options = {
                key: paymentData.keyId,
                amount: paymentData.amount,
                currency: paymentData.currency,
                name: "Luxury Commerce Hub",
                description: `Order #${order.orderNumber}`,
                order_id: paymentData.razorpayOrderId,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch(getApiUrl("/api/payments/verify"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                orderId: order.id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            clearCart();
                            toast({ title: "Order Placed!", description: "Thank you for your purchase." });
                            router.push("/account"); // Or order confirmation page
                        } else {
                            throw new Error("Payment verification failed");
                        }
                    } catch (error) {
                        toast({ title: "Payment Failed", description: "Verification failed. Please contact support.", variant: "destructive" });
                    }
                },
                prefill: {
                    name: shippingDetails.fullName,
                    email: shippingDetails.email,
                    contact: shippingDetails.phone,
                },
                theme: { color: "#000000" },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error("Checkout error:", error);
            toast({ title: "Checkout Error", description: error.message || "Something went wrong", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Shipping Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Shipping Details</CardTitle></CardHeader>
                        <CardContent>
                            <form id="checkout-form" onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <Label>Full Name</Label>
                                    <Input value={shippingDetails.fullName} onChange={e => setShippingDetails({ ...shippingDetails, fullName: e.target.value })} required />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <Label>Phone</Label>
                                    <Input value={shippingDetails.phone} onChange={e => setShippingDetails({ ...shippingDetails, phone: e.target.value })} required />
                                </div>
                                <div className="col-span-2">
                                    <Label>Address</Label>
                                    <Input value={shippingDetails.address} onChange={e => setShippingDetails({ ...shippingDetails, address: e.target.value })} required />
                                </div>
                                <div>
                                    <Label>City</Label>
                                    <Input value={shippingDetails.city} onChange={e => setShippingDetails({ ...shippingDetails, city: e.target.value })} required />
                                </div>
                                <div>
                                    <Label>State</Label>
                                    <Input value={shippingDetails.state} onChange={e => setShippingDetails({ ...shippingDetails, state: e.target.value })} required />
                                </div>
                                <div>
                                    <Label>ZIP Code</Label>
                                    <Input value={shippingDetails.zipCode} onChange={e => setShippingDetails({ ...shippingDetails, zipCode: e.target.value })} required />
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.name} x {item.quantity}</span>
                                    <span>{formatCurrency(parseFloat(item.price) * item.quantity)}</span>
                                </div>
                            ))}
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>{shippingEstimate(subtotal) === 0 ? "Free" : formatCurrency(shippingEstimate(subtotal))}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount ({appliedCoupon})</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            <div className="border-t pt-4 flex justify-between font-medium text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Coupon Code */}
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4" /> Coupon Code</CardTitle></CardHeader>
                        <CardContent className="flex gap-2">
                            <Input placeholder="Enter code" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                            <Button variant="secondary" onClick={handleApplyCoupon} disabled={loading || !couponCode}>Apply</Button>
                        </CardContent>
                    </Card>

                    <Button form="checkout-form" type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pay Now
                    </Button>
                </div>
            </div>
        </div>
    );
}

function shippingEstimate(subtotal: number) {
    return subtotal > 10000 ? 0 : 500;
}
