import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertAddressSchema } from "@shared/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

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

        const addresses = await storage.getAddresses(payload.userId);
        return NextResponse.json(addresses);

    } catch (error) {
        console.error("Fetch addresses error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch addresses" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const addressData = insertAddressSchema.parse({ ...body, userId: payload.userId });
        const address = await storage.createAddress(addressData);

        return NextResponse.json(address, { status: 201 });

    } catch (error) {
        console.error("Create address error:", error);
        if ((error as any).name === 'ZodError') {
            return NextResponse.json({ success: false, message: "Invalid input", errors: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, message: "Failed to create address" },
            { status: 500 }
        );
    }
}
