import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { insertUserSchema } from "@shared/schema";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate input using the shared schema
        // We only validate the fields we expect for registration
        const validationResult = insertUserSchema.pick({
            email: true,
            password: true,
            firstName: true,
            lastName: true,
            phone: true,
        }).safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, message: "Invalid input data", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { email, password, firstName, lastName, phone } = validationResult.data;

        if (!password) {
            return NextResponse.json(
                { success: false, message: "Password is required" },
                { status: 400 }
            );
        }

        const result = await registerUser(email, password, firstName || undefined, lastName || undefined, phone || undefined);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        // Send verification email
        if (result.user && result.requiresVerification && result.otpCode) {
            try {
                await sendVerificationEmail(email, result.otpCode, firstName || undefined);
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError);
                // We don't fail the request, but we log it.
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
