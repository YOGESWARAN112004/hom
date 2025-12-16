export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-secondary/30 py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">Privacy Policy</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Your privacy is critically important to us.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, such as when you create an account, update your profile, make a purchase, or communicate with us. This information may include your name, email address, phone number, shipping address, and payment information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">2. How We Use Your Information</h2>
                        <p>
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                            <li>Process your transactions and deliver your orders.</li>
                            <li>Send you transactional emails, including order confirmations and shipping updates.</li>
                            <li>Respond to your comments and questions and provide customer service.</li>
                            <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
                            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">3. Information Sharing</h2>
                        <p>
                            We do not sell your personal data. We may share your information with third-party service providers who need access to such information to carry out work on our behalf (e.g., payment processors, shipping carriers).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">4. Data Security</h2>
                        <p>
                            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-heading text-foreground mb-4">5. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at <span className="text-primary">housesofmedusa@gmail.com</span>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
