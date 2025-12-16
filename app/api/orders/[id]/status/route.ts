import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json(
                { success: false, message: "Status is required" },
                { status: 400 }
            );
        }

        const updatedOrder = await storage.updateOrderStatus(params.id, status);
        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error("Update order status error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
