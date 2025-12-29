import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/mobile-auth";

// GET - Fetch user's ratings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    
    // Support both web session and mobile token
    const currentUser = await getCurrentUser(session, authHeader);
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
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
    
    // Fetch movie details for all ratings to get language info
    const movieIds = ratings.map(r => r.movieId);
    const movies = await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: {
        id: true,
        title: true,
        language: true,
        posterPath: true,
        year: true,
        genres: true,
        imdbRating: true,
      },
    });
    
    // Create a map for quick lookup
    const movieMap = new Map(movies.map(m => [m.id, m]));
    
    // Enrich ratings with movie details
    const enrichedRatings = ratings.map(rating => {
      const movie = movieMap.get(rating.movieId);
      return {
        ...rating,
        movieDetails: movie ? {
          language: movie.language,
          lang: movie.language,
          poster: movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : null,
          year: movie.year,
          genres: movie.genres,
          imdb: movie.imdbRating,
        } : null,
      };
    });
    
    logger.info('RATINGS', 'Ratings fetched successfully', {
      userId: user.id,
      ratingsCount: ratings.length,
      moviesEnriched: movies.length,
    });
    
    return NextResponse.json({ ratings: enrichedRatings });
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
    const authHeader = request.headers.get("authorization");
    
    // Support both web session and mobile token
    const currentUser = await getCurrentUser(session, authHeader);
    
    logger.info('RATINGS', 'POST request received', {
      hasSession: !!session,
      hasMobileToken: !!authHeader,
      userEmail: currentUser?.email,
    });
    
    if (!currentUser) {
      logger.warn('RATINGS', 'Unauthorized rating POST request', { session });
      return NextResponse.json({ error: "Unauthorized", message: "You must be logged in to rate movies" }, { status: 401 });
    }
    
    const body = await request.json();
    const { movieId, movieTitle, movieYear, rating } = body;
    
    logger.info('RATINGS', 'Save rating request body', { movieId, movieTitle, movieYear, rating });
    
    if (!movieId) {
      logger.warn('RATINGS', 'Missing movieId', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "movieId is required" },
        { status: 400 }
      );
    }
    
    if (!movieTitle) {
      logger.warn('RATINGS', 'Missing movieTitle', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "movieTitle is required" },
        { status: 400 }
      );
    }
    
    if (!rating) {
      logger.warn('RATINGS', 'Missing rating', { body });
      return NextResponse.json(
        { error: "Missing required fields", message: "rating is required" },
        { status: 400 }
      );
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('RATINGS', 'User not found in database', { email: currentUser.email });
      return NextResponse.json({ error: "User not found", message: "User account not found" }, { status: 404 });
    }
    
    // Ensure movieId is a valid number
    const parsedMovieId = typeof movieId === 'number' ? movieId : parseInt(String(movieId), 10);
    
    if (isNaN(parsedMovieId)) {
      logger.error('RATINGS', 'Invalid movieId format', { movieId, typeof: typeof movieId });
      return NextResponse.json(
        { error: "Invalid movieId", message: `movieId must be a number, got: ${typeof movieId}` },
        { status: 400 }
      );
    }
    
    // Upsert the rating
    const savedRating = await prisma.movieRating.upsert({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: parsedMovieId,
        },
      },
      update: {
        rating,
        movieTitle: String(movieTitle),
        movieYear: movieYear ? String(movieYear) : null,
      },
      create: {
        userId: user.id,
        movieId: parsedMovieId,
        movieTitle: String(movieTitle),
        movieYear: movieYear ? String(movieYear) : null,
        rating,
      },
    });
    
    logger.info('RATINGS', '✅ Rating saved to database', {
      userId: user.id,
      movieId: parsedMovieId,
      movieTitle,
      rating,
    });
    
    return NextResponse.json({ rating: savedRating, success: true });
  } catch (error: any) {
    logger.error('RATINGS', '❌ Save rating error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to save rating", message: error.message || "Database error" },
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

