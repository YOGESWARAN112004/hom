
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

        const { id } = await params;
        const body = await req.json();

        const affiliate = await storage.rejectAffiliate(id, body.reason || 'Application rejected');

        if (!affiliate) {
            return NextResponse.json({ message: "Affiliate not found" }, { status: 404 });
        }

        return NextResponse.json(affiliate);

    } catch (error) {
        console.error("Reject affiliate error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to reject affiliate" },
            { status: 500 }
        );
    }
}
