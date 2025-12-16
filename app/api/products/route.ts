
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
        const productData = insertProductSchema.parse(body);

        const product = await storage.createProduct(productData);
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
