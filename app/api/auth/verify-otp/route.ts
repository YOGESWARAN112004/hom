import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json(
                { success: false, message: "Email and verification code are required" },
                { status: 400 }
            );
        }

        const result = await verifyEmail(email, code);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        // Set JWT cookie if verification successful and token provided
        if (result.token) {
            const cookieStore = await cookies();
            cookieStore.set("token", result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: "/",
            });
        }

        const { token, ...responseWithoutToken } = result;
        return NextResponse.json(responseWithoutToken);
    } catch (error) {
        console.error("OTP verification error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
