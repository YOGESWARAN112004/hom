import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { getApiUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  DollarSign,
  Users,
  TrendingUp,
  Search,
  UserCheck,
  Plus,
  Trash2,
  Edit,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  X,
  Eye,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  basePrice: string;
  compareAtPrice: string | null;
  category: string;
  subCategory: string;
  brand: string;
  hasVariants: boolean;
  stock: number;
  lowStockThreshold: number | null;
  isActive: boolean;
  isFeatured: boolean;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  variants: Array<{
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    colorCode: string | null;
    priceModifier: string;
    stock: number;
  }>;
  imageUrl: string | null;
}

interface AffiliateStats {
  id: string;
  name: string;
  code: string;
  traffic: number;
  sales: number;
  conversionRate: number;
  revenue: string;
  status: string;
  totalEarnings: string;
}

interface Affiliate {
  id: string;
  userId: string;
  code: string;
  status: 'pending' | 'approved' | 'rejected';
  websiteUrl: string | null;
  socialMedia: string | null;
  promotionMethod: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  pendingOrders: number;
  lowStockProducts: number;
  salesByDay: Array<{ date: string; sales: number; orders: number }>;
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories'];
const SUB_CATEGORIES = ['Clothing', 'Shoes', 'Bags', 'Watches', 'Jewelry', 'Accessories'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Navy', code: '#000080' },
  { name: 'Red', code: '#FF0000' },
  { name: 'Brown', code: '#8B4513' },
  { name: 'Beige', code: '#F5F5DC' },
];

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [variantProductId, setVariantProductId] = useState<string | null>(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    shortDescription: "",
    basePrice: "",
    compareAtPrice: "",
    category: "Men",
    subCategory: "Clothing",
    brand: "",
    sku: "",
    stock: "0",
    lowStockThreshold: "5",
    isActive: true,
    isFeatured: false,
    affiliateCommissionRate: "10",
    material: "",
    careInstructions: "",
    sizeChart: null as any,
  });

  // New brand input
  const [newBrandName, setNewBrandName] = useState("");
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);

  // Image upload during product creation
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Variant form state
  const [variantForm, setVariantForm] = useState({
    sku: "",
    size: "",
    color: "",
    colorCode: "",
    priceModifier: "0",
    stock: "0",
  });

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Protect Admin Route
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, user?.role, setLocation]);

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch brands
  const { data: brandsList = [] } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch orders
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch affiliate stats
  const { data: affiliateStats = [] } = useQuery<AffiliateStats[]>({
    queryKey: ['/api/affiliates/stats'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch pending affiliates
  const { data: pendingAffiliates = [] } = useQuery<Affiliate[]>({
    queryKey: ['/api/affiliates/pending'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch all affiliates
  const { data: allAffiliates = [] } = useQuery<Affiliate[]>({
    queryKey: ['/api/affiliates'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch analytics data
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['/api/admin/analytics'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Create/Update product mutation
  const productMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      // Convert string values to proper types
      const payload = {
        ...data,
        stock: parseInt(data.stock) || 0,
        lowStockThreshold: parseInt(data.lowStockThreshold) || 5,
        basePrice: data.basePrice,
        compareAtPrice: data.compareAtPrice || null,
        affiliateCommissionRate: data.affiliateCommissionRate || '10',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to save product');
      return res.json();
    },
    onSuccess: async (product) => {
      // Upload pending images for new products
      if (!editingProduct && pendingImages.length > 0) {
        setUploadingImage(true);
        try {
          await uploadProductImages(product.id, pendingImages);
        } finally {
          setUploadingImage(false);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      toast({ title: editingProduct ? 'Product updated' : 'Product created' });
    },
    onError: () => {
      toast({ title: 'Failed to save product', variant: 'destructive' });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete product');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Product deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete product', variant: 'destructive' });
    },
  });

  // Create variant mutation
  const variantMutation = useMutation({
    mutationFn: async (data: { productId: string; variant: typeof variantForm }) => {
      const res = await fetch(`/api/products/${data.productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.variant),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create variant');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsVariantDialogOpen(false);
      setVariantProductId(null);
      setVariantForm({ sku: "", size: "", color: "", colorCode: "", priceModifier: "0", stock: "0" });
      toast({ title: 'Variant added' });
    },
    onError: () => {
      toast({ title: 'Failed to add variant', variant: 'destructive' });
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async ({ productId, variantId }: { productId: string; variantId: string }) => {
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete variant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Variant deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete variant', variant: 'destructive' });
    },
  });

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(getApiUrl('/api/brands'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create brand');
      return res.json();
    },
    onSuccess: (brand) => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setProductForm({ ...productForm, brand: brand.name });
      setNewBrandName("");
      setShowNewBrandInput(false);
      toast({ title: 'Brand created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create brand', variant: 'destructive' });
    },
  });

  // Approve affiliate mutation
  const approveAffiliateMutation = useMutation({
    mutationFn: async (affiliateId: string) => {
      const res = await fetch(`/api/affiliates/${affiliateId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to approve affiliate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates/stats'] });
      toast({ title: 'Affiliate approved successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to approve affiliate', variant: 'destructive' });
    },
  });

  // Reject affiliate mutation
  const rejectAffiliateMutation = useMutation({
    mutationFn: async ({ affiliateId, reason }: { affiliateId: string; reason: string }) => {
      const res = await fetch(`/api/affiliates/${affiliateId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reject affiliate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates'] });
      toast({ title: 'Affiliate rejected' });
    },
    onError: () => {
      toast({ title: 'Failed to reject affiliate', variant: 'destructive' });
    },
  });

  // Image upload
  const uploadImage = async (productId: string, file: File) => {
    setUploadingImage(true);
    try {
      // 1. Get presigned URL
      const presignRes = await fetch(getApiUrl('/api/uploads/presigned-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: 'products',
        }),
        credentials: 'include',
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // 3. Add image to product
      const imageRes = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicUrl,
          altText: file.name,
          isPrimary: false,
        }),
        credentials: 'include',
      });

      if (!imageRes.ok) throw new Error('Failed to save image');

      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      toast({ title: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      shortDescription: "",
      basePrice: "",
      compareAtPrice: "",
      category: "Men",
      subCategory: "Clothing",
      brand: "",
      sku: "",
      stock: "0",
      lowStockThreshold: "5",
      isActive: true,
      isFeatured: false,
      affiliateCommissionRate: "10",
      material: "",
      careInstructions: "",
      sizeChart: null,
    });
    setPendingImages([]);
    setImagePreviewUrls([]);
    setShowNewBrandInput(false);
    setNewBrandName("");
  };

  // Handle image selection for new product
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingImages(prev => [...prev, ...files]);
      // Create preview URLs
      const newUrls = files.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeSelectedImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload images after product creation (uses server-side upload to avoid CORS)
  const uploadProductImages = async (productId: string, files: File[]) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`Uploading image ${i + 1}/${files.length}: ${file.name}`);
        
        // Use server-side S3 upload (avoids CORS issues)
        const formData = new FormData();
        formData.append('image', file);

        const uploadRes = await fetch(getApiUrl('/api/uploads/s3'), {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error('Upload failed:', errorText);
          toast({ title: `Failed to upload ${file.name}`, variant: 'destructive' });
          continue;
        }

        const uploadData = await uploadRes.json();
        console.log('Upload success:', uploadData.publicUrl);

        // Add image to product
        const addImageRes = await fetch(`/api/products/${productId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: uploadData.publicUrl,
            altText: file.name,
            isPrimary: i === 0,
          }),
          credentials: 'include',
        });

        if (!addImageRes.ok) {
          console.error('Failed to add image to product:', await addImageRes.text());
        } else {
          console.log('Image added to product successfully');
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        toast({ title: `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice || "",
      category: product.category,
      subCategory: product.subCategory,
      brand: product.brand,
      sku: product.sku || "",
      stock: product.stock.toString(),
      lowStockThreshold: (product.lowStockThreshold || 5).toString(),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      affiliateCommissionRate: (product as any).affiliateCommissionRate || "10",
      material: (product as any).material || "",
      careInstructions: (product as any).careInstructions || "",
      sizeChart: (product as any).sizeChart || null,
    });
    setPendingImages([]);
    setImagePreviewUrls([]);
    setIsProductDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(p => {
    if (p.hasVariants) {
      return p.variants.some(v => v.stock <= (p.lowStockThreshold || 5));
    }
    return p.stock <= (p.lowStockThreshold || 5);
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage products, orders, and analytics.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="blogs">Blogs</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="analytics">Google Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="bg-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₹{(analytics?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-primary mt-1">From {analytics?.totalOrders || 0} orders</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">{analytics?.totalProducts || products.length}</div>
                <p className="text-xs text-destructive mt-1">{analytics?.lowStockProducts || lowStockProducts.length} low stock</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analytics?.pendingOrders || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Affiliates</CardTitle>
                <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">{affiliateStats.filter(a => a.status === 'approved').length}</div>
                <p className="text-xs text-yellow-500 mt-1">{pendingAffiliates.length} pending</p>
          </CardContent>
        </Card>
      </div>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="bg-destructive/10 border-destructive/30 mb-8">
        <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alert
                </CardTitle>
        </CardHeader>
        <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.slice(0, 5).map(p => (
                    <span key={p.id} className="bg-background px-3 py-1 rounded text-sm">
                      {p.name}
                    </span>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <span className="text-sm text-muted-foreground">
                      +{lowStockProducts.length - 5} more
                    </span>
                  )}
                </div>
        </CardContent>
      </Card>
          )}

      {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-white/5">
          <CardHeader>
                <CardTitle className="font-heading text-lg">Sales by Day</CardTitle>
                <CardDescription>Last 7 days revenue performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
                  {analytics?.salesByDay && analytics.salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.salesByDay.map(d => ({
                        ...d,
                        name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
                      }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#333' }}
                    itemStyle={{ color: '#fff' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                  />
                        <Bar dataKey="sales" fill="#d9a520" radius={[4, 4, 0, 0]} />
                      </BarChart>
              </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No sales data available yet
                    </div>
                  )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-white/5">
          <CardHeader>
                <CardTitle className="font-heading text-lg">Top Products</CardTitle>
                <CardDescription>Best selling products by quantity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
                  {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" stroke="#666" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#666" fontSize={10} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#333' }}
                    itemStyle={{ color: '#fff' }}
                          formatter={(value: number, name: string) => [
                            name === 'sales' ? `${value} units` : `₹${value.toLocaleString()}`,
                            name === 'sales' ? 'Sold' : 'Revenue'
                          ]}
                  />
                        <Bar dataKey="sales" fill="#d9a520" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No product sales data available yet
                    </div>
                  )}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Total Users Card */}
          <Card className="bg-card border-white/5 mt-8">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Platform Stats</CardTitle>
              <CardDescription>Total registered users and customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-foreground">
                {analytics?.totalUsers || 0} <span className="text-sm text-muted-foreground font-normal">total users</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
      <Card className="bg-card border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
                <CardTitle className="font-heading text-lg">Products</CardTitle>
                <CardDescription>Manage your product catalog.</CardDescription>
          </div>
              <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-8 bg-background/50 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                  setIsProductDialogOpen(open);
                  if (!open) {
                    setEditingProduct(null);
                    resetProductForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      productMutation.mutate(productForm);
                    }} className="space-y-6">
                      
                      {/* Image Upload Section */}
                      {!editingProduct && (
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Product Images</Label>
                          <div className="border-2 border-dashed border-white/20 rounded-lg p-4 hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageSelect}
                              className="hidden"
                              id="product-images"
                            />
                            <label htmlFor="product-images" className="cursor-pointer flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Click to upload images (multiple allowed)</span>
                            </label>
                          </div>
                          {imagePreviewUrls.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {imagePreviewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <img src={url} alt="" className="h-20 w-20 object-cover rounded border border-white/10" />
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedImage(index)}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                  {index === 0 && (
                                    <span className="absolute bottom-0 left-0 right-0 bg-primary text-[10px] text-center py-0.5">Primary</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Product Name *</Label>
                            <Input
                              value={productForm.name}
                              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                              placeholder="e.g., Premium Silk Shirt"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Brand *</Label>
                            {showNewBrandInput ? (
                              <div className="flex gap-2">
                                <Input
                                  value={newBrandName}
                                  onChange={(e) => setNewBrandName(e.target.value)}
                                  placeholder="Enter new brand name"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    if (newBrandName.trim()) {
                                      createBrandMutation.mutate(newBrandName.trim());
                                    }
                                  }}
                                  disabled={createBrandMutation.isPending}
                                >
                                  {createBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewBrandInput(false)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Select
                                  value={productForm.brand}
                                  onValueChange={(v) => setProductForm({ ...productForm, brand: v })}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select brand" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brandsList.map(brand => (
                                      <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button type="button" size="icon" variant="outline" onClick={() => setShowNewBrandInput(true)} title="Add new brand">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select
                              value={productForm.category}
                              onValueChange={(v) => setProductForm({ ...productForm, category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Sub-Category *</Label>
                            <Select
                              value={productForm.subCategory}
                              onValueChange={(v) => setProductForm({ ...productForm, subCategory: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub-category" />
                              </SelectTrigger>
                              <SelectContent>
                                {SUB_CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Short Description</Label>
                          <Input
                            value={productForm.shortDescription}
                            onChange={(e) => setProductForm({ ...productForm, shortDescription: e.target.value })}
                            placeholder="Brief description for product cards"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Full Description</Label>
                          <Textarea
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            placeholder="Detailed product description..."
                            rows={4}
                          />
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing & Inventory</h3>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Base Price (₹) *</Label>
                            <Input
                              type="number"
                              value={productForm.basePrice}
                              onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Compare Price (₹)</Label>
                            <Input
                              type="number"
                              value={productForm.compareAtPrice}
                              onChange={(e) => setProductForm({ ...productForm, compareAtPrice: e.target.value })}
                              placeholder="Original price"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SKU</Label>
                            <Input
                              value={productForm.sku}
                              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                              placeholder="e.g., SILK-001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Commission (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={productForm.affiliateCommissionRate}
                              onChange={(e) => setProductForm({ ...productForm, affiliateCommissionRate: e.target.value })}
                              placeholder="10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Stock Quantity</Label>
                            <Input
                              type="number"
                              value={productForm.stock}
                              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Low Stock Alert Threshold</Label>
                            <Input
                              type="number"
                              value={productForm.lowStockThreshold}
                              onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                              placeholder="5"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Material & Care - for clothing/shoes */}
                      {(productForm.subCategory === 'Clothing' || productForm.subCategory === 'Shoes') && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Material & Care</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Material</Label>
                              <Input
                                value={productForm.material}
                                onChange={(e) => setProductForm({ ...productForm, material: e.target.value })}
                                placeholder="e.g., 100% Cotton, Leather"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Care Instructions</Label>
                              <Input
                                value={productForm.careInstructions}
                                onChange={(e) => setProductForm({ ...productForm, careInstructions: e.target.value })}
                                placeholder="e.g., Machine wash cold"
                              />
                            </div>
                          </div>

                          {/* Size Chart Info */}
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <Label className="text-sm">Size Chart</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Size information is managed through product variants. After creating the product, add variants with specific sizes (S, M, L, XL, etc.) and their stock levels.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={productForm.isActive}
                              onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Active (visible in store)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={productForm.isFeatured}
                              onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Featured (show on homepage)</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={productMutation.isPending || uploadingImage}>
                          {(productMutation.isPending || uploadingImage) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {uploadingImage ? 'Uploading Images...' : 'Saving...'}
                            </>
                          ) : (
                            'Save Product'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
          </div>
        </CardHeader>
        <CardContent>
              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-primary">Product</TableHead>
                <TableHead className="text-primary">Brand</TableHead>
                <TableHead className="text-primary">Category</TableHead>
                <TableHead className="text-primary">Price</TableHead>
                <TableHead className="text-primary">Stock</TableHead>
                      <TableHead className="text-primary">Variants</TableHead>
                <TableHead className="text-primary text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                    {filteredProducts.map((item) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium flex items-center gap-3">
                          <div className="h-12 w-12 rounded bg-secondary overflow-hidden">
                            {item.imageUrl || item.images?.[0]?.url ? (
                              <img
                                src={item.images?.find(i => i.isPrimary)?.url || item.images?.[0]?.url || item.imageUrl || ''}
                                className="h-full w-full object-contain"
                                alt=""
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder.svg';
                                  target.onerror = null;
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="block">{item.name}</span>
                            {!item.isActive && (
                              <span className="text-xs text-muted-foreground">(Inactive)</span>
                            )}
                          </div>
                  </TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>{item.category} / {item.subCategory}</TableCell>
                        <TableCell className="font-mono">₹{parseFloat(item.basePrice).toLocaleString()}</TableCell>
                  <TableCell>
                          {item.hasVariants ? (
                            <span className="text-muted-foreground">See variants</span>
                          ) : (
                            <span className={item.stock <= (item.lowStockThreshold || 5) ? 'text-destructive' : ''}>
                              {item.stock}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.variants?.length > 0 ? (
                            <span className="text-primary">{item.variants.length} variants</span>
                          ) : (
                      <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setVariantProductId(item.id);
                                setIsVariantDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                        size="icon" 
                              onClick={() => {
                                setVariantProductId(item.id);
                                setIsVariantDialogOpen(true);
                              }}
                              title="Add Variant"
                            >
                              <Plus className="h-4 w-4" />
                      </Button>
                      <Button 
                              variant="ghost"
                        size="icon" 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) uploadImage(item.id, file);
                                };
                                input.click();
                              }}
                              disabled={uploadingImage}
                              title="Upload Image"
                            >
                              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditProduct(item)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this product?')) {
                                  deleteProductMutation.mutate(item.id);
                                }
                              }}
                              className="text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Variant Dialog */}
          <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product Variant</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (variantProductId) {
                  variantMutation.mutate({ productId: variantProductId, variant: variantForm });
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    placeholder="e.g., PROD-001-M-BLK"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select
                      value={variantForm.size}
                      onValueChange={(v) => setVariantForm({ ...variantForm, size: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZES.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={variantForm.color}
                      onValueChange={(v) => {
                        const color = COLORS.find(c => c.name === v);
                        setVariantForm({
                          ...variantForm,
                          color: v,
                          colorCode: color?.code || '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map(color => (
                          <SelectItem key={color.name} value={color.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color.code }}
                              />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price Modifier (₹)</Label>
                    <Input
                      type="number"
                      value={variantForm.priceModifier}
                      onChange={(e) => setVariantForm({ ...variantForm, priceModifier: e.target.value })}
                      placeholder="0 for no change"
                    />
                    <p className="text-xs text-muted-foreground">Add/subtract from base price</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock *</Label>
                    <Input
                      type="number"
                      value={variantForm.stock}
                      onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={variantMutation.isPending}>
                    {variantMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Variant'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Recent Orders</CardTitle>
              <CardDescription>Manage and track customer orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-primary">Order #</TableHead>
                    <TableHead className="text-primary">Date</TableHead>
                    <TableHead className="text-primary">Items</TableHead>
                    <TableHead className="text-primary">Total</TableHead>
                    <TableHead className="text-primary">Status</TableHead>
                    <TableHead className="text-primary">Payment</TableHead>
                    <TableHead className="text-primary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono">{order.orderNumber}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{order.items?.length || 0} items</TableCell>
                      <TableCell className="font-mono">₹{parseFloat(order.totalAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                          order.status === 'shipped' ? 'bg-blue-500/20 text-blue-500' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500' :
                          order.paymentStatus === 'failed' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {order.paymentStatus || 'pending'}
                        </span>
                  </TableCell>
                  <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-primary">
                          <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands">
          <BrandsTab />
        </TabsContent>

        {/* Blogs Tab */}
        <TabsContent value="blogs">
          <BlogsTab />
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          {/* Pending Applications */}
          {pendingAffiliates.length > 0 && (
            <Card className="bg-yellow-500/10 border-yellow-500/30 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-500">
                  <AlertTriangle className="h-5 w-5" />
                  Pending Applications ({pendingAffiliates.length})
                </CardTitle>
                <CardDescription>These users are waiting for approval to join the affiliate program.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-primary">Applicant</TableHead>
                      <TableHead className="text-primary">Email</TableHead>
                      <TableHead className="text-primary">Website/Social</TableHead>
                      <TableHead className="text-primary">Applied</TableHead>
                      <TableHead className="text-primary text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium">
                          {affiliate.user?.firstName} {affiliate.user?.lastName}
                        </TableCell>
                        <TableCell>{affiliate.user?.email}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {affiliate.websiteUrl && (
                              <a href={affiliate.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                                {affiliate.websiteUrl}
                              </a>
                            )}
                            {affiliate.socialMedia && <span className="text-muted-foreground">{affiliate.socialMedia}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(affiliate.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveAffiliateMutation.mutate(affiliate.id)}
                              disabled={approveAffiliateMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approveAffiliateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason (optional):');
                                rejectAffiliateMutation.mutate({ affiliateId: affiliate.id, reason: reason || 'Application rejected' });
                              }}
                              disabled={rejectAffiliateMutation.isPending}
                            >
                              {rejectAffiliateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Affiliate Performance */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle className="font-heading text-lg">Affiliate Performance</CardTitle>
              </div>
              <CardDescription>Traffic sources and conversion tracking per approved affiliate partner.</CardDescription>
            </CardHeader>
            <CardContent>
              {affiliateStats.filter(a => a.status === 'approved').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved affiliates yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-primary">Affiliate Name</TableHead>
                      <TableHead className="text-primary">Referral Code</TableHead>
                      <TableHead className="text-primary text-right">Traffic (Clicks)</TableHead>
                      <TableHead className="text-primary text-right">Converted Sales</TableHead>
                      <TableHead className="text-primary text-right">Conversion Rate</TableHead>
                      <TableHead className="text-primary text-right">Total Revenue</TableHead>
                      <TableHead className="text-primary text-right">Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliateStats.filter(a => a.status === 'approved').map((affiliate) => (
                      <TableRow key={affiliate.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium">{affiliate.name}</TableCell>
                        <TableCell>
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono">
                            {affiliate.code}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{affiliate.traffic.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{affiliate.sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{affiliate.conversionRate}%</TableCell>
                        <TableCell className="text-right font-mono">₹{parseFloat(affiliate.revenue).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-green-500">₹{parseFloat(affiliate.totalEarnings).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Google Analytics</CardTitle>
              <CardDescription>
                View your Google Analytics 4 reports directly here. Make sure you have GA4 configured for your site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* GA Setup Instructions */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Create a Google Analytics 4 property at <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">analytics.google.com</a></li>
                    <li>Add your GA4 Measurement ID to the <code className="bg-background px-1 rounded">VITE_GA_MEASUREMENT_ID</code> environment variable</li>
                    <li>The tracking code is already integrated in the app via <code className="bg-background px-1 rounded">client/src/lib/analytics.ts</code></li>
                    <li>E-commerce events (view_item, add_to_cart, purchase) are automatically tracked</li>
                  </ol>
                </div>

                {/* GA Embed */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-muted/30 p-4 border-b border-white/10">
                    <h3 className="font-semibold">Analytics Reports</h3>
                    <p className="text-sm text-muted-foreground">
                      For full analytics access, visit the{' '}
                      <a 
                        href="https://analytics.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google Analytics Dashboard
                      </a>
                    </p>
                  </div>
                  
                  {/* Placeholder for GA Embed - In production, you'd use the Google Analytics Embed API */}
                  <div className="aspect-video bg-background/50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-4xl mb-4">📊</div>
                      <h4 className="font-semibold mb-2">Google Analytics Integration</h4>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        To embed live GA4 reports here, you'll need to use the Google Analytics Embed API 
                        or integrate with Looker Studio for custom dashboards.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button asChild variant="outline" size="sm">
                          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                            Open GA4 Dashboard
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href="https://lookerstudio.google.com" target="_blank" rel="noopener noreferrer">
                            Open Looker Studio
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats from Database */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Users</div>
                    <div className="text-2xl font-bold font-mono">{analytics?.totalUsers || 0}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
                    <div className="text-2xl font-bold font-mono">{analytics?.totalOrders || 0}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Active Products</div>
                    <div className="text-2xl font-bold font-mono">{analytics?.totalProducts || 0}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold font-mono">₹{(analytics?.totalRevenue || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Customers Tab Component
function CustomersTab() {
  const { toast } = useToast();
  const [discountForm, setDiscountForm] = useState({
    userEmail: '',
    discountPercent: '10',
    expiresInDays: '7',
  });
  const [isSending, setIsSending] = useState(false);

  const handleSendDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.userEmail || !discountForm.discountPercent) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/send-discount'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: discountForm.userEmail,
          discountPercent: parseInt(discountForm.discountPercent),
          expiresInDays: parseInt(discountForm.expiresInDays),
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Discount Sent!',
          description: `${discountForm.discountPercent}% discount code sent to ${discountForm.userEmail}. Code: ${data.couponCode}`,
        });
        setDiscountForm({ userEmail: '', discountPercent: '10', expiresInDays: '7' });
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to send discount', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Send Exclusive Discount */}
      <Card className="bg-card border-white/5">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Send Exclusive Discount
          </CardTitle>
          <CardDescription>
            Send a personalized discount code to a customer's email to encourage them to complete their purchase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendDiscount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer Email *</Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={discountForm.userEmail}
                  onChange={(e) => setDiscountForm({ ...discountForm, userEmail: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Percentage *</Label>
                <Select
                  value={discountForm.discountPercent}
                  onValueChange={(v) => setDiscountForm({ ...discountForm, discountPercent: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="40">40%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires In</Label>
                <Select
                  value={discountForm.expiresInDays}
                  onValueChange={(v) => setDiscountForm({ ...discountForm, expiresInDays: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">24 hours</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Discount Email'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-white/5">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-2">💡 Tips for Exclusive Discounts</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use cart notification emails to identify customers who added items but haven't checked out</li>
            <li>Send personalized discounts to encourage purchase completion</li>
            <li>Higher discounts (20%+) work well for high-value carts</li>
            <li>Set shorter expiry (24-72 hours) to create urgency</li>
            <li>Each code is single-use and unique to the customer</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Brands Tab Component
function BrandsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    description: '',
    logoUrl: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: typeof brandForm) => {
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : '/api/brands';
      const method = editingBrand ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to save brand');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsDialogOpen(false);
      setEditingBrand(null);
      setBrandForm({ name: '', description: '', logoUrl: '' });
      toast({ title: editingBrand ? 'Brand updated' : 'Brand created' });
    },
    onError: () => {
      toast({ title: 'Failed to save brand', variant: 'destructive' });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete brand');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({ title: 'Brand deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete brand', variant: 'destructive' });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      // Get presigned URL
      const res = await fetch(getApiUrl('/api/images/upload-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, imageUrl } = await res.json();

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setBrandForm({ ...brandForm, logoUrl: imageUrl });
      toast({ title: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({ title: 'Failed to upload logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || '',
      logoUrl: brand.logoUrl || '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg">Brands</CardTitle>
              <CardDescription>Manage your brand catalog</CardDescription>
            </div>
            <Button onClick={() => {
              setEditingBrand(null);
              setBrandForm({ name: '', description: '', logoUrl: '' });
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Add Brand
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-primary">Logo</TableHead>
                <TableHead className="text-primary">Name</TableHead>
                <TableHead className="text-primary">Description</TableHead>
                <TableHead className="text-primary">Status</TableHead>
                <TableHead className="text-primary text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id} className="border-white/5 hover:bg-white/5">
                  <TableCell>
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 object-contain rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No Logo
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="max-w-md truncate">{brand.description || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      brand.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${brand.name}?`)) {
                            deleteBrandMutation.mutate(brand.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBrandMutation.mutate(brandForm);
            }}
            className="space-y-4"
          >
            <div>
              <Label>Brand Name *</Label>
              <Input
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="space-y-2">
                {brandForm.logoUrl && (
                  <img src={brandForm.logoUrl} alt="Logo preview" className="h-24 w-24 object-contain border rounded" />
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Input
                  placeholder="Or enter logo URL"
                  value={brandForm.logoUrl}
                  onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBrandMutation.isPending}>
                {createBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingBrand ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Blogs Tab Component
function BlogsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: blogs = [] } = useQuery<any[]>({
    queryKey: ['/api/blogs'],
  });

  const createBlogMutation = useMutation({
    mutationFn: async (data: typeof blogForm) => {
      const url = editingBlog ? `/api/blogs/${editingBlog.id}` : '/api/blogs';
      const method = editingBlog ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to save blog');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blogs'] });
      setIsDialogOpen(false);
      setEditingBlog(null);
      setBlogForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        isPublished: false,
        metaTitle: '',
        metaDescription: '',
      });
      toast({ title: editingBlog ? 'Blog updated' : 'Blog created' });
    },
    onError: () => {
      toast({ title: 'Failed to save blog', variant: 'destructive' });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete blog');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blogs'] });
      toast({ title: 'Blog deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete blog', variant: 'destructive' });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const res = await fetch(getApiUrl('/api/images/upload-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, imageUrl } = await res.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setBlogForm({ ...blogForm, featuredImage: imageUrl });
      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featuredImage: blog.featuredImage || '',
      isPublished: blog.isPublished || false,
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg">Blogs</CardTitle>
              <CardDescription>Manage your blog posts</CardDescription>
            </div>
            <Button onClick={() => {
              setEditingBlog(null);
              setBlogForm({
                title: '',
                slug: '',
                excerpt: '',
                content: '',
                featuredImage: '',
                isPublished: false,
                metaTitle: '',
                metaDescription: '',
              });
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Add Blog
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-primary">Image</TableHead>
                <TableHead className="text-primary">Title</TableHead>
                <TableHead className="text-primary">Status</TableHead>
                <TableHead className="text-primary">Views</TableHead>
                <TableHead className="text-primary">Published</TableHead>
                <TableHead className="text-primary text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogs.map((blog) => (
                <TableRow key={blog.id} className="border-white/5 hover:bg-white/5">
                  <TableCell>
                    {blog.featuredImage ? (
                      <img src={blog.featuredImage} alt={blog.title} className="h-16 w-24 object-cover rounded" />
                    ) : (
                      <div className="h-16 w-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{blog.title}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      blog.isPublished ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {blog.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </TableCell>
                  <TableCell>{blog.views || 0}</TableCell>
                  <TableCell>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(blog)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${blog.title}"?`)) {
                            deleteBlogMutation.mutate(blog.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? 'Edit Blog' : 'Add Blog'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBlogMutation.mutate(blogForm);
            }}
            className="space-y-4"
          >
            <div>
              <Label>Title *</Label>
              <Input
                value={blogForm.title}
                onChange={(e) => {
                  setBlogForm({
                    ...blogForm,
                    title: e.target.value,
                    slug: blogForm.slug || generateSlug(e.target.value),
                  });
                }}
                required
              />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input
                value={blogForm.slug}
                onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Excerpt</Label>
              <Textarea
                value={blogForm.excerpt}
                onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                rows={2}
                placeholder="Short description for preview"
              />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                value={blogForm.content}
                onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                rows={10}
                required
                placeholder="Full blog content (HTML supported)"
              />
            </div>
            <div>
              <Label>Featured Image</Label>
              <div className="space-y-2">
                {blogForm.featuredImage && (
                  <img src={blogForm.featuredImage} alt="Featured" className="h-32 w-full object-cover border rounded" />
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Input
                  placeholder="Or enter image URL"
                  value={blogForm.featuredImage}
                  onChange={(e) => setBlogForm({ ...blogForm, featuredImage: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={blogForm.isPublished}
                onChange={(e) => setBlogForm({ ...blogForm, isPublished: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isPublished">Publish immediately</Label>
            </div>
            <div>
              <Label>Meta Title (SEO)</Label>
              <Input
                value={blogForm.metaTitle}
                onChange={(e) => setBlogForm({ ...blogForm, metaTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Meta Description (SEO)</Label>
              <Textarea
                value={blogForm.metaDescription}
                onChange={(e) => setBlogForm({ ...blogForm, metaDescription: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBlogMutation.isPending}>
                {createBlogMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingBlog ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
