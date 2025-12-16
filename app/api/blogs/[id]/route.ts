
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        let blog = await storage.getBlog(id);
        if (!blog) {
            blog = await storage.getBlogBySlug(id);
        }

        if (!blog) {
            return NextResponse.json({ message: "Blog not found" }, { status: 404 });
        }

        // Increment views if published
        if (blog.isPublished) {
            await storage.incrementBlogViews(blog.id);
        }

        return NextResponse.json(blog);
    } catch (error) {
        console.error("Fetch blog error:", error);
        return NextResponse.json({ message: "Failed to fetch blog" }, { status: 500 });
    }
}

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

        // Handle publishing logic
        if (body.isPublished && !body.publishedAt) {
            const existing = await storage.getBlog(id);
            if (existing && !existing.publishedAt) {
                body.publishedAt = new Date();
            }
        }

        const updated = await storage.updateBlog(id, body);
        if (!updated) {
            return NextResponse.json({ message: "Blog not found" }, { status: 404 });
        }

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Update blog error:", error);
        return NextResponse.json({ message: "Failed to update blog" }, { status: 500 });
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
        await storage.deleteBlog(id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete blog error:", error);
        return NextResponse.json({ message: "Failed to delete blog" }, { status: 500 });
    }
}
