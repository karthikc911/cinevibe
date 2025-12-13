/**
 * TMDB Helper Functions
 * Auto-fetch and update movie data when poster or other details are missing
 */

import { prisma } from './prisma';
import { logger } from './logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string | null;
  imdb_id: string | null;
}

/**
 * Fetch movie details from TMDB API
 */
export async function fetchTMDBMovieDetails(movieId: number): Promise<TMDBMovieDetails | null> {
  if (!TMDB_API_KEY) {
    logger.error('TMDB_HELPER', 'TMDB API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`
    );

    if (!response.ok) {
      logger.warn('TMDB_HELPER', `Failed to fetch movie ${movieId} from TMDB`, {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    logger.error('TMDB_HELPER', `Error fetching movie ${movieId} from TMDB`, {
      error: error.message,
    });
    return null;
  }
}

/**
 * Update movie in database with TMDB data
 */
export async function updateMovieFromTMDB(movieId: number): Promise<boolean> {
  try {
    logger.info('TMDB_HELPER', `📥 Fetching movie ${movieId} from TMDB to update database`);

    const tmdbData = await fetchTMDBMovieDetails(movieId);
    if (!tmdbData) {
      return false;
    }

    // Update the movie in database
    await prisma.movie.update({
      where: { id: movieId },
      data: {
        title: tmdbData.title,
        originalTitle: tmdbData.original_title,
        overview: tmdbData.overview || null,
        posterPath: tmdbData.poster_path,
        backdropPath: tmdbData.backdrop_path,
        releaseDate: tmdbData.release_date ? new Date(tmdbData.release_date) : null,
        year: tmdbData.release_date ? parseInt(tmdbData.release_date.split('-')[0]) : null,
        voteAverage: tmdbData.vote_average,
        voteCount: tmdbData.vote_count,
        popularity: tmdbData.popularity,
        language: tmdbData.original_language,
        genres: tmdbData.genres.map(g => g.name),
        runtime: tmdbData.runtime,
        tagline: tmdbData.tagline,
        imdbRating: tmdbData.vote_average,
        updatedAt: new Date(),
      },
    });

    logger.info('TMDB_HELPER', `✅ Successfully updated movie ${movieId} from TMDB`, {
      title: tmdbData.title,
      hasPoster: !!tmdbData.poster_path,
      hasBackdrop: !!tmdbData.backdrop_path,
    });

    return true;
  } catch (error: any) {
    logger.error('TMDB_HELPER', `❌ Failed to update movie ${movieId} from TMDB`, {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Check if movie needs TMDB update (missing poster or backdrop)
 */
export function needsTMDBUpdate(movie: any): boolean {
  // Check if poster path is missing or invalid
  const hasPoster = movie.posterPath && 
    (movie.posterPath.startsWith('/') || movie.posterPath.startsWith('http'));
  
  // Check if backdrop is missing
  const hasBackdrop = movie.backdropPath && 
    (movie.backdropPath.startsWith('/') || movie.backdropPath.startsWith('http'));

  return !hasPoster || !hasBackdrop;
}

/**
 * Auto-fix movie data by fetching from TMDB if needed
 */
export async function autoFixMovieData(movie: any): Promise<any> {
  if (needsTMDBUpdate(movie)) {
    logger.info('TMDB_HELPER', `🔧 Auto-fixing movie data for: ${movie.title}`, {
      movieId: movie.id,
      hasPoster: !!movie.posterPath,
      hasBackdrop: !!movie.backdropPath,
    });

    const updated = await updateMovieFromTMDB(movie.id);
    
    if (updated) {
      // Fetch the updated movie from database
      const updatedMovie = await prisma.movie.findUnique({
        where: { id: movie.id },
      });
      return updatedMovie || movie;
    }
  }
  
  return movie;
}

/**
 * Search for a movie on TMDB by title and year
 */
export async function searchMovieOnTMDB(title: string, year?: number): Promise<any | null> {
  if (!TMDB_API_KEY) {
    logger.error('TMDB_HELPER', 'TMDB API key not configured');
    return null;
  }

  try {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) {
      url += `&year=${year}`;
    }

    logger.info('TMDB_HELPER', `🔍 Searching TMDB for: ${title} (${year})`, { url });

    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn('TMDB_HELPER', `Failed to search TMDB for "${title}"`, {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (result) {
      logger.info('TMDB_HELPER', `✅ Found movie on TMDB: ${result.title}`, {
        id: result.id,
        year: result.release_date?.split('-')[0],
      });
    } else {
      logger.warn('TMDB_HELPER', `❌ Movie not found on TMDB: ${title}`);
    }

    return result || null;
  } catch (error: any) {
    logger.error('TMDB_HELPER', `Error searching TMDB for "${title}"`, {
      error: error.message,
    });
    return null;
  }
}

/**
 * Fetch movie details from TMDB by ID (alias for consistency)
 */
export async function fetchMovieFromTMDB(movieId: number): Promise<any | null> {
  return await fetchTMDBMovieDetails(movieId);
}

