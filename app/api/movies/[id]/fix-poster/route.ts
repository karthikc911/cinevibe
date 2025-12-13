import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { autoFixMovieData } from "@/lib/tmdb-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = parseInt(id);

  if (isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    logger.info("FIX_POSTER", `Attempting to fix poster for movie ${movieId}`);

    // Get the movie from database
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Use autoFixMovieData to fetch and update poster from TMDB
    const fixedMovie = await autoFixMovieData(movie);

    // Format poster URL
    let posterUrl = "";
    if (fixedMovie.posterPath) {
      if (
        fixedMovie.posterPath.startsWith("http://") ||
        fixedMovie.posterPath.startsWith("https://")
      ) {
        posterUrl = fixedMovie.posterPath;
      } else if (fixedMovie.posterPath.startsWith("/")) {
        posterUrl = `https://image.tmdb.org/t/p/w500${fixedMovie.posterPath}`;
      }
    }

    logger.info("FIX_POSTER", `Successfully fixed poster for movie ${movieId}`, {
      title: fixedMovie.title,
      poster: posterUrl,
    });

    return NextResponse.json({
      success: true,
      poster: posterUrl,
      movieId: fixedMovie.id,
    });
  } catch (error: any) {
    logger.error("FIX_POSTER", `Failed to fix poster for movie ${movieId}`, {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fix poster" },
      { status: 500 }
    );
  }
}

