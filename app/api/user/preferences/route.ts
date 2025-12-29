import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/mobile-auth";

/**
 * GET /api/user/preferences
 * Fetch user preferences (languages, genres, aiInstructions)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: {
        languages: true,
        genres: true,
        aiInstructions: true,
        recYearFrom: true,
        recYearTo: true,
        recMinImdb: true,
        recMinBoxOffice: true,
        recMaxBudget: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info("USER_PREFERENCES", "User preferences fetched", {
      userEmail: currentUser.email,
      hasLanguages: user.languages.length > 0,
      hasGenres: user.genres.length > 0,
      hasAiInstructions: !!user.aiInstructions,
    });

    return NextResponse.json({
      success: true,
      languages: user.languages || [],
      genres: user.genres || [],
      aiInstructions: user.aiInstructions || "",
      recYearFrom: user.recYearFrom,
      recYearTo: user.recYearTo,
      recMinImdb: user.recMinImdb,
      recMinBoxOffice: user.recMinBoxOffice ? Number(user.recMinBoxOffice) : null,
      recMaxBudget: user.recMaxBudget ? Number(user.recMaxBudget) : null,
    });
  } catch (error: any) {
    logger.error("USER_PREFERENCES", "Error fetching user preferences", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Save user preferences (languages, genres, aiInstructions, and filter preferences)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      languages, 
      genres, 
      aiInstructions,
      recCount,
      recYearFrom,
      recYearTo,
      recMinImdb,
      recMinBoxOffice,
      recMaxBudget
    } = body;

    // Validate languages
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: "At least one language is required" },
        { status: 400 }
      );
    }

    // Validate genres (optional)
    if (genres && !Array.isArray(genres)) {
      return NextResponse.json(
        { error: "Genres must be an array" },
        { status: 400 }
      );
    }

    // Validate aiInstructions (optional)
    if (aiInstructions && typeof aiInstructions !== "string") {
      return NextResponse.json(
        { error: "AI instructions must be a string" },
        { status: 400 }
      );
    }

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { email: currentUser.email },
      data: {
        languages: languages,
        genres: genres || [],
        aiInstructions: aiInstructions || null,
        recCount: recCount !== undefined ? recCount : undefined,
        recYearFrom: recYearFrom !== undefined ? recYearFrom : undefined,
        recYearTo: recYearTo !== undefined ? recYearTo : undefined,
        recMinImdb: recMinImdb !== undefined ? recMinImdb : undefined,
        recMinBoxOffice: recMinBoxOffice !== undefined && recMinBoxOffice !== null ? BigInt(recMinBoxOffice) : null,
        recMaxBudget: recMaxBudget !== undefined && recMaxBudget !== null ? BigInt(recMaxBudget) : null,
        updatedAt: new Date(),
      },
    });

    logger.info("USER_PREFERENCES", "User preferences updated", {
      userEmail: currentUser.email,
      languages: languages.length,
      genres: genres?.length || 0,
      hasAiInstructions: !!aiInstructions,
      recCount,
      recYearFrom,
      recYearTo,
      recMinImdb,
    });

    return NextResponse.json({
      success: true,
      languages: updatedUser.languages,
      genres: updatedUser.genres,
      aiInstructions: updatedUser.aiInstructions,
      recCount: updatedUser.recCount,
      recYearFrom: updatedUser.recYearFrom,
      recYearTo: updatedUser.recYearTo,
      recMinImdb: updatedUser.recMinImdb,
      recMinBoxOffice: updatedUser.recMinBoxOffice ? Number(updatedUser.recMinBoxOffice) : null,
      recMaxBudget: updatedUser.recMaxBudget ? Number(updatedUser.recMaxBudget) : null,
    });
  } catch (error: any) {
    logger.error("USER_PREFERENCES", "Error saving user preferences", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}

