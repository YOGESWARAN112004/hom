
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, Users, ShoppingBag, TrendingUp, Check, X, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getApiUrl } from "@/lib/apiConfig";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/admin/analytics"));
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
        enabled: !!user && user.role === 'admin'
    });

    const { data: pendingAffiliates, isLoading: affiliatesLoading } = useQuery({
        queryKey: ['pending-affiliates'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/affiliates/pending"));
            if (!res.ok) throw new Error("Failed to fetch pending affiliates");
            return res.json();
        },
        enabled: !!user && user.role === 'admin'
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("POST", `/api/affiliates/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-affiliates'] });
            toast({ title: "Success", description: "Affiliate approved" });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to approve affiliate", variant: "destructive" });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("POST", `/api/affiliates/${id}/reject`, { reason: "Admin rejected" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-affiliates'] });
            toast({ title: "Success", description: "Affiliate rejected" });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to reject affiliate", variant: "destructive" });
        }
    });

    if (authLoading || (analyticsLoading && user?.role === 'admin')) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${analytics?.totalRevenue?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.activeUsers || analytics?.totalUsers || 0}</div>
                        <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.totalOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">+19% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.conversionRate || "2.4%"}</div>
                        <p className="text-xs text-muted-foreground">+4% from last month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/brands")}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> Manage Brands
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add, edit, or remove featured houses.</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/products")}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5" /> Manage Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Update inventory, prices, and images.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders & Pending Affiliates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Orders</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")}>View All</Button>
                    </CardHeader>
                    <CardContent>
                        {analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics.recentOrders.map((order: any) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    order.status === 'paid' || order.status === 'delivered' ? 'default' :
                                                        order.status === 'pending' ? 'secondary' : 'outline'
                                                } className="uppercase text-[10px]">
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">₹{parseFloat(order.totalAmount).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">No recent orders found.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Affiliates */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Affiliates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {affiliatesLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : pendingAffiliates && pendingAffiliates.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Applied</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingAffiliates.map((affiliate: any) => (
                                        <TableRow key={affiliate.id}>
                                            <TableCell>
                                                <div className="font-medium">{affiliate.user?.firstName} {affiliate.user?.lastName}</div>
                                                <div className="text-xs text-muted-foreground">{affiliate.user?.email}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(affiliate.createdAt), 'MMM d')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                        onClick={() => approveMutation.mutate(affiliate.id)}
                                                        disabled={approveMutation.isPending}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                                        onClick={() => rejectMutation.mutate(affiliate.id)}
                                                        disabled={rejectMutation.isPending}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">No pending affiliate applications.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
