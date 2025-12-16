"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPassword() {
    const { forgotPassword } = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await forgotPassword(email);

            if (result.success) {
                setEmailSent(true);
                toast({
                    title: "Email sent!",
                    description: "Check your inbox for the password reset link.",
                });
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-card border border-white/10 rounded-lg p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h1 className="font-heading text-2xl text-foreground mb-2">Check Your Email</h1>
                        <p className="text-muted-foreground text-sm mb-6">
                            We've sent a password reset link to <strong className="text-foreground">{email}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mb-6">
                            The link will expire in 1 hour. If you don't see the email, check your spam folder.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setEmailSent(false)}
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Try a different email
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-card border border-white/10 rounded-lg p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="font-heading text-3xl text-primary mb-2">
                            Forgot Password?
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Enter your email and we'll send you a reset link
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleForgotPassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm text-foreground">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 bg-background border-white/10 focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-heading tracking-widest"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    SEND RESET LINK
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                        <Link href="/login">
                            <span className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to login
                            </span>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
