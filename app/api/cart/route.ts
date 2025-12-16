import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
        }

        const cartItems = await storage.getCartItems(payload.userId);
        return NextResponse.json(cartItems);
    } catch (error) {
        console.error("Get cart error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
        }

        const body = await req.json();
        const { productId, variantId, quantity } = body;

        if (!productId || !quantity) {
            return NextResponse.json(
                { success: false, message: "Product ID and quantity are required" },
                { status: 400 }
            );
        }

        const cartItem = await storage.addToCart({
            userId: payload.userId,
            productId,
            variantId: variantId || null,
            quantity
        });
        return NextResponse.json(cartItem, { status: 201 });
    } catch (error) {
        console.error("Add to cart error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
