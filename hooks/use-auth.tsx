import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/apiConfig";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  role: 'customer' | 'admin' | 'affiliate';
  isEmailVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean }>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Fetch current user
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const res = await fetch(getApiUrl('/api/auth/user'), { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error('Failed to fetch user');
        }
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const login = async (email: string, password: string) => {
    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await res.json();

    if (data.success) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }

    if (data.requiresVerification) {
      setPendingEmail(email);
    }

    return data;
  };

  const register = async (registerData: RegisterData) => {
    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
      credentials: 'include',
    });

    const data = await res.json();

    if (data.requiresVerification) {
      setPendingEmail(registerData.email);
    }

    return data;
  };

  const verifyOtp = async (email: string, code: string) => {
    const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      credentials: 'include',
    });

    const data = await res.json();

    if (data.success) {
      setPendingEmail(null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }

    return data;
  };

  const resendOtp = async (email: string) => {
    const res = await fetch(getApiUrl('/api/auth/resend-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    return res.json();
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    return res.json();
  };

  const resetPassword = async (token: string, password: string) => {
    const res = await fetch(getApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
      credentials: 'include',
    });

    return res.json();
  };

  const logout = async () => {
    await fetch(getApiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    queryClient.clear();
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await fetch(getApiUrl('/api/auth/user'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      return { success: true };
    }

    return { success: false };
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

