import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        const payload = await verifyToken(token);

        if (!payload) {
            return NextResponse.json(
                { success: false, message: "Invalid token" },
                { status: 401 }
            );
        }

        const user = await storage.getUser(payload.userId);

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;

        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error("Get current user error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
