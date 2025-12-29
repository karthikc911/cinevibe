import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * Generate a secure mobile token for authentication
 */
function generateMobileToken(userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  const token = Buffer.from(`${userId}.${timestamp}.${random}`).toString('base64');
  return token;
}

/**
 * POST /api/auth/google-mobile
 * Handle Google OAuth login from mobile app
 * Creates user if doesn't exist, returns auth token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, googleId, picture } = body;

    logger.info("GOOGLE_MOBILE_AUTH", "Google mobile login attempt", {
      email,
      hasGoogleId: !!googleId,
    });

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Create new user with Google account
      logger.info("GOOGLE_MOBILE_AUTH", "Creating new user from Google", { email });
      
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          image: picture || null,
          // No password for Google users
          password: null,
          // Default preferences
          languages: ['English'],
          genres: [],
        },
      });
    } else if (!user.name && name) {
      // Update name if user exists but doesn't have a name
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    // Generate mobile token
    const mobileToken = generateMobileToken(user.id);

    // Store the token in the database
    await prisma.user.update({
      where: { id: user.id },
      data: { mobileToken },
    });

    logger.info("GOOGLE_MOBILE_AUTH", "Google mobile login successful", {
      userId: user.id,
      email: user.email,
    });

    // Return user data (without password)
    const { password: _, mobileToken: __, ...userWithoutSensitive } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutSensitive,
      token: mobileToken,
    });
  } catch (error: any) {
    logger.error("GOOGLE_MOBILE_AUTH", "Google mobile auth failed", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}

