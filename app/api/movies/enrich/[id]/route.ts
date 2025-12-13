import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichMovieWithMetadata } from "@/lib/movie-metadata-fetcher";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
    }

    logger.info("MOVIE_ENRICH", `Enriching movie ${movieId}`);

    // Get movie from database
    let movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Enrich with Perplexity data
    await enrichMovieWithMetadata(movieId, movie.title, movie.year || undefined);

    // Fetch updated movie
    movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return NextResponse.json({ error: "Movie not found after enrichment" }, { status: 404 });
    }

    // Transform for frontend
    const transformedMovie = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : '',
      lang: movie.language,
      langs: movie.genres || [],
      imdb: movie.imdbRating || movie.voteAverage,
      rt: movie.rtRating,
      voteCount: movie.voteCount,
      summary: movie.overview,
      overview: movie.overview,
      category: movie.genres?.[0] || 'Unknown',
      language: movie.language,
      genres: movie.genres || [],
      matchPercent: 75,
      imdbVoterCount: movie.imdbVoterCount || movie.voteCount || 0,
      userReviewSummary: movie.userReviewSummary || null,
      budget: movie.budget ? Number(movie.budget) : null,
      boxOffice: movie.boxOffice ? Number(movie.boxOffice) : null,
    };

    const duration = Date.now() - startTime;
    logger.info("MOVIE_ENRICH", `✅ Movie enriched successfully`, {
      movieId,
      title: movie.title,
      duration: `${duration}ms`,
    });

    return NextResponse.json({ movie: transformedMovie });
  } catch (error: any) {
    logger.error("MOVIE_ENRICH", `Failed to enrich movie`, {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to enrich movie" },
      { status: 500 }
    );
  }
}

