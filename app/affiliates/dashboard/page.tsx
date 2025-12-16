
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, TrendingUp, DollarSign, MousePointer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function AffiliateDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const { data: affiliate, isLoading } = useQuery({
        queryKey: ['affiliate-me'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/affiliates/me"));
            if (res.status === 404) return null;
            if (!res.ok) throw new Error("Failed to fetch affiliate details");
            return res.json();
        },
        enabled: !!user
    });

    if (authLoading || isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    if (!user) {
        router.push("/auth?mode=login&redirect=/affiliates/dashboard");
        return null;
    }

    if (!affiliate) {
        // Not an affiliate, redirect to apply
        router.push("/affiliates/apply");
        return null;
    }

    if (affiliate.status === 'pending') {
        return (
            <div className="container mx-auto py-16 px-4 text-center">
                <h1 className="text-3xl font-bold mb-4">Application Pending</h1>
                <p className="text-muted-foreground mb-8">Your affiliate application is currently being reviewed. We will notify you once it is approved.</p>
                <Link href="/"><Button>Back to Home</Button></Link>
            </div>
        );
    }

    if (affiliate.status === 'rejected') {
        return (
            <div className="container mx-auto py-16 px-4 text-center">
                <h1 className="text-3xl font-bold mb-4 text-destructive">Application Rejected</h1>
                <p className="text-muted-foreground mb-8">Reason: {affiliate.rejectionReason || "Criteria not met"}</p>
                <Link href="/affiliates/apply"><Button>Re-apply</Button></Link>
            </div>
        );
    }

    const affiliateLink = typeof window !== 'undefined' ? `${window.location.origin}/shop?ref=${affiliate.code}` : `.../shop?ref=${affiliate.code}`;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {user.firstName}!</p>
            </div>

            {/* Unique Link Section */}
            <Card className="mb-8 bg-primary/5 border-primary/20">
                <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
                    <div>
                        <h3 className="font-semibold mb-1">Your Referral Link</h3>
                        <p className="text-sm text-muted-foreground">Share this link to earn commissions</p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <code className="bg-background px-4 py-2 rounded border font-mono text-sm flex-1 md:flex-none truncate max-w-[300px]">
                            {affiliateLink}
                        </code>
                        <Button size="icon" variant="outline" onClick={() => {
                            navigator.clipboard.writeText(affiliateLink);
                            toast({ title: "Copied!", description: "Link copied to clipboard" });
                        }}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(affiliate.totalEarnings)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.commissionRate}%</div>
                        <p className="text-xs text-muted-foreground">Per sale</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.clicks || 0}</div>
                        <p className="text-xs text-muted-foreground">Link visits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.sales || 0}</div>
                        <p className="text-xs text-muted-foreground">Converted orders</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity or Detailed Stats could go here */}
            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            Paid Earnings: <span className="font-semibold text-foreground">{formatCurrency(affiliate.paidEarnings)}</span>
                            <br />
                            Pending Payout: <span className="font-semibold text-foreground">{formatCurrency(Number(affiliate.totalEarnings) - Number(affiliate.paidEarnings))}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p>1. Copy your unique referral link.</p>
                        <p>2. Share it on your social media, blog, or with friends.</p>
                        <p>3. Earn {affiliate.commissionRate}% commission on every successful purchase made through your link.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
