
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/auth");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">My Account</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
                    <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                    <div className="mt-4">
                        <Button onClick={() => logout()}>Logout</Button>
                    </div>
                </div>

                <div className="p-6 border rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Affiliate & Address Details</h2>
                    <p className="text-muted-foreground">Manage your addresses and affiliate status via the designated sections.</p>
                    {/* We can expand this later */}
                </div>
            </div>
        </div>
    );
}
