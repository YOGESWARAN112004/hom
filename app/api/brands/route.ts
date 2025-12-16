import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertBrandSchema } from "@shared/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
    try {
        const brands = await storage.getBrands();
        return NextResponse.json(brands);
    } catch (error) {
        console.error("Error fetching brands:", error);
        return NextResponse.json(
            { message: "Failed to fetch brands" },
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
        const brandData = insertBrandSchema.parse(body);

        // Check if brand already exists
        const existing = await storage.getBrandByName(brandData.name);
        if (existing) {
            return NextResponse.json({ message: "Brand already exists" }, { status: 400 });
        }

        const brand = await storage.createBrand(brandData);
        return NextResponse.json(brand, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Invalid brand data", errors: error.errors }, { status: 400 });
        }
        console.error("Error creating brand:", error);
        return NextResponse.json(
            { success: false, message: "Failed to create brand" },
            { status: 500 }
        );
    }
}
