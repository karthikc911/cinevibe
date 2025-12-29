import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Generate a secure token for mobile authentication
function generateMobileToken(userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  // Simple token format: userId.timestamp.random (base64 encoded)
  const token = Buffer.from(`${userId}.${timestamp}.${random}`).toString('base64');
  return token;
}

// POST /api/auth/mobile-login - Login for mobile app
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        languages: true,
        genres: true,
        signupMethod: true,
        isAdmin: true,
        onboardingComplete: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user signed up with OAuth (no password)
    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google Sign-In. Please use Google to login." },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate mobile auth token
    const mobileToken = generateMobileToken(user.id);

    // Store token in database for validation
    await prisma.user.update({
      where: { id: user.id },
      data: { mobileToken },
    });

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    console.log(`[MOBILE_LOGIN] User logged in: ${user.email}`);

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token: mobileToken,
    });
  } catch (error) {
    console.error("[MOBILE_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}

