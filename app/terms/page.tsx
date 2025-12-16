
export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-secondary/30 py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">Terms of Service</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Please read these terms carefully before using our services.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">2. Purchases</h2>
                        <p>
                            If you wish to purchase any product or service made available through the Service, you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">3. Accounts</h2>
                        <p>
                            When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">4. Intellectual Property</h2>
                        <p>
                            The Service and its original content, features, and functionality are and will remain the exclusive property of House of Medusa and its licensors.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">5. Governing Law</h2>
                        <p>
                            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">6. Changes</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms, please contact us at <span className="text-primary">housesofmedusa@gmail.com</span>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
