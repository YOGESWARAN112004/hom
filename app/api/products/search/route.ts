import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        if (!query) {
            return NextResponse.json([]);
        }

        const products = await storage.searchProducts(query);
        return NextResponse.json(products);
    } catch (error) {
        console.error("Search products error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
