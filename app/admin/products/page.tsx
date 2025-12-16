
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";

// Simplified Product Type
type Product = {
    id: string;
    name: string;
    description?: string;
    basePrice: string;
    stock: number;
    category?: string;
    subCategory?: string;
    brand?: string;
    imageUrl?: string;
    isFeatured?: boolean;
    isActive?: boolean;
};

export default function AdminProductsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState<Partial<Product>>({
        name: "",
        description: "",
        basePrice: "0",
        stock: 0,
        category: "",
        subCategory: "",
        brand: "",
        imageUrl: "",
        isFeatured: false,
        isActive: true,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Fetch Products
    const { data: products, isLoading } = useQuery({
        queryKey: ['admin-products'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/products?limit=100")); // Fetch up to 100 for now
            if (!res.ok) throw new Error("Failed to fetch products");
            return res.json();
        },
    });

    // Fetch Brands for select
    const { data: brands } = useQuery({
        queryKey: ['admin-brands-list'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/brands"));
            if (!res.ok) return [];
            return res.json();
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(getApiUrl("/api/products"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Product created" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await fetch(getApiUrl(`/api/products/${id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Product updated" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(getApiUrl(`/api/products/${id}`), { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete product");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            toast({ title: "Success", description: "Product deleted" });
        },
    });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch(getApiUrl("/api/uploads/local"), { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
                toast({ title: "Success", description: "Image uploaded" });
            }
        } catch {
            toast({ title: "Error", description: "Upload failed", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert types
        const payload = {
            ...formData,
            basePrice: formData.basePrice?.toString(),
            stock: Number(formData.stock),
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", description: "", basePrice: "0", stock: 0, category: "", subCategory: "", brand: "", imageUrl: "", isFeatured: false, isActive: true });
        setEditingProduct(null);
    };

    if (authLoading || (isLoading && user?.role === 'admin')) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!user || user.role !== 'admin') {
        router.push("/");
        return null;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Manage Products</h1>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="col-span-2">
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div>
                                <Label>Price</Label>
                                <Input type="number" min="0" step="0.01" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: e.target.value })} required />
                            </div>
                            <div>
                                <Label>Stock</Label>
                                <Input type="number" min="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })} required />
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Men" />
                            </div>
                            <div>
                                <Label>Sub-Category</Label>
                                <Input value={formData.subCategory} onChange={e => setFormData({ ...formData, subCategory: e.target.value })} placeholder="e.g. Jeans" />
                            </div>
                            <div>
                                <Label>Brand</Label>
                                <Select value={formData.brand} onValueChange={val => setFormData({ ...formData, brand: val })}>
                                    <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                                    <SelectContent>
                                        {brands?.map((b: any) => (
                                            <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label>Image</Label>
                                <div className="flex items-center gap-4 mt-2">
                                    {formData.imageUrl && <img src={formData.imageUrl} className="h-16 w-16 object-cover rounded" />}
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4 mr-2" />} Upload
                                    </Button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="isFeatured" checked={formData.isFeatured} onCheckedChange={c => setFormData({ ...formData, isFeatured: c })} />
                                <Label htmlFor="isFeatured">Featured</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="isActive" checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                                <Label htmlFor="isActive">Active</Label>
                            </div>
                            <div className="col-span-2">
                                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingProduct ? "Update" : "Create"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-4">Image</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Active</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products?.map((p: Product) => (
                            <tr key={p.id} className="border-t hover:bg-muted/50">
                                <td className="p-4">
                                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded" />}
                                </td>
                                <td className="p-4 font-medium">{p.name}</td>
                                <td className="p-4">${p.basePrice}</td>
                                <td className="p-4">{p.stock}</td>
                                <td className="p-4">{p.isActive ? "Yes" : "No"}</td>
                                <td className="p-4 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditingProduct(p);
                                        setFormData({ ...p });
                                        setIsDialogOpen(true);
                                    }}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                                        if (confirm("Delete product?")) deleteMutation.mutate(p.id);
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                </td>
                            </tr>
                        ))}
                        {products?.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
