import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest) {
    try {
        const products = await storage.getProducts();
        const featuredProducts = products.filter(p => p.isFeatured);

        return NextResponse.json(featuredProducts);
    } catch (error) {
        console.error("Get featured products error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
