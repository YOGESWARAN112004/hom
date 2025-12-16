import { Truck, RotateCcw, ShieldCheck, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ShippingReturnsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-secondary/30 py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">Shipping & Returns</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Transparent policies for a seamless shopping experience.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl">

                {/* Shipping Section */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Truck className="h-8 w-8 text-primary" />
                        <h2 className="font-heading text-3xl">Shipping Policy</h2>
                    </div>

                    <div className="bg-card border border-white/5 rounded-lg p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Delivery Timeline</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We take pride in our curated collection. Please allow **15 to 21 days** for your order to be processed, shipped, and delivered to your doorstep. This timeline ensures we can maintain the highest standards of quality control for every item.
                            </p>
                        </div>

                        <Separator className="bg-white/10" />

                        <div>
                            <h3 className="text-xl font-semibold mb-3">Order Tracking</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Once your order is dispatched, you will receive a confirmation email with a tracking number. You can monitor your package's journey through our website or the carrier's portal.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Returns Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <RotateCcw className="h-8 w-8 text-primary" />
                        <h2 className="font-heading text-3xl">Return & Refund Policy</h2>
                    </div>

                    <div className="bg-card border border-white/5 rounded-lg p-6 md:p-8 space-y-6">

                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md flex gap-3 text-destructive-foreground">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold">Important: 2-Day Return Window</h4>
                                <p className="text-sm opacity-90">All return requests must be initiated within 48 hours of delivery.</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-3">Eligibility for Returns</h3>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                To be eligible for a return, your item must meet the following strict criteria ("No Wardrobing Policy"):
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                                <li>Items must be **unworn, unwashed, and unused**.</li>
                                <li>All **original tags** must be attached and intact.</li>
                                <li>The item must be in the **original packaging**.</li>
                                <li>Returns showing any signs of wear, scent (perfume/smoke), or damage will be rejected.</li>
                            </ul>
                        </div>

                        <Separator className="bg-white/10" />

                        <div>
                            <h3 className="text-xl font-semibold mb-3">Return Process</h3>
                            <ol className="list-decimal list-inside space-y-3 text-muted-foreground ml-2">
                                <li>Contact our support team at <span className="text-primary">housesofmedusa@gmail.com</span> within 2 days of receiving your order.</li>
                                <li>Provide your order number and clear photos of the item/tags.</li>
                                <li>Once approved, we will provide instructions for shipping the item back.</li>
                                <li>Upon inspection, refunds will be processed to your original payment method.</li>
                            </ol>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
