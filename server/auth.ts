import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 12;

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  requiresVerification?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

// ============================================
// PASSWORD UTILITIES
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// REGISTRATION
// ============================================

export async function registerUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string
): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return {
        success: false,
        message: 'An account with this email already exists',
      };
    }

    // Validate password strength
    if (password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await storage.createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'customer',
      isEmailVerified: false,
    });

    // Generate OTP for email verification
    const otp = generateOtp();
    await storage.createOtp(email, otp, 'email_verification', user.id);

    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: { ...user, password: null } as User,
      requiresVerification: true,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'An error occurred during registration',
    };
  }
}

// ============================================
// LOGIN
// ============================================

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const user = await storage.getUserByEmail(email);

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    if (!user.password) {
      return {
        success: false,
        message: 'This account uses social login. Please use the appropriate sign-in method.',
      };
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    if (!user.isEmailVerified) {
      // Generate new OTP for verification
      const otp = generateOtp();
      await storage.createOtp(email, otp, 'email_verification', user.id);

      return {
        success: false,
        message: 'Please verify your email first. A new verification code has been sent.',
        requiresVerification: true,
      };
    }

    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    return {
      success: true,
      message: 'Login successful',
      user: { ...user, password: null } as User,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
}

// ============================================
// EMAIL VERIFICATION
// ============================================

export async function verifyEmail(
  email: string,
  code: string
): Promise<AuthResult> {
  try {
    const otp = await storage.getValidOtp(email, code, 'email_verification');

    if (!otp) {
      return {
        success: false,
        message: 'Invalid or expired verification code',
      };
    }

    // Mark OTP as used
    await storage.markOtpUsed(otp.id);

    // Get and update user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    await storage.updateUser(user.id, { isEmailVerified: true });

    return {
      success: true,
      message: 'Email verified successfully',
      user: { ...user, password: null, isEmailVerified: true } as User,
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      message: 'An error occurred during verification',
    };
  }
}

// ============================================
// RESEND OTP
// ============================================

export async function resendOtp(
  email: string,
  type: 'email_verification' | 'password_reset' = 'email_verification'
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await storage.getUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      };
    }

    const otp = generateOtp();
    await storage.createOtp(email, otp, type, user.id);

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return {
      success: false,
      message: 'Failed to send verification code',
    };
  }
}

// ============================================
// PASSWORD RESET
// ============================================

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    const user = await storage.getUserByEmail(email);

    // Don't reveal if user exists
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      };
    }

    const token = generateRandomToken();
    await storage.createPasswordResetToken(user.id, token);

    // In production, send email with reset link
    // For now, we'll return the token (in dev mode)

    return {
      success: true,
      message: 'Password reset link sent to your email',
      token: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Failed to process password reset request',
    };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const resetToken = await storage.getValidPasswordResetToken(token);

    if (!resetToken) {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    const user = await storage.updateUser(resetToken.userId, {
      password: hashedPassword,
    });

    // Mark token as used
    await storage.markPasswordResetTokenUsed(resetToken.id);

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    return {
      success: true,
      message: 'Password reset successfully',
      user: { ...user, password: null } as User,
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'An error occurred during password reset',
    };
  }
}

// ============================================
// CHANGE PASSWORD (for logged-in users)
// ============================================

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await storage.getUser(userId);

    if (!user || !user.password) {
      return {
        success: false,
        message: 'User not found or uses social login',
      };
    }

    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Current password is incorrect',
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'New password must be at least 8 characters long',
      };
    }

    const hashedPassword = await hashPassword(newPassword);
    await storage.updateUser(userId, { password: hashedPassword });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: 'An error occurred while changing password',
    };
  }
}

