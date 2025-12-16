"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth"; // Need to ensure this path is correct or update it
import { ShopProvider } from "@/hooks/use-shop"; // Need to ensure this path is correct or update it
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: false,
                staleTime: 5 * 60 * 1000,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {/* We might need to adjust AuthProvider to work with Next.js cookies/API */}
            {/* For now, let's assume it works or we'll fix it shortly */}
            <AuthProvider>
                <ShopProvider>
                    <TooltipProvider>
                        {children}
                        <Toaster />
                    </TooltipProvider>
                </ShopProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
