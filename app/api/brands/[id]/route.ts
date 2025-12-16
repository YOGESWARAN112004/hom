
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

        const brand = await storage.updateBrand(id, body);
        if (!brand) {
            return NextResponse.json({ message: "Brand not found" }, { status: 404 });
        }

        return NextResponse.json(brand);

    } catch (error) {
        console.error("Error updating brand:", error);
        return NextResponse.json(
            { success: false, message: "Failed to update brand" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
        await storage.deleteBrand(id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting brand:", error);
        return NextResponse.json(
            { success: false, message: "Failed to delete brand" },
            { status: 500 }
        );
    }
}
