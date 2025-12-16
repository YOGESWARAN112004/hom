import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link, useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Filter, Grid3X3, LayoutList, ShoppingBag, Heart } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { trackAddToCart } from "@/lib/analytics";
import { generateImageSrcSet, generateImageSizes } from "@/lib/imageUtils";

interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  basePrice: string;
  compareAtPrice: string | null;
  category: string;
  subCategory: string;
  brand: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  imageUrl: string | null;
}

interface Brand {
  id: string;
  name: string;
}

const CATEGORIES = ['All', 'Men', 'Women', 'Kids', 'Accessories'];
const SUB_CATEGORIES = ['All', 'Clothing', 'Shoes', 'Bags', 'Watches', 'Jewelry', 'Accessories'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A-Z' },
];

export default function Shop() {
  const [location] = useLocation();
  const { addToCart } = useShop();
  
  // Check for route params from /category/:category/:subCategory or /category/:category or /brand/:brand
  const [, categoryWithSubParams] = useRoute('/category/:category/:subCategory');
  const [, categoryParams] = useRoute('/category/:category');
  const [, brandParams] = useRoute('/brand/:brand');
  
  // Parse URL parameters from query string
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  
  // Helper to capitalize words
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  
  // Determine initial values from route params or query params
  const routeCategory = categoryWithSubParams?.category 
    ? capitalize(categoryWithSubParams.category)
    : categoryParams?.category 
      ? capitalize(categoryParams.category)
      : null;
      
  const routeSubCategory = categoryWithSubParams?.subCategory
    ? capitalize(categoryWithSubParams.subCategory)
    : null;
    
  const routeBrand = brandParams?.brand 
    ? brandParams.brand.split('-').map((w: string) => capitalize(w)).join(' ')
    : null;
    
  const urlCategory = routeCategory || urlParams.get('category') || 'All';
  const urlSubCategory = routeSubCategory || urlParams.get('subCategory') || 'All';
  const urlBrand = routeBrand || urlParams.get('brand') || 'All';
  const urlSearch = urlParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState(urlSubCategory);
  const [selectedBrand, setSelectedBrand] = useState(urlBrand);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Update state when URL params change
  useEffect(() => {
    setSelectedCategory(urlCategory);
    setSelectedSubCategory(urlSubCategory);
    setSelectedBrand(urlBrand);
    setSearchTerm(urlSearch);
  }, [urlCategory, urlSubCategory, urlBrand, urlSearch]);

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch brands
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
  });

  // Filter and sort products
  const filteredProducts = products
    .filter(p => {
      if (selectedCategory !== 'All' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (selectedSubCategory !== 'All' && p.subCategory.toLowerCase() !== selectedSubCategory.toLowerCase()) return false;
      if (selectedBrand !== 'All' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case 'price-high':
          return parseFloat(b.basePrice) - parseFloat(a.basePrice);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: parseFloat(product.basePrice),
      quantity: 1,
      imageUrl: product.images?.[0]?.url || product.imageUrl || '',
      brand: product.brand,
      category: product.category,
      subCategory: product.subCategory,
    });
    trackAddToCart(product.id, product.name, parseFloat(product.basePrice), product.brand, product.category);
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedSubCategory('All');
    setSelectedBrand('All');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedCategory !== 'All' || selectedSubCategory !== 'All' || selectedBrand !== 'All' || searchTerm;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-secondary/50 to-background py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-heading text-4xl md:text-5xl text-center mb-4">SHOP</h1>
          <p className="text-center text-muted-foreground">
            {hasActiveFilters ? (
              <>Showing {filteredProducts.length} products</>
            ) : (
              <>Explore our curated collection</>
            )}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Bar */}
        <div className="space-y-4 mb-8">
          {/* Search - Full Width on Mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 border-white/10 w-full"
            />
          </div>

          {/* Filter Dropdowns - Scrollable on Mobile */}
          <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[110px] sm:w-[140px] bg-background/50 border-white/10 shrink-0">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub-Category Filter */}
            <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
              <SelectTrigger className="w-[100px] sm:w-[140px] bg-background/50 border-white/10 shrink-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {SUB_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand Filter */}
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[100px] sm:w-[140px] bg-background/50 border-white/10 shrink-0">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] sm:w-[160px] bg-background/50 border-white/10 shrink-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                Clear
              </Button>
            )}

            {/* View Toggle */}
            <div className="flex gap-1 ml-auto shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-9 w-9"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-9 w-9 hidden sm:flex"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== 'All' && (
              <Badge variant="secondary" className="gap-1">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedSubCategory !== 'All' && (
              <Badge variant="secondary" className="gap-1">
                {selectedSubCategory}
                <button onClick={() => setSelectedSubCategory('All')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedBrand !== 'All' && (
              <Badge variant="secondary" className="gap-1">
                {selectedBrand}
                <button onClick={() => setSelectedBrand('All')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or search term</p>
            <Button onClick={clearFilters}>Clear All Filters</Button>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
            : "space-y-4"
          }>
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                viewMode={viewMode}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ 
  product, 
  viewMode, 
  onAddToCart 
}: { 
  product: Product; 
  viewMode: 'grid' | 'list';
  onAddToCart: () => void;
}) {
  const imageUrl = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || product.imageUrl || '/placeholder.svg';
  const hasDiscount = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.basePrice);
  const discountPercent = hasDiscount 
    ? Math.round((1 - parseFloat(product.basePrice) / parseFloat(product.compareAtPrice!)) * 100)
    : 0;

  if (viewMode === 'list') {
    return (
      <Card className="bg-card border-white/5 overflow-hidden">
        <div className="flex gap-6 p-4">
          <Link href={`/product/${product.id}`}>
            <div className="w-32 h-32 bg-secondary rounded overflow-hidden shrink-0">
              <img 
                src={imageUrl || '/placeholder.svg'} 
                srcSet={imageUrl ? generateImageSrcSet(imageUrl, { widths: [256, 512, 1024], maxWidth: 1024 }) : undefined}
                sizes="128px"
                alt={product.name} 
                className="w-full h-full object-contain hover:scale-105 transition-transform"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                  target.onerror = null;
                }}
              />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-primary uppercase tracking-wider">{product.brand}</span>
            <Link href={`/product/${product.id}`}>
              <h3 className="font-heading text-lg hover:text-primary transition-colors">{product.name}</h3>
            </Link>
            <p className="text-sm text-muted-foreground mb-2">{product.category} / {product.subCategory}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{product.shortDescription || product.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg">₹{parseFloat(product.basePrice).toLocaleString()}</span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{parseFloat(product.compareAtPrice!).toLocaleString()}
                  </span>
                )}
              </div>
              <Button size="sm" onClick={onAddToCart}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-white/5 overflow-hidden group">
      <Link href={`/product/${product.id}`}>
        <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
          <img 
            src={imageUrl || '/placeholder.svg'} 
            srcSet={imageUrl ? generateImageSrcSet(imageUrl, { widths: [400, 800, 1200, 1600], maxWidth: 1600 }) : undefined}
            sizes={imageUrl ? generateImageSizes({
              mobile: '50vw',
              tablet: '33vw',
              desktop: '25vw',
              large: '25vw',
            }) : undefined}
            alt={product.name} 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
              target.onerror = null;
            }}
          />
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-destructive">-{discountPercent}%</Badge>
          )}
          {product.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-primary">Featured</Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-2 sm:p-4">
        <span className="text-[9px] sm:text-[10px] text-primary uppercase tracking-widest">{product.brand}</span>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-heading text-xs sm:text-sm mt-1 line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
        </Link>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">{product.category}</p>
        <div className="flex items-center justify-between mt-2 sm:mt-3">
          <div>
            <span className="font-mono text-xs sm:text-sm">₹{parseFloat(product.basePrice).toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through ml-1 sm:ml-2">
                ₹{parseFloat(product.compareAtPrice!).toLocaleString()}
              </span>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); onAddToCart(); }} className="h-8 w-8 sm:h-9 sm:w-9">
            <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

