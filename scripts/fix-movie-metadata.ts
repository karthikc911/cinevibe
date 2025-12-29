/**
 * Script to fix incorrect movie metadata in the database
 * Run: npx ts-node scripts/fix-movie-metadata.ts [movieId]
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fixMovieMetadata(movieId: number) {
  try {
    console.log(`🔄 Fetching fresh data for movie ${movieId} from TMDB...`);

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured in .env');
    }

    // Fetch from TMDB
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Movie ${movieId} not found in TMDB`);
    }

    const tmdbMovie = await response.json();

    console.log('✅ TMDB Data:', {
      id: tmdbMovie.id,
      title: tmdbMovie.title,
      original_language: tmdbMovie.original_language,
      poster_path: tmdbMovie.poster_path,
      genres: tmdbMovie.genres?.map((g: any) => g.name),
    });

    // Update database
    const updated = await prisma.movie.upsert({
      where: { id: movieId },
      create: {
        id: tmdbMovie.id,
        title: tmdbMovie.title || 'Untitled',
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date || null,
        year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
        voteAverage: tmdbMovie.vote_average || 0,
        voteCount: tmdbMovie.vote_count || 0,
        popularity: tmdbMovie.popularity || 0,
        language: tmdbMovie.original_language || 'en',
        genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
        runtime: tmdbMovie.runtime,
        tagline: tmdbMovie.tagline,
        imdbRating: null,
        rtRating: null,
        imdbVoterCount: null,
        userReviewSummary: null,
        budget: tmdbMovie.budget ? BigInt(tmdbMovie.budget) : null,
        boxOffice: tmdbMovie.revenue ? BigInt(tmdbMovie.revenue) : null,
      },
      update: {
        title: tmdbMovie.title || 'Untitled',
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date || null,
        year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
        voteAverage: tmdbMovie.vote_average || 0,
        voteCount: tmdbMovie.vote_count || 0,
        popularity: tmdbMovie.popularity || 0,
        language: tmdbMovie.original_language || 'en',
        genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
        runtime: tmdbMovie.runtime,
        tagline: tmdbMovie.tagline,
        budget: tmdbMovie.budget ? BigInt(tmdbMovie.budget) : null,
        boxOffice: tmdbMovie.revenue ? BigInt(tmdbMovie.revenue) : null,
      },
    });

    console.log('✅ Movie updated in database:', {
      id: updated.id,
      title: updated.title,
      language: updated.language,
      genres: updated.genres,
    });

    return updated;
  } catch (error: any) {
    console.error('❌ Error fixing movie metadata:', error.message);
    throw error;
  }
}

// Fix specific movie (e.g., The Matrix)
async function fixSpecificMovies() {
  const problematicMovies = [
    603, // The Matrix
    // Add more movie IDs here if needed
  ];

  for (const movieId of problematicMovies) {
    try {
      await fixMovieMetadata(movieId);
      console.log(`\n✅ Fixed movie ${movieId}\n`);
    } catch (error: any) {
      console.error(`\n❌ Failed to fix movie ${movieId}:`, error.message, '\n');
    }
  }
}

// Main execution
const main = async () => {
  try {
    const movieIdArg = process.argv[2];

    if (movieIdArg) {
      // Fix specific movie from command line argument
      const movieId = parseInt(movieIdArg);
      if (isNaN(movieId)) {
        console.error('❌ Invalid movie ID:', movieIdArg);
        process.exit(1);
      }
      await fixMovieMetadata(movieId);
    } else {
      // Fix predefined problematic movies
      await fixSpecificMovies();
    }

    console.log('\n✅ All fixes completed!\n');
  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message, '\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();

