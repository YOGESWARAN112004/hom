
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertBlogSchema } from "@shared/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        // Authenticate optionally to check for admin role
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        let isAdmin = false;

        if (token) {
            const payload = await verifyToken(token);
            if (payload && payload.role === 'admin') {
                isAdmin = true;
            }
        }

        // Return published blogs for public, all for admin
        const publishedOnly = !isAdmin;
        const blogs = await storage.getBlogs(publishedOnly);
        return NextResponse.json(blogs);

    } catch (error) {
        console.error("Fetch blogs error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch blogs" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const blogData = insertBlogSchema.parse({
            ...body,
            authorId: payload.userId,
            publishedAt: body.isPublished ? new Date() : null,
        });

        const blog = await storage.createBlog(blogData);
        return NextResponse.json(blog, { status: 201 });

    } catch (error) {
        console.error("Create blog error:", error);
        if ((error as any).name === 'ZodError') {
            return NextResponse.json({ success: false, message: "Invalid input", errors: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, message: "Failed to create blog" },
            { status: 500 }
        );
    }
}
