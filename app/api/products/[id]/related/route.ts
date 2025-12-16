import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const product = await storage.getProduct(params.id);

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        // Get products in the same category or brand
        // Ideally we'd have a specific method for this, but for now we can fetch by category
        const relatedProducts = await storage.getProductsByCategory(product.category);

        // Filter out the current product and limit to 4
        const filtered = relatedProducts
            .filter(p => p.id !== product.id)
            .slice(0, 4);

        return NextResponse.json(filtered);
    } catch (error) {
        console.error("Get related products error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
