"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";

// Simplified Product Type (matching Schema for display)
type Product = {
    id: string;
    name: string;
    description?: string;
    basePrice: string;
    compareAtPrice?: string | null;
    stock: number;
    category: string;
    subCategory: string;
    brand: string;
    imageUrl?: string | null;
    images?: { id: string; url: string; isPrimary: boolean; }[];
    isFeatured?: boolean;
    isActive?: boolean;
    affiliateCommissionRate?: string | null;
    size?: string | null;
};

// Form data type - images is string[] here for easier handling of URLs
type ProductFormData = Omit<Partial<Product>, 'images'> & {
    images: string[];
};

const CATEGORIES = {
    "Men": ["Clothing", "Shoes", "Accessories", "Watches"],
    "Women": ["Clothing", "Shoes", "Handbags", "Jewelry"],
    "Kids": ["Boys", "Girls", "Toys", "Baby"],
    "Home": ["Decor", "Kitchen", "Bedding", "Furniture"],
    "Beauty": ["Skincare", "Makeup", "Fragrance"],
    "Electronics": ["Phones", "Laptops", "Audio", "Accessories"],
    "Sports": ["Equipment", "Apparel", "Footwear"]
} as const;

export default function AdminProductsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState<ProductFormData>({
        name: "",
        description: "",
        basePrice: "0",
        compareAtPrice: "0",
        stock: 0,
        category: "",
        subCategory: "",
        brand: "",
        imageUrl: "",
        images: [],
        isFeatured: false,
        isActive: true,
        affiliateCommissionRate: "10.00",
        size: "",
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Fetch Products
    const { data: products, isLoading } = useQuery({
        queryKey: ['admin-products'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/products?limit=100"));
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
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);

        const newImages: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formDataUpload = new FormData();
                formDataUpload.append("image", file);

                // Updated to use S3 Upload
                const res = await fetch(getApiUrl("/api/uploads/s3"), { method: "POST", body: formDataUpload });
                const data = await res.json();

                if (res.ok && data.success) {
                    newImages.push(data.publicUrl);
                } else if (res.status === 503 || data.message === "S3 not configured") {
                    // Fallback
                    const localRes = await fetch(getApiUrl("/api/uploads/local"), { method: "POST", body: formDataUpload });
                    const localData = await localRes.json();
                    if (localData.success) {
                        newImages.push(localData.publicUrl);
                    }
                }
            }

            if (newImages.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    imageUrl: prev.imageUrl || newImages[0], // Set first as primary if none
                    images: [...(prev.images || []), ...newImages]
                }));
                toast({ title: "Success", description: `${newImages.length} images uploaded` });
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Upload failed", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => {
            const newImages = [...prev.images];
            newImages.splice(index, 1);
            return {
                ...prev,
                images: newImages,
                imageUrl: (prev.imageUrl === prev.images[index]) ? (newImages[0] || "") : prev.imageUrl
            };
        });
    };

    const setPrimaryImage = (url: string) => {
        setFormData(prev => ({ ...prev, imageUrl: url }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert types
        const payload = {
            ...formData,
            basePrice: formData.basePrice?.toString(),
            compareAtPrice: formData.compareAtPrice?.toString(),
            affiliateCommissionRate: formData.affiliateCommissionRate?.toString(),
            stock: Number(formData.stock),
            // Ensure images array is filtered and formatted if needed by backend, 
            // but for now passing simple string array of URLs plus the primary imageUrl
            images: formData.images,
            imageUrl: formData.imageUrl || formData.images[0] || ""
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "", description: "", basePrice: "0", compareAtPrice: "0", stock: 0,
            category: "", subCategory: "", brand: "", imageUrl: "", images: [], isFeatured: false, isActive: true,
            affiliateCommissionRate: "10.00", size: ""
        });
        setEditingProduct(null);
    };

    if (authLoading || (isLoading && user?.role === 'admin')) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!user || user.role !== 'admin') {
        router.push("/");
        return null;
    }

    const subCategories = formData.category && CATEGORIES[formData.category as keyof typeof CATEGORIES]
        ? CATEGORIES[formData.category as keyof typeof CATEGORIES]
        : [];

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Manage Products</h1>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
                            <DialogDescription>
                                {editingProduct ? "Make changes to the product details below." : "Fill in the details to create a new product."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="col-span-2">
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Base Price</Label>
                                    <Input type="number" min="0" step="0.01" value={formData.basePrice || ""} onChange={e => setFormData({ ...formData, basePrice: e.target.value })} required />
                                </div>
                                <div>
                                    <Label>Original Price</Label>
                                    <Input type="number" min="0" step="0.01" value={formData.compareAtPrice || ""} onChange={e => setFormData({ ...formData, compareAtPrice: e.target.value })} />
                                </div>
                            </div>

                            {/* New Fields */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Affiliate Commission (%)</Label>
                                    <Input type="number" min="0" step="0.01" value={formData.affiliateCommissionRate || ""} onChange={e => setFormData({ ...formData, affiliateCommissionRate: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Size (Optional)</Label>
                                    <Input value={formData.size || ""} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="e.g. XL, 100ml" />
                                </div>
                            </div>

                            <div>
                                <Label>Stock</Label>
                                <Input type="number" min="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })} required />
                            </div>

                            {/* Updated Category Selects */}
                            <div>
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val, subCategory: "" })}>
                                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(CATEGORIES).map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Sub-Category</Label>
                                <Select value={formData.subCategory} onValueChange={val => setFormData({ ...formData, subCategory: val })} disabled={!formData.category}>
                                    <SelectTrigger><SelectValue placeholder="Select Sub-Category" /></SelectTrigger>
                                    <SelectContent>
                                        {subCategories.map(sub => (
                                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Brand</Label>
                                <div className="flex gap-2">
                                    <Select value={formData.brand} onValueChange={val => setFormData({ ...formData, brand: val })}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                                        <SelectContent>
                                            {brands?.map((b: any) => (
                                                <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Dialog>
                                        <DialogTrigger asChild><Button type="button" size="icon" variant="outline"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add New Brand</DialogTitle></DialogHeader>
                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                const form = e.target as HTMLFormElement;
                                                const name = (form.elements.namedItem('brandName') as HTMLInputElement).value;
                                                if (!name) return;

                                                try {
                                                    const res = await fetch(getApiUrl("/api/brands"), {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ name, slug: name.toLowerCase().replace(/ /g, '-'), isActive: true })
                                                    });
                                                    if (res.ok) {
                                                        queryClient.invalidateQueries({ queryKey: ['admin-brands-list'] });
                                                        toast({ title: "Success", description: "Brand added" });
                                                    } else {
                                                        throw new Error("Failed");
                                                    }
                                                } catch (err) {
                                                    toast({ title: "Error", description: "Could not add brand", variant: "destructive" });
                                                }
                                            }}>
                                                <div className="py-4">
                                                    <Label>Brand Name</Label>
                                                    <Input name="brandName" required placeholder="e.g. Gucci" />
                                                </div>
                                                <Button type="submit">Create</Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Label>Images (Upload multiple)</Label>
                                <div className="flex flex-wrap gap-4 mt-2 mb-2">
                                    {formData.images?.map((img, idx) => (
                                        <div key={idx} className="relative group border rounded-md overflow-hidden h-20 w-20">
                                            <img src={img} className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeImage(idx)}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                            {formData.imageUrl === img && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] text-center py-0.5">
                                                    Primary
                                                </div>
                                            )}
                                            {formData.imageUrl !== img && (
                                                <button
                                                    type="button"
                                                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                                                    onClick={() => setPrimaryImage(img)}
                                                >
                                                    Set Main
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" className="h-20 w-20 border-dashed" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? <Loader2 className="animate-spin h-6 w-6" /> : <Upload className="h-6 w-6" />}
                                    </Button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
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
                            <th className="p-4">Category</th>
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
                                <td className="p-4">{p.category}/{p.subCategory}</td>
                                <td className="p-4">{p.stock}</td>
                                <td className="p-4">{p.isActive ? "Yes" : "No"}</td>
                                <td className="p-4 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditingProduct(p);
                                        const pImages = p.images?.map(i => i.url) || (p.imageUrl ? [p.imageUrl] : []);
                                        setFormData({
                                            ...p,
                                            images: pImages,
                                            // Ensure nulls are handled for form inputs which prefer empty strings or undefined
                                            description: p.description || "",
                                            compareAtPrice: p.compareAtPrice || "",
                                            imageUrl: p.imageUrl || "",
                                            affiliateCommissionRate: p.affiliateCommissionRate || "",
                                            size: p.size || ""
                                        });
                                        setIsDialogOpen(true);
                                    }}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                                        if (confirm("Delete product?")) deleteMutation.mutate(p.id);
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                </td>
                            </tr>
                        ))}
                        {products?.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
