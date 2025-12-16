import { NextRequest, NextResponse } from "next/server";
import { resendOtp } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, type } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, message: "Email is required" },
                { status: 400 }
            );
        }

        const result = await resendOtp(email, type || 'email_verification');

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        if (result.otpCode) {
            try {
                await sendVerificationEmail(email, result.otpCode);
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError);
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Resend OTP error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
