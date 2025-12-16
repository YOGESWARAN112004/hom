
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function AdminAffiliatesPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: affiliates, isLoading } = useQuery({
        queryKey: ['admin-affiliates'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/affiliates/all")); // We need to ensure this endpoint exists
            if (!res.ok) throw new Error("Failed to fetch affiliates");
            return res.json();
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, reason }: { id: string, status: string, reason?: string }) => {
            const res = await fetch(getApiUrl(`/api/affiliates/${id}/status`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, rejectionReason: reason })
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
            toast({ title: "Success", description: "Status updated" });
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    if (authLoading || (isLoading && user?.role === 'admin')) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!user || user.role !== 'admin') {
        router.push("/");
        return null;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Affiliate Management</h1>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Affiliates</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{affiliates?.length || 0}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Approvals</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{affiliates?.filter((a: any) => a.status === 'pending').length || 0}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Paid Out</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(affiliates?.reduce((acc: number, curr: any) => acc + Number(curr.paidEarnings || 0), 0) || 0)}</div></CardContent>
                </Card>
            </div>

            <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Code</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Earnings (Paid/Total)</th>
                            <th className="p-4">Commission</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {affiliates?.map((a: any) => (
                            <tr key={a.id} className="border-t hover:bg-muted/50">
                                <td className="p-4">
                                    <div className="font-medium">{a.user?.firstName} {a.user?.lastName}</div>
                                    <div className="text-xs text-muted-foreground">{a.user?.email}</div>
                                </td>
                                <td className="p-4"><code className="bg-muted px-2 py-1 rounded">{a.code}</code></td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs capitalize ${a.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>{a.status}</span>
                                </td>
                                <td className="p-4">
                                    {formatCurrency(a.paidEarnings)} / {formatCurrency(a.totalEarnings)}
                                </td>
                                <td className="p-4">{a.commissionRate}%</td>
                                <td className="p-4 text-right space-x-2">
                                    {a.status === 'pending' && (
                                        <>
                                            <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                onClick={() => updateStatusMutation.mutate({ id: a.id, status: 'approved' })}
                                            ><Check className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    const reason = prompt("Reason for rejection:");
                                                    if (reason) updateStatusMutation.mutate({ id: a.id, status: 'rejected', reason });
                                                }}
                                            ><X className="h-4 w-4" /></Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="ghost" asChild>
                                        <a href={`/shop?ref=${a.code}`} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {affiliates?.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No affiliates found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
