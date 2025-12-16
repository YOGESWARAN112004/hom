
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Search, RefreshCw, Box } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";
import { Badge } from "@/components/ui/badge";

export default function AdminInventoryPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // Fetch Products
    const { data: products, isLoading } = useQuery({
        queryKey: ['admin-inventory', showLowStockOnly],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append("limit", "200"); // Fetch more for inventory view
            if (showLowStockOnly) params.append("lowStock", "true");

            const res = await fetch(getApiUrl(`/api/products?${params.toString()}`));
            if (!res.ok) throw new Error("Failed to fetch inventory");
            return res.json();
        },
    });

    // Update Stock Mutation
    const updateStockMutation = useMutation({
        mutationFn: async ({ id, stock }: { id: string, stock: number }) => {
            const res = await fetch(getApiUrl(`/api/products/${id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stock }),
            });
            if (!res.ok) throw new Error("Failed to update stock");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
            toast({ title: "Updated", description: "Stock level updated." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update stock.", variant: "destructive" });
        }
    });

    if (authLoading || (isLoading && user?.role === 'admin')) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!user || user.role !== 'admin') {
        router.push("/");
        return null;
    }

    // Filter by search
    const filteredProducts = products?.filter((p: any) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    // Stats
    const totalProducts = products?.length || 0;
    const lowStockCount = products?.filter((p: any) => p.stock <= 5 && p.stock > 0).length || 0;
    const outOfStockCount = products?.filter((p: any) => p.stock === 0).length || 0;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                        <XCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={showLowStockOnly ? "default" : "outline"}
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    >
                        {showLowStockOnly ? "Showing Low Stock" : "Show All"}
                    </Button>
                    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-4">Product</th>
                            <th className="p-4">SKU</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Stock Level</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((p: any) => (
                            <tr key={p.id} className="border-t hover:bg-muted/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded object-cover" />}
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-xs">{p.sku || "-"}</td>
                                <td className="p-4">
                                    {p.stock === 0 ? (
                                        <Badge variant="destructive">Out of Stock</Badge>
                                    ) : p.stock <= 5 ? (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">Low Stock</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
                                    )}
                                </td>
                                <td className="p-4 font-bold">{p.stock}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button
                                            variant="outline" size="sm" className="h-8 w-8 p-0"
                                            onClick={() => updateStockMutation.mutate({ id: p.id, stock: Math.max(0, p.stock - 1) })}
                                        >
                                            -
                                        </Button>
                                        <Button
                                            variant="outline" size="sm" className="h-8 w-8 p-0"
                                            onClick={() => updateStockMutation.mutate({ id: p.id, stock: p.stock + 1 })}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No items found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
