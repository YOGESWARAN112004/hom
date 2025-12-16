
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/apiConfig";

export default function AdminBrandsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        imageUrl: "",
        isFeatured: false,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Fetch Brands
    const { data: brands, isLoading } = useQuery({
        queryKey: ['admin-brands'],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/brands"));
            if (!res.ok) throw new Error("Failed to fetch brands");
            return res.json();
        },
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(getApiUrl("/api/brands"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to create brand");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Brand created successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await fetch(getApiUrl(`/api/brands/${id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update brand");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Brand updated successfully" });
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(getApiUrl(`/api/brands/${id}`), { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete brand");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
            toast({ title: "Success", description: "Brand deleted successfully" });
        },
    });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            // Use local upload for simplicity & fallback
            const res = await fetch(getApiUrl("/api/uploads/local"), {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
                toast({ title: "Success", description: "Image uploaded" });
            } else {
                throw new Error("Upload failed");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBrand) {
            updateMutation.mutate({ id: editingBrand.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", description: "", imageUrl: "", isFeatured: false });
        setEditingBrand(null);
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
                <h1 className="text-3xl font-bold">Manage Brands</h1>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Brand</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingBrand ? "Edit Brand" : "Add New Brand"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Brand Name</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div>
                                <Label>Brand Image</Label>
                                <div className="flex items-center gap-4 mt-2">
                                    {formData.imageUrl && (
                                        <img src={formData.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded" />
                                    )}
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4 mr-2" />}
                                        Upload Image
                                    </Button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="featured" checked={formData.isFeatured} onCheckedChange={checked => setFormData({ ...formData, isFeatured: checked })} />
                                <Label htmlFor="featured">Featured House</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingBrand ? "Update Brand" : "Create Brand"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands?.map((brand: any) => (
                    <Card key={brand.id}>
                        <CardHeader className="relative p-0 pt-0">
                            <img src={brand.imageUrl} alt={brand.name} className="w-full h-48 object-cover rounded-t-lg" />
                            {brand.isFeatured && (
                                <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">Featured</span>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle>{brand.name}</CardTitle>
                            <p className="text-sm text-gray-500 line-clamp-2">{brand.description}</p>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                                setEditingBrand(brand);
                                setFormData({
                                    name: brand.name,
                                    description: brand.description || "",
                                    imageUrl: brand.imageUrl || "",
                                    isFeatured: brand.isFeatured || false,
                                });
                                setIsDialogOpen(true);
                            }}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                                if (confirm("Are you sure you want to delete this brand?")) {
                                    deleteMutation.mutate(brand.id);
                                }
                            }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
