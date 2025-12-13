import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET - Fetch user's ratings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('RATINGS', 'User not found in database', { email: session.user.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const ratings = await prisma.movieRating.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    
    logger.info('RATINGS', 'Ratings fetched successfully', {
      userId: user.id,
      ratingsCount: ratings.length,
    });
    
    return NextResponse.json({ ratings });
  } catch (error) {
    logger.error('RATINGS', 'Get ratings error', { error });
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}

// POST - Add or update a rating
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    logger.info('RATINGS', 'POST request received', {
      hasSession: !!session,
      userEmail: session?.user?.email,
    });
    
    if (!session?.user?.email) {
      logger.warn('RATINGS', 'Unauthorized rating POST request', { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { movieId, movieTitle, movieYear, rating } = body;
    
    logger.info('RATINGS', 'Save rating request body', { movieId, movieTitle, movieYear, rating });
    
    if (!movieId || !movieTitle || !rating) {
      logger.warn('RATINGS', 'Missing required fields', { movieId, movieTitle, rating });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('RATINGS', 'User not found in database', { email: session.user.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Upsert the rating
    const savedRating = await prisma.movieRating.upsert({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: parseInt(movieId),
        },
      },
      update: {
        rating,
        movieTitle,
        movieYear: movieYear ? String(movieYear) : null,
      },
      create: {
        userId: user.id,
        movieId: parseInt(movieId),
        movieTitle,
        movieYear: movieYear ? String(movieYear) : null,
        rating,
      },
    });
    
    logger.info('RATINGS', '✅ Rating saved to database', {
      userId: user.id,
      movieId,
      movieTitle,
      rating,
    });
    
    return NextResponse.json({ rating: savedRating });
  } catch (error: any) {
    logger.error('RATINGS', '❌ Save rating error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a rating
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('RATINGS', 'User not found in database', { email: session.user.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");
    
    if (!movieId) {
      return NextResponse.json(
        { error: "Missing movieId" },
        { status: 400 }
      );
    }
    
    await prisma.movieRating.delete({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: parseInt(movieId),
        },
      },
    });
    
    logger.info('RATINGS', 'Rating deleted successfully', {
      userId: user.id,
      movieId: parseInt(movieId),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('RATINGS', 'Delete rating error', { error });
    return NextResponse.json(
      { error: "Failed to delete rating" },
      { status: 500 }
    );
  }
}

