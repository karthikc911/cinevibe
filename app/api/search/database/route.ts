import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();

    logger.info("DATABASE_SEARCH", "Searching movies in database", {
      userId: session.user.id,
      query: searchTerm,
    });

    // Search movies by title (case-insensitive)
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { originalTitle: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: [
        { voteAverage: "desc" },
        { voteCount: "desc" },
        { popularity: "desc" },
      ],
      take: 20,
    });

    // Get user's rated movies to exclude or mark
    const ratedMovies = await prisma.movieRating.findMany({
      where: { userId: session.user.id },
      select: { movieId: true },
    });

    const ratedMovieIds = new Set(ratedMovies.map((r) => r.movieId));

    // Transform movies for frontend
    const transformedMovies = movies
      .filter((movie) => !ratedMovieIds.has(movie.id))
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        poster: movie.posterPath,
        lang: movie.language,
        langs: [movie.language],
        imdb: movie.imdbRating || movie.voteAverage,
        rt: movie.rtRating || null,
        summary: movie.overview || "No summary available",
        overview: movie.overview || "No summary available",
        category: movie.genres?.[0] || "Unknown",
        language: movie.language,
        languages: movie.genres || [],
        genres: movie.genres || [],
        matchPercent: Math.floor(70 + Math.random() * 20), // Random match for search results
      }));

    const duration = Date.now() - startTime;

    logger.info("DATABASE_SEARCH", "Search completed", {
      query: searchTerm,
      resultsFound: transformedMovies.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      query: searchTerm,
      movies: transformedMovies,
      totalResults: transformedMovies.length,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("DATABASE_SEARCH", "Search failed", {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Search failed", details: error.message },
      { status: 500 }
    );
  }
}

