import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
}).refine(data => data.email || data.username, {
  message: "Either email or username must be provided",
  path: ["email"]
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  bio: z.string().optional(),
  publicEmail: z.string().email('Invalid email address').optional().nullable(),
  socialLinks: z.record(z.string().url()).optional(),
});
