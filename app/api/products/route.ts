
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertProductSchema } from "@shared/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const brand = searchParams.get("brand");
        const category = searchParams.get("category");
        const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string) : undefined;
        const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset") as string) : undefined;

        // Sorting
        const sort = searchParams.get("sort"); // price_asc, price_desc, new, etc.

        // Note: storage.getProducts needs to support these filters. 
        // Based on legacy code, it accepts a filter object.
        const filters: any = {};
        if (brand) filters.brand = brand;
        if (category) filters.category = category;
        if (sort) filters.sort = sort;
        if (limit) filters.limit = limit;
        if (offset) filters.offset = offset;

        const lowStock = searchParams.get("lowStock") === "true";

        // Get current user for dynamic pricing
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        let userId: string | undefined;
        if (token) {
            const payload = await verifyToken(token);
            if (payload) userId = payload.userId;
        }

        let products = await storage.getProducts(filters, userId);

        if (lowStock) {
            products = products.filter((p: any) => p.stock <= 5);
        }

        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { message: "Failed to fetch products" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        // Extract images array from body, as it's not part of the product schema directly
        const { images, ...productDataRaw } = body;

        const productData = insertProductSchema.parse(productDataRaw);

        const product = await storage.createProduct(productData);

        // Handle multiple images if provided
        if (images && Array.isArray(images) && images.length > 0) {
            let primaryImageUrl = productData.imageUrl;
            
            for (let i = 0; i < images.length; i++) {
                const imageUrl = images[i];
                // Ensure URL is absolute (starts with http:// or https://)
                const absoluteUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://') 
                    ? imageUrl 
                    : imageUrl;
                
                const isPrimary = imageUrl === productData.imageUrl || (i === 0 && !productData.imageUrl);
                
                await storage.addProductImage({
                    productId: product.id,
                    url: absoluteUrl,
                    sortOrder: i,
                    isPrimary: isPrimary
                });
                
                // Update product imageUrl if this is the primary image
                if (isPrimary && !primaryImageUrl) {
                    primaryImageUrl = absoluteUrl;
                }
            }
            
            // Update product imageUrl to match primary image if needed
            if (primaryImageUrl && primaryImageUrl !== product.imageUrl) {
                await storage.updateProduct(product.id, { imageUrl: primaryImageUrl });
            }
        } else if (productData.imageUrl) {
            // Ensure URL is absolute
            const absoluteUrl = productData.imageUrl.startsWith('http://') || productData.imageUrl.startsWith('https://')
                ? productData.imageUrl
                : productData.imageUrl;
            
            // If no images array but imageUrl exists, add it as single image
            await storage.addProductImage({
                productId: product.id,
                url: absoluteUrl,
                sortOrder: 0,
                isPrimary: true
            });
            
            // Ensure product imageUrl is set correctly
            if (absoluteUrl !== product.imageUrl) {
                await storage.updateProduct(product.id, { imageUrl: absoluteUrl });
            }
        }

        return NextResponse.json(product, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Invalid product data", errors: error.errors }, { status: 400 });
        }
        console.error("Error creating product:", error);
        return NextResponse.json(
            { success: false, message: "Failed to create product" },
            { status: 500 }
        );
    }
}
