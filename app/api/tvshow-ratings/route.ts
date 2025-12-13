import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/tvshow-ratings - Get all TV show ratings for current user
export async function GET(request: NextRequest) {
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

    const body = await request.json();
    const { tvShowId, tvShowName, tvShowYear, rating } = body;

    logger.info('TV_SHOW_RATINGS', 'Save rating request', {
      userId: user.id,
      tvShowId,
      tvShowName,
      rating,
    });

    // Validate inputs
    if (!tvShowId || !tvShowName || !rating) {
      logger.warn('TV_SHOW_RATINGS', 'Missing required fields', { body });
      return NextResponse.json(
        { error: "Missing required fields: tvShowId, tvShowName, rating" },
        { status: 400 }
      );
    }

    // Save or update rating
    const savedRating = await prisma.tvShowRating.upsert({
      where: {
        userId_tvShowId: {
          userId: user.id,
          tvShowId: parseInt(tvShowId),
        },
      },
      update: {
        rating,
        tvShowName,
        tvShowYear: tvShowYear ? parseInt(tvShowYear) : null,
      },
      create: {
        userId: user.id,
        tvShowId: parseInt(tvShowId),
        tvShowName,
        tvShowYear: tvShowYear ? parseInt(tvShowYear) : null,
        rating,
      },
    });

    logger.info('TV_SHOW_RATINGS', '✓ Rating saved successfully', {
      userId: user.id,
      tvShowId: savedRating.tvShowId,
      rating: savedRating.rating,
    });

    return NextResponse.json({ rating: savedRating });
  } catch (error: any) {
    logger.error('TV_SHOW_RATINGS', '❌ Save rating error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
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

