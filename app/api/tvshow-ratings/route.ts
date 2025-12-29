import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/mobile-auth";

// GET /api/tvshow-ratings - Get all TV show ratings for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ratings = await prisma.tvShowRating.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    logger.info('TV_SHOW_RATINGS', 'Fetched TV show ratings', {
      userId: user.id,
      count: ratings.length,
    });

    return NextResponse.json({ ratings });
  } catch (error: any) {
    logger.error('TV_SHOW_RATINGS', 'Failed to fetch TV show ratings', {
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}

// POST /api/tvshow-ratings - Create or update a TV show rating
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    logger.info('TV_SHOW_RATINGS', 'POST request received', {
      hasSession: !!session,
      hasMobileToken: !!authHeader,
      userEmail: currentUser?.email,
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized", message: "You must be logged in to rate TV shows" }, { status: 401 });
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found", message: "User account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { tvShowId, tvShowName, tvShowYear, rating } = body;

    logger.info('TV_SHOW_RATINGS', 'Save rating request', {
      userId: user.id,
      tvShowId,
      tvShowName,
      tvShowYear,
      rating,
      bodyReceived: body,
    });

    // Validate inputs with detailed error messages
    if (!tvShowId) {
      logger.warn('TV_SHOW_RATINGS', 'Missing tvShowId', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "tvShowId is required" },
        { status: 400 }
      );
    }
    
    if (!tvShowName) {
      logger.warn('TV_SHOW_RATINGS', 'Missing tvShowName', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "tvShowName is required" },
        { status: 400 }
      );
    }
    
    if (!rating) {
      logger.warn('TV_SHOW_RATINGS', 'Missing rating', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "rating is required" },
        { status: 400 }
      );
    }

    // Ensure tvShowId is a valid number
    const parsedTvShowId = typeof tvShowId === 'number' ? tvShowId : parseInt(String(tvShowId), 10);
    
    if (isNaN(parsedTvShowId)) {
      logger.error('TV_SHOW_RATINGS', 'Invalid tvShowId format', { tvShowId, typeof: typeof tvShowId });
      return NextResponse.json(
        { error: "Invalid tvShowId", message: `tvShowId must be a number, got: ${typeof tvShowId}` },
        { status: 400 }
      );
    }

    // Save or update rating
    const savedRating = await prisma.tvShowRating.upsert({
      where: {
        userId_tvShowId: {
          userId: user.id,
          tvShowId: parsedTvShowId,
        },
      },
      update: {
        rating,
        tvShowName: String(tvShowName),
        tvShowYear: tvShowYear ? parseInt(String(tvShowYear)) : null,
      },
      create: {
        userId: user.id,
        tvShowId: parsedTvShowId,
        tvShowName: String(tvShowName),
        tvShowYear: tvShowYear ? parseInt(String(tvShowYear)) : null,
        rating,
      },
    });

    logger.info('TV_SHOW_RATINGS', '✓ Rating saved successfully', {
      userId: user.id,
      tvShowId: savedRating.tvShowId,
      tvShowName: savedRating.tvShowName,
      rating: savedRating.rating,
    });

    return NextResponse.json({ rating: savedRating, success: true });
  } catch (error: any) {
    logger.error('TV_SHOW_RATINGS', '❌ Save rating error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Failed to save rating", message: error.message || "Database error" }, { status: 500 });
  }
}

// DELETE /api/tvshow-ratings - Delete a TV show rating
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tvShowId = searchParams.get("tvShowId");

    if (!tvShowId) {
      return NextResponse.json(
        { error: "Missing tvShowId parameter" },
        { status: 400 }
      );
    }

    await prisma.tvShowRating.delete({
      where: {
        userId_tvShowId: {
          userId: user.id,
          tvShowId: parseInt(tvShowId),
        },
      },
    });

    logger.info('TV_SHOW_RATINGS', 'Rating deleted', {
      userId: user.id,
      tvShowId: parseInt(tvShowId),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('TV_SHOW_RATINGS', 'Delete rating error', {
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 });
  }
}

