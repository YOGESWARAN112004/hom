
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";

export default function AffiliateApplyPage() {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [formData, setFormData] = useState({
        website: "",
        instagram: "",
        tiktok: "",
        bio: "",
        promotionStrategy: "",
    });

    const applyMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(getApiUrl("/api/affiliates/apply"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to submit application");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Application Submitted",
                description: "Your affiliate application has been received. We will review it shortly.",
            });
            router.push("/account");
        },
        onError: (error: Error) => {
            toast({
                title: "Application Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast({ title: "Please login first", description: "You must be logged in to apply." });
            router.push("/login?redirect=/affiliates/apply");
            return;
        }
        applyMutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Apply for Affiliate Program</CardTitle>
                    <CardDescription>
                        Join our exclusive affiliate program and earn commissions on every sale you refer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website / Blog URL</Label>
                            <Input
                                id="website"
                                name="website"
                                placeholder="https://yourblog.com"
                                value={formData.website}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="instagram">Instagram Handle</Label>
                                <Input
                                    id="instagram"
                                    name="instagram"
                                    placeholder="@username"
                                    value={formData.instagram}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tiktok">TikTok Handle</Label>
                                <Input
                                    id="tiktok"
                                    name="tiktok"
                                    placeholder="@username"
                                    value={formData.tiktok}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">About You</Label>
                            <Textarea
                                id="bio"
                                name="bio"
                                placeholder="Tell us a bit about yourself and your audience..."
                                value={formData.bio}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="promotionStrategy">Promotion Strategy</Label>
                            <Textarea
                                id="promotionStrategy"
                                name="promotionStrategy"
                                placeholder="How do you plan to promote our products?"
                                value={formData.promotionStrategy}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={applyMutation.isPending}>
                            {applyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Submit Application
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
