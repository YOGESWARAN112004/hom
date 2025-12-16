import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { getApiUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Users, DollarSign, Link as LinkIcon, Loader2, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface AffiliateData {
  id: string;
  code: string;
  status: 'pending' | 'approved' | 'rejected';
  commissionRate: string;
  totalEarnings: string;
  pendingEarnings: string;
  paidEarnings: string;
  websiteUrl: string | null;
  socialMedia: string | null;
  promotionMethod: string | null;
  rejectionReason: string | null;
  createdAt: string;
  stats?: {
    traffic: number;
    sales: number;
    conversionRate: number;
    revenue: string;
  };
}

export default function Affiliate() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [applicationForm, setApplicationForm] = useState({
    websiteUrl: "",
    socialMedia: "",
    promotionMethod: "",
  });

  // Fetch my affiliate data
  const { data: affiliateData, isLoading: affiliateLoading } = useQuery<AffiliateData>({
    queryKey: ['/api/affiliates/my-stats'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Apply for affiliate program
  const applyMutation = useMutation({
    mutationFn: async (data: typeof applicationForm) => {
      const res = await fetch(getApiUrl('/api/affiliates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit application');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates/my-stats'] });
      toast({ title: 'Application Submitted!', description: 'We will review your application shortly.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: `${label} has been copied to clipboard.`,
    });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate(applicationForm);
  };

  if (authLoading || affiliateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - show info page with login prompt
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-16">
          <span className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">Partner Program</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-4">THE MEDUSA CIRCLE</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join our exclusive affiliate program. Share the myth, earn rewards, and become part of our legacy.
          </p>
        </div>

        <ProgramBenefits />

        <Card className="bg-secondary/30 border-white/5 mt-12">
          <CardContent className="py-12 text-center">
            <h3 className="font-heading text-xl mb-4">Ready to Start Earning?</h3>
            <p className="text-muted-foreground mb-6">
              Login or create an account to apply for our affiliate program.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has no affiliate account - show application form
  if (!affiliateData) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-16">
          <span className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">Partner Program</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-4">THE MEDUSA CIRCLE</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join our exclusive affiliate program. Share the myth, earn rewards, and become part of our legacy.
          </p>
        </div>

        <ProgramBenefits />

        <Card className="bg-secondary/30 border-white/5 mt-12">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Apply to Join</CardTitle>
            <CardDescription>
              Tell us about yourself and how you plan to promote our products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-6">
              <div className="space-y-2">
                <Label>Website URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={applicationForm.websiteUrl}
                  onChange={(e) => setApplicationForm({ ...applicationForm, websiteUrl: e.target.value })}
                  className="bg-background/50 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>Social Media Handles (optional)</Label>
                <Input
                  placeholder="@instagram, @twitter, etc."
                  value={applicationForm.socialMedia}
                  onChange={(e) => setApplicationForm({ ...applicationForm, socialMedia: e.target.value })}
                  className="bg-background/50 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>How do you plan to promote our products?</Label>
                <Textarea
                  placeholder="Tell us about your audience and promotional methods..."
                  value={applicationForm.promotionMethod}
                  onChange={(e) => setApplicationForm({ ...applicationForm, promotionMethod: e.target.value })}
                  className="bg-background/50 border-white/10"
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={applyMutation.isPending} className="w-full">
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending status - show waiting message
  if (affiliateData.status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="py-12 text-center">
            <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="font-heading text-2xl mb-4">Application Under Review</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for applying to The Medusa Circle! Our team is reviewing your application.
              We'll notify you once a decision has been made.
            </p>
            <div className="bg-background/50 p-4 rounded-lg inline-block">
              <span className="text-sm text-muted-foreground">Application submitted on</span>
              <div className="font-mono">{new Date(affiliateData.createdAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected status - show rejection message
  if (affiliateData.status === 'rejected') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="font-heading text-2xl mb-4">Application Not Approved</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Unfortunately, your application to join The Medusa Circle was not approved at this time.
            </p>
            {affiliateData.rejectionReason && (
              <div className="bg-background/50 p-4 rounded-lg max-w-md mx-auto">
                <span className="text-sm text-muted-foreground block mb-2">Reason:</span>
                <p className="text-sm">{affiliateData.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved - show full dashboard
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = `${baseUrl}?ref=${affiliateData.code}`;
  const couponCode = affiliateData.code;

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm mb-4">
          <CheckCircle className="h-4 w-4" />
          Approved Affiliate
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-4">Your Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to The Medusa Circle. Track your performance and earnings below.
        </p>
      </div>

      <Card className="bg-secondary/30 border-white/5">
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-background/50 border-b border-white/5 w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6">
                Overview
              </TabsTrigger>
              <TabsTrigger value="links" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6">
                Links & Codes
              </TabsTrigger>
              <TabsTrigger value="earnings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6">
                Earnings
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      Clicks
                    </div>
                    <div className="text-2xl font-bold font-mono">{affiliateData.stats?.traffic || 0}</div>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Sales
                    </div>
                    <div className="text-2xl font-bold font-mono">{affiliateData.stats?.sales || 0}</div>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Revenue Generated
                    </div>
                    <div className="text-2xl font-bold font-mono">₹{parseFloat(affiliateData.stats?.revenue || '0').toLocaleString()}</div>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      Conversion Rate
                    </div>
                    <div className="text-2xl font-bold font-mono text-primary">{affiliateData.stats?.conversionRate || 0}%</div>
                  </div>
                </div>

                {/* Commission Info */}
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">Your Commission Rate</span>
                      <div className="text-3xl font-bold text-primary">{affiliateData.commissionRate}%</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Note</span>
                      <p className="text-sm">Some products may have different commission rates</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-6 mt-0">
                {/* Referral Link */}
                <div className="space-y-2">
                  <Label className="text-base">Your Referral Link</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Share this link to earn commission on purchases made through it.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={referralLink}
                      className="bg-background/50 border-white/10 font-mono"
                    />
                    <Button onClick={() => copyToClipboard(referralLink, 'Referral link')} className="bg-primary text-primary-foreground shrink-0">
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="space-y-2">
                  <Label className="text-base">Your Coupon Code</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Share this code with your audience. When they use it at checkout, you earn commission.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-background/50 border border-white/10 rounded-md px-4 py-2 font-mono text-lg font-bold text-primary">
                      {couponCode}
                    </div>
                    <Button onClick={() => copyToClipboard(couponCode, 'Coupon code')} className="bg-primary text-primary-foreground shrink-0">
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                </div>

                {/* Marketing Tips */}
                <div className="bg-muted/30 p-4 rounded-lg mt-6">
                  <h4 className="font-semibold mb-2">Marketing Tips</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Share your referral link on social media</li>
                    <li>Include your coupon code in your bio</li>
                    <li>Create content featuring our products</li>
                    <li>Mention the discount your followers get when using your code</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="earnings" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-500/10 p-6 rounded-lg border border-green-500/20">
                    <span className="text-sm text-muted-foreground">Total Earnings</span>
                    <div className="text-3xl font-bold font-mono text-green-500">₹{parseFloat(affiliateData.totalEarnings).toLocaleString()}</div>
                  </div>
                  <div className="bg-yellow-500/10 p-6 rounded-lg border border-yellow-500/20">
                    <span className="text-sm text-muted-foreground">Pending Earnings</span>
                    <div className="text-3xl font-bold font-mono text-yellow-500">₹{parseFloat(affiliateData.pendingEarnings).toLocaleString()}</div>
                  </div>
                  <div className="bg-background/50 p-6 rounded-lg border border-white/5">
                    <span className="text-sm text-muted-foreground">Paid Out</span>
                    <div className="text-3xl font-bold font-mono">₹{parseFloat(affiliateData.paidEarnings).toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Payout Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Payouts are processed manually. Contact the admin to request a payout once you have accumulated earnings.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgramBenefits() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="bg-card border-white/5 text-center p-6">
        <CardContent className="pt-6">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg mb-2">10%+ Commission</h3>
          <p className="text-sm text-muted-foreground">Earn generous commissions on every sale. Some products offer even higher rates!</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-white/5 text-center p-6">
        <CardContent className="pt-6">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg mb-2">30-Day Cookie</h3>
          <p className="text-sm text-muted-foreground">We track referrals for 30 days, ensuring you get credit for return visitors.</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-white/5 text-center p-6">
        <CardContent className="pt-6">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg mb-2">Unique Link & Code</h3>
          <p className="text-sm text-muted-foreground">Get your own referral link and coupon code to share with your audience.</p>
        </CardContent>
      </Card>
    </div>
  );
}
