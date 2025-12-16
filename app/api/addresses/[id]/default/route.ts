
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        const { id } = await params;
        const address = await storage.getAddress(id);

        if (!address) {
            return NextResponse.json({ message: "Address not found" }, { status: 404 });
        }

        if (address.userId !== payload.userId) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await storage.setDefaultAddress(payload.userId, id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Set default address error:", error);
        return NextResponse.json({ message: "Failed to set default address" }, { status: 500 });
    }
}
