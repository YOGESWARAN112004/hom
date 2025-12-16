import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/context/shop-context";
import { useAuth } from "@/context/auth-context";
import { getApiUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateImageSrcSet } from "@/lib/imageUtils";
import {
  Check,
  MapPin,
  CreditCard,
  Package,
  ChevronRight,
  ChevronLeft,
  Plus,
  Loader2,
  Home,
  Building,
  Lock,
  Smartphone,
  Wallet,
} from "lucide-react";

interface Address {
  id: string;
  type: string;
  label: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark: string | null;
  isDefault: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const STEPS = [
  { id: 1, name: "Address", icon: MapPin },
  { id: 2, name: "Review", icon: Package },
  { id: 3, name: "Payment", icon: CreditCard },
];

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { cart, cartTotal, removeFromCart, affiliateCode } = useShop();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    landmark: "",
    label: "Home",
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (cart.length === 0 && !orderId) {
      setLocation("/cart");
    }
  }, [isAuthenticated, cart.length, orderId, setLocation]);

  // Fetch addresses
  const { data: addresses = [], isLoading: addressesLoading, refetch: refetchAddresses } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: isAuthenticated,
  });

  // Auto-select default address
  useEffect(() => {
    if (addresses.length && !selectedAddressId) {
      const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses, selectedAddressId]);

  // Get Razorpay config
  const { data: paymentConfig } = useQuery<{ configured: boolean; keyId: string }>({
    queryKey: ["/api/payments/config"],
  });

  const shippingCost = cartTotal >= 10000 ? 0 : 500;
  const totalAmount = cartTotal + shippingCost;

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof addressForm) => {
      const res = await fetch(getApiUrl("/api/addresses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "shipping", isDefault: addresses.length === 0 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create address");
      return res.json();
    },
    onSuccess: (newAddress) => {
      refetchAddresses();
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);
      toast({ title: "Address saved!" });
    },
    onError: () => {
      toast({ title: "Failed to save address", variant: "destructive" });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.id,
            variantId: null, // TODO: Get variant ID from cart
            quantity: item.quantity,
          })),
          shippingAddressId: selectedAddressId,
          affiliateCode: affiliateCode || null,
          customerNotes,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
  });

  // Create Razorpay order mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(getApiUrl("/api/payments/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create payment");
      return res.json();
    },
  });

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(getApiUrl("/api/payments/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Payment verification failed");
      return res.json();
    },
  });

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAddressMutation.mutate(addressForm);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast({ title: "Please select a delivery address", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order in database
      const order = await createOrderMutation.mutateAsync();
      setOrderId(order.id);

      // 2. Create Razorpay order
      const paymentData = await createPaymentMutation.mutateAsync(order.id);

      // 3. Open Razorpay checkout
      const options: any = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "Houses of Medusa",
        description: `Order #${order.orderNumber}`,
        order_id: paymentData.razorpayOrderId,
        handler: async (response: any) => {
          try {
            // 4. Verify payment
            const result = await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order.id,
            });

            if (result.success) {
              toast({ title: "Payment successful!", description: "Your order has been placed." });
              setLocation(`/orders/${order.id}`);
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            toast({ title: "Payment verification failed", variant: "destructive" });
          }
        },
        prefill: {
          name: selectedAddress?.fullName || user?.firstName || "",
          email: user?.email || "",
          contact: selectedAddress?.phone || user?.phone || "",
        },
        theme: {
          color: "#d9a520",
        },
        // Enable all payment methods including UPI
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({ title: "Payment cancelled", description: "You can complete the payment later from your orders page." });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Checkout error:", error);
      toast({ title: "Failed to process order", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !selectedAddressId) {
      toast({ title: "Please select a delivery address", variant: "destructive" });
      return;
    }
    setCurrentStep(s => Math.min(3, s + 1));
  };

  const prevStep = () => setCurrentStep(s => Math.max(1, s - 1));

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep >= step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-white/20 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? "bg-primary" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Address Selection */}
            {currentStep === 1 && (
              <motion.div
                key="address"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-heading text-2xl text-foreground">Delivery Address</h2>

                {addressesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Address List */}
                    <div className="grid gap-4">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          onClick={() => setSelectedAddressId(address.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === address.id
                              ? "border-primary bg-primary/5"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                selectedAddressId === address.id ? "bg-primary" : "bg-white/5"
                              }`}>
                                {address.label === "Office" ? (
                                  <Building className="h-4 w-4" />
                                ) : (
                                  <Home className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{address.fullName}</span>
                                  {address.isDefault && (
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{address.phone}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedAddressId === address.id
                                ? "border-primary"
                                : "border-white/20"
                            }`}>
                              {selectedAddressId === address.id && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-3 pl-13">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                            <br />
                            {address.city}, {address.state} {address.postalCode}
                            <br />
                            {address.country}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Add New Address */}
                    {!showAddressForm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowAddressForm(true)}
                        className="w-full border-dashed border-white/20"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Address
                      </Button>
                    ) : (
                      <form onSubmit={handleAddressSubmit} className="bg-card border border-white/10 rounded-lg p-6 space-y-4">
                        <h3 className="font-heading text-lg mb-4">New Address</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Full Name *</Label>
                            <Input
                              value={addressForm.fullName}
                              onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                              className="bg-background border-white/10"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number *</Label>
                            <Input
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                              className="bg-background border-white/10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Address Line 1 *</Label>
                          <Input
                            value={addressForm.addressLine1}
                            onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                            placeholder="House/Flat No., Building, Street"
                            className="bg-background border-white/10"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Address Line 2</Label>
                          <Input
                            value={addressForm.addressLine2}
                            onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                            placeholder="Area, Locality (optional)"
                            className="bg-background border-white/10"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>City *</Label>
                            <Input
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              className="bg-background border-white/10"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>State *</Label>
                            <Input
                              value={addressForm.state}
                              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                              className="bg-background border-white/10"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>PIN Code *</Label>
                            <Input
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                              className="bg-background border-white/10"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Landmark</Label>
                            <Input
                              value={addressForm.landmark}
                              onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                              placeholder="Near..."
                              className="bg-background border-white/10"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddressForm(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createAddressMutation.isPending}
                            className="flex-1 bg-primary text-primary-foreground"
                          >
                            {createAddressMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save Address"
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Review Order */}
            {currentStep === 2 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-heading text-2xl text-foreground">Review Your Order</h2>

                {/* Delivery Address */}
                {selectedAddress && (
                  <div className="bg-card border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-foreground mb-1">Delivering to:</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedAddress.fullName}<br />
                          {selectedAddress.addressLine1}
                          {selectedAddress.addressLine2 && `, ${selectedAddress.addressLine2}`}<br />
                          {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}<br />
                          Phone: {selectedAddress.phone}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-primary">
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Items ({cart.length})</h3>
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 bg-card border border-white/10 rounded-lg p-4">
                      <div className="w-16 h-16 bg-secondary rounded overflow-hidden">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            srcSet={generateImageSrcSet(item.imageUrl, { widths: [128, 256, 384], maxWidth: 384 })}
                            sizes="64px"
                            alt={item.name} 
                            className="w-full h-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-primary uppercase">{item.brand}</p>
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-mono text-primary">
                        ₹{(parseFloat(item.price) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order Notes */}
                <div className="space-y-2">
                  <Label>Order Notes (Optional)</Label>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Any special instructions for your order..."
                    className="bg-background border-white/10"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-heading text-2xl text-foreground">Payment</h2>

                <div className="bg-card border border-white/10 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <img src="/razorpay-logo.svg" alt="Razorpay" className="h-8" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                    <div>
                      <h3 className="font-medium text-foreground">Secure Payment</h3>
                      <p className="text-sm text-muted-foreground">
                        Pay securely with Razorpay - UPI, Cards, Net Banking, Wallets & more
                      </p>
                    </div>
                  </div>

                  {/* Available Payment Methods */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Available Payment Methods</Label>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <span className="text-xs text-foreground">UPI</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-xs text-foreground">Cards</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="text-xs text-foreground">Net Banking</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="text-xs text-foreground">Wallets</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <Lock className="h-5 w-5 text-primary" />
                      <span>Your payment is 100% secure. We don't store your card details.</span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || !paymentConfig?.configured}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 font-heading tracking-widest text-lg"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        PAY ₹{totalAmount.toLocaleString()}
                        <Lock className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {!paymentConfig?.configured && (
                    <p className="text-sm text-destructive text-center mt-4">
                      Payment gateway is not configured. Please contact support.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep < 3 && (
              <Button onClick={nextStep} className="bg-primary text-primary-foreground">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-white/10 rounded-lg p-6 sticky top-24">
            <h2 className="font-heading text-xl text-foreground mb-6">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                <span className="font-mono">₹{cartTotal.toLocaleString()}</span>
              </div>
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
            </div>

            <div className="border-t border-white/10 my-4" />

            <div className="flex justify-between items-baseline">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-mono text-primary">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

