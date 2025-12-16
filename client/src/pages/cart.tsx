import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useShop } from "@/context/shop-context";
import { useAuth } from "@/context/auth-context";
import { getApiUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateImageSrcSet } from "@/lib/imageUtils";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Tag,
  Truck,
  Shield,
  Lock,
  ChevronLeft,
} from "lucide-react";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { cart, cartTotal, removeFromCart, updateQuantity } = useShop();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const shippingCost = cartTotal >= 10000 ? 0 : 500;
  const totalAmount = cartTotal - couponDiscount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const res = await fetch(getApiUrl('/api/coupons/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderAmount: cartTotal }),
      });
      const data = await res.json();

      if (data.valid) {
        setCouponDiscount(data.discount);
        toast({
          title: "Coupon applied!",
          description: `You saved ₹${data.discount.toLocaleString()}`,
        });
      } else {
        toast({
          title: "Invalid coupon",
          description: data.message || "This coupon cannot be applied",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate coupon",
        variant: "destructive",
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to checkout",
      });
      setLocation("/login");
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart first",
        variant: "destructive",
      });
      return;
    }

    setLocation("/checkout");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingBag className="h-20 w-20 mx-auto mb-6 text-muted-foreground opacity-30" />
          <h1 className="font-heading text-3xl text-foreground mb-4">Your Bag is Empty</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Looks like you haven't added any treasures yet. Explore our collection and find something you'll love.
          </p>
          <Link href="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-widest">
              <ChevronLeft className="mr-2 h-4 w-4" />
              CONTINUE SHOPPING
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="font-heading text-3xl md:text-4xl text-primary mb-8">Shopping Bag</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4 bg-card border border-white/10 rounded-lg p-4"
            >
              {/* Image */}
              <Link href={`/product/${item.id}`}>
                <div className="w-24 h-24 md:w-32 md:h-32 bg-secondary rounded-md overflow-hidden flex-shrink-0 cursor-pointer">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      srcSet={generateImageSrcSet(item.imageUrl, { widths: [192, 384, 512], maxWidth: 512 })}
                      sizes="128px"
                      alt={item.name}
                      className="w-full h-full object-contain hover:scale-105 transition-transform"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-primary uppercase tracking-wider mb-1">{item.brand}</p>
                  <Link href={`/product/${item.id}`}>
                    <h3 className="font-heading text-lg text-foreground hover:text-primary cursor-pointer">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.category} / {item.subCategory}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  {/* Quantity */}
                  <div className="flex items-center border border-white/20 rounded-md">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="px-2 py-1 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 py-1 min-w-[40px] text-center text-sm font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 hover:bg-white/5 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Price */}
                  <p className="font-mono text-primary text-lg">
                    ₹{(parseFloat(item.price) * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.id)}
                className="self-start p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}

          {/* Continue Shopping */}
          <Link href="/">
            <span className="inline-flex items-center text-primary hover:underline cursor-pointer text-sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Continue Shopping
            </span>
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-white/10 rounded-lg p-6 sticky top-24">
            <h2 className="font-heading text-xl text-foreground mb-6">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="pl-10 bg-background border-white/10"
                  />
                </div>
                <Button
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Apply
                </Button>
              </div>
              {couponDiscount > 0 && (
                <p className="text-sm text-green-500 mt-2">
                  Coupon applied: -₹{couponDiscount.toLocaleString()}
                </p>
              )}
            </div>

            {/* Summary Lines */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                <span className="font-mono">₹{cartTotal.toLocaleString()}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Discount</span>
                  <span className="font-mono">-₹{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-mono">
                  {shippingCost === 0 ? (
                    <span className="text-green-500">FREE</span>
                  ) : (
                    `₹${shippingCost.toLocaleString()}`
                  )}
                </span>
              </div>
              {shippingCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Free shipping on orders over ₹10,000
                </p>
              )}
            </div>

            <div className="border-t border-white/10 my-4" />

            {/* Total */}
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-mono text-primary">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 font-heading tracking-widest text-lg"
            >
              PROCEED TO CHECKOUT
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            {/* Trust Badges */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Lock className="h-4 w-4 text-primary" />
                <span>Secure checkout with SSL encryption</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>100% authentic products guaranteed</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" />
                <span>Express delivery available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

