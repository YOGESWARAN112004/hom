import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-secondary/30 py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">Frequently Asked Questions</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Common questions about our products and services.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <Accordion type="single" collapsible className="w-full space-y-4">

                    <AccordionItem value="item-1" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            Are your products authentic?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Absolutely. We guarantee 100% authenticity on all items sold through Houses of Medusa. We source directly from authorized distributors and vetted partners.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            How long does shipping take?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Our standard processing and shipping time is 15 to 21 days for most locations. This allows us to ensure the quality and secure handling of your luxury items.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            What is your return policy?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            We accept returns within 2 days of delivery. Items must be unworn, with all original tags attached. Please visit our <a href="/shipping-returns" className="text-primary underline">Shipping & Returns</a> page for the full policy details.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            Do you ship internationally?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Yes, we ship globally. However, shipping times and customs duties may vary depending on the destination country.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            How can I track my order?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Once your order ships, you will receive an email with a tracking number. You can also log in to your account and view your order history to see the current status.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-6" className="border border-white/5 rounded-lg px-4 bg-card">
                        <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary">
                            What payment methods do you accept?
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            We accept major credit/debit cards, UPI, and net banking via our secure payment gateways.
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </div>
        </div>
    );
}
