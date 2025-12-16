import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: "Email and password are required" },
                { status: 400 }
            );
        }

        const result = await loginUser(email, password);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message, requiresVerification: result.requiresVerification },
                { status: 401 }
            );
        }

        // Set JWT cookie
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

        // Return user data without token (it's in the cookie)
        const { token, ...responseWithoutToken } = result;

        return NextResponse.json(responseWithoutToken);
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
