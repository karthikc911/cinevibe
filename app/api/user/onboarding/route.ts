import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { languages, moviePreference } = body;

    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: "At least one language is required" },
        { status: 400 }
      );
    }

    // Update user with onboarding data
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        languages,
        moviePreference: moviePreference || null,
        onboardingComplete: true,
      },
    });

    logger.info("ONBOARDING", "User completed onboarding", {
      userId: session.user.id,
      languages,
      hasPreference: !!moviePreference,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        languages: updatedUser.languages,
        moviePreference: updatedUser.moviePreference,
        onboardingComplete: updatedUser.onboardingComplete,
      },
    });
  } catch (error: any) {
    logger.error("ONBOARDING", "Error saving onboarding data", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
