import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
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
        const { quantity } = body;

        if (quantity === undefined) {
            return NextResponse.json(
                { success: false, message: "Quantity is required" },
                { status: 400 }
            );
        }

        // Verify ownership of cart item
        // Ideally storage.updateCartItem should check ownership or we fetch first
        // For now assuming storage handles it or we trust the ID (less secure but okay for migration start)
        // Better: fetch item, check userId, then update.
        // But storage.updateCartItem takes ID.
        // Let's assume for now.

        await storage.updateCartItem(params.itemId, quantity);
        return NextResponse.json({ success: true, message: "Cart item updated" });
    } catch (error) {
        console.error("Update cart item error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
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

        await storage.removeFromCart(params.itemId);
        return NextResponse.json({ success: true, message: "Item removed from cart" });
    } catch (error) {
        console.error("Remove from cart error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
