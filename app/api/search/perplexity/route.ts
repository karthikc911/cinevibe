import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { enrichMovieWithMetadata, enrichTvShowWithMetadata } from '@/lib/movie-metadata-fetcher';
import OpenAI from 'openai';
import { SEARCH_SYSTEM_PROMPT, buildSearchQueryPrompt } from '@/config/prompts';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Initialize Perplexity API client
const perplexity = new OpenAI({
  apiKey: PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const PERPLEXITY_MODEL = "sonar-pro";

const formatPosterUrl = (posterPath: string | null): string => {
  if (!posterPath) return '';
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  if (posterPath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
  return '';
};

interface PerplexityMovieResult {
  title: string;
  year?: number;
  language?: string;
  type: 'movie' | 'tvshow';
}

/**
 * Fallback: Extract movie/TV show from natural text response
 */
function extractFromNaturalText(content: string, userQuery: string): PerplexityMovieResult[] {
  logger.info('SEARCH_PERPLEXITY', '🔄 Using fallback extraction from natural text');
  
  // Simple heuristic: if the user query looks like a direct title search
  // (no numbers, no words like "top", "best", "list"), treat it as a single item
  const isDirectSearch = !/\d+|top|best|list|recommend|trending|popular/i.test(userQuery);
  
  if (isDirectSearch) {
    // Guess the type based on content
    const isTvShow = /series|season|episode|tv show/i.test(content.toLowerCase());
    
    return [{
      title: userQuery.trim(),
      type: isTvShow ? 'tvshow' : 'movie',
      language: 'English', // Default
    }];
  }
  
  return [];
}

/**
 * Use Perplexity to extract movies/TV shows from natural language query
 */
async function extractMediaListFromPerplexity(userQuery: string): Promise<PerplexityMovieResult[]> {
  try {
    logger.info('SEARCH_PERPLEXITY', '📡 Processing query with Perplexity', {
      userQuery,
    });

    const searchQuery = buildSearchQueryPrompt(userQuery);

    logger.info('SEARCH_PERPLEXITY', '=== PERPLEXITY QUERY ===');
    logger.info('SEARCH_PERPLEXITY', searchQuery);

    const startTime = Date.now();
    
    const response = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: SEARCH_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: searchQuery,
        },
      ],
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      logger.warn('SEARCH_PERPLEXITY', 'No content from Perplexity');
      return [];
    }

    logger.info('SEARCH_PERPLEXITY', '✅ Perplexity search completed', {
      duration: `${duration}ms`,
      responseLength: content.length,
    });

    logger.info('SEARCH_PERPLEXITY', '=== PERPLEXITY RESPONSE ===');
    logger.info('SEARCH_PERPLEXITY', content);

    // Try to extract JSON from response (in case it's wrapped in markdown)
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      const results = parsed.results || [];
      
      logger.info('SEARCH_PERPLEXITY', `Parsed ${results.length} results from Perplexity`);
      return results;
    } catch (parseError: any) {
      logger.error('SEARCH_PERPLEXITY', 'Failed to parse Perplexity response as JSON', {
        error: parseError.message,
        content: content.substring(0, 500), // Log first 500 chars for debugging
      });
      
      // Fallback: Try to extract movie/TV show info from natural text
      return extractFromNaturalText(content, userQuery);
    }
  } catch (error: any) {
    logger.error('SEARCH_PERPLEXITY', '❌ Error processing with Perplexity', {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Search for a movie in local DB
 */
async function searchInLocalDB(title: string, year?: number, type: string = 'movie') {
  try {
    if (!prisma) {
      logger.error('SEARCH_PERPLEXITY', 'Prisma client not available');
      return null;
    }

    if (type === 'tvshow') {
      const whereClause: any = {
        OR: [
          { name: { contains: title, mode: 'insensitive' as const } },
          { originalName: { contains: title, mode: 'insensitive' as const } },
        ],
      };

      if (year) {
        whereClause.year = year;
      }

      return await prisma.tvShow.findFirst({
        where: whereClause,
        orderBy: { popularity: 'desc' },
      });
    } else {
      const whereClause: any = {
        OR: [
          { title: { contains: title, mode: 'insensitive' as const } },
          { originalTitle: { contains: title, mode: 'insensitive' as const } },
        ],
      };

      if (year) {
        whereClause.year = year;
      }

      return await prisma.movie.findFirst({
        where: whereClause,
        orderBy: { popularity: 'desc' },
      });
    }
  } catch (error: any) {
    logger.error('SEARCH_PERPLEXITY', 'Error searching local DB', {
      error: error.message,
      title,
      type,
    });
    return null;
  }
}

/**
 * Search for a movie/TV show in TMDB
 */
async function searchInTMDB(title: string, year?: number, type: string = 'movie') {
  if (!TMDB_API_KEY) {
    logger.error('SEARCH_PERPLEXITY', 'TMDB_API_KEY is not set');
    return null;
  }

  const endpoint = type === 'tvshow' ? 'tv' : 'movie';
  const searchUrl = `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}&page=1`;

  logger.info('SEARCH_PERPLEXITY', `🔍 Searching TMDB for ${type}`, { title, year });

  const response = await fetch(searchUrl);
  if (!response.ok) {
    logger.error('SEARCH_PERPLEXITY', 'TMDB API error', { status: response.status });
    return null;
  }

  const data = await response.json();
  return data.results?.[0] || null;
}

/**
 * Store movie in DB and enrich
 */
async function storeAndEnrichMovie(tmdbMovie: any) {
  const newMovie = await prisma.movie.upsert({
    where: { id: tmdbMovie.id },
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
      genres: [],
      runtime: null,
      tagline: null,
      imdbRating: null,
      rtRating: null,
      imdbVoterCount: null,
      userReviewSummary: null,
      budget: null,
      boxOffice: null,
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
    },
  });

  logger.info('SEARCH_PERPLEXITY', '✅ Saved movie to database', {
    movieId: newMovie.id,
    title: newMovie.title,
  });

  // Always enrich with Perplexity metadata to ensure IMDB user review summary
  if (!newMovie.userReviewSummary) {
    logger.info('SEARCH_PERPLEXITY', 'Enriching movie with IMDB metadata', {
      movieId: newMovie.id,
      title: newMovie.title,
    });
    await enrichMovieWithMetadata(newMovie.id, newMovie.title, newMovie.year || undefined);
  }

  // Re-fetch enriched data
  return await prisma.movie.findUnique({
    where: { id: newMovie.id },
  });
}

/**
 * Store TV show in DB with full details from TMDB
 */
async function storeAndEnrichTvShow(tmdbShow: any) {
  if (!TMDB_API_KEY) {
    logger.error('SEARCH_PERPLEXITY', 'TMDB_API_KEY is not set');
    return null;
  }

  try {
    // Get full TV show details from TMDB
    const detailUrl = `${TMDB_BASE_URL}/tv/${tmdbShow.id}?api_key=${TMDB_API_KEY}&language=en`;
    const detailResponse = await fetch(detailUrl);
    
    if (!detailResponse.ok) {
      logger.error('SEARCH_PERPLEXITY', 'Failed to fetch TV show details from TMDB', {
        showId: tmdbShow.id,
      });
      // Fall back to basic data
    } else {
      const detailData = await detailResponse.json();
      // Use detailed data
      tmdbShow = {
        ...tmdbShow,
        ...detailData,
        genres: (detailData.genres || []).map((g: any) => g.name),
      };
    }

    const newShow = await prisma.tvShow.upsert({
      where: { id: tmdbShow.id },
      create: {
        id: tmdbShow.id,
        name: tmdbShow.name || 'Untitled',
        originalName: tmdbShow.original_name,
        overview: tmdbShow.overview,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        year: tmdbShow.first_air_date ? new Date(tmdbShow.first_air_date).getFullYear() : null,
        voteAverage: tmdbShow.vote_average || 0,
        voteCount: tmdbShow.vote_count || 0,
        popularity: tmdbShow.popularity || 0,
        language: tmdbShow.original_language || 'en',
        genres: Array.isArray(tmdbShow.genres) ? tmdbShow.genres : [],
        numberOfSeasons: tmdbShow.number_of_seasons || null,
        numberOfEpisodes: tmdbShow.number_of_episodes || null,
        episodeRunTime: tmdbShow.episode_run_time || [],
        status: tmdbShow.status || null,
        tagline: tmdbShow.tagline || null,
      },
      update: {
        name: tmdbShow.name || 'Untitled',
        originalName: tmdbShow.original_name,
        overview: tmdbShow.overview,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        year: tmdbShow.first_air_date ? new Date(tmdbShow.first_air_date).getFullYear() : null,
        voteAverage: tmdbShow.vote_average || 0,
        voteCount: tmdbShow.vote_count || 0,
        popularity: tmdbShow.popularity || 0,
        language: tmdbShow.original_language || 'en',
        genres: Array.isArray(tmdbShow.genres) ? tmdbShow.genres : [],
        numberOfSeasons: tmdbShow.number_of_seasons || null,
        numberOfEpisodes: tmdbShow.number_of_episodes || null,
        episodeRunTime: tmdbShow.episode_run_time || [],
        status: tmdbShow.status || null,
        tagline: tmdbShow.tagline || null,
      },
    });

    logger.info('SEARCH_PERPLEXITY', '✅ Saved TV show to database', {
      showId: newShow.id,
      name: newShow.name,
    });

    // Always enrich with Perplexity metadata to ensure IMDB user review summary
    if (!newShow.userReviewSummary) {
      logger.info('SEARCH_PERPLEXITY', 'Enriching TV show with IMDB metadata', {
        showId: newShow.id,
        name: newShow.name,
      });
      await enrichTvShowWithMetadata(newShow.id, newShow.name, newShow.year || undefined);
    }

    // Re-fetch to get the enriched data
    return await prisma.tvShow.findUnique({
      where: { id: newShow.id },
    });
  } catch (error: any) {
    logger.error('SEARCH_PERPLEXITY', 'Error storing TV show', {
      error: error.message,
      showId: tmdbShow.id,
    });
    return null;
  }
}

/**
 * Transform DB movie to frontend format
 */
function transformMovie(dbMovie: any) {
  return {
    id: dbMovie.id,
    title: dbMovie.title,
    year: dbMovie.year,
    poster: formatPosterUrl(dbMovie.posterPath),
    lang: dbMovie.language,
    langs: [dbMovie.language],
    imdb: dbMovie.imdbRating || dbMovie.voteAverage,
    imdbVoterCount: dbMovie.imdbVoterCount || dbMovie.voteCount || 0,
    userReviewSummary: dbMovie.userReviewSummary || null,
    rt: dbMovie.rtRating || null,
    voteCount: dbMovie.voteCount || 0,
    summary: dbMovie.overview || 'No summary available',
    overview: dbMovie.overview || 'No summary available',
    category: dbMovie.genres?.[0] || 'Unknown',
    language: dbMovie.language,
    languages: dbMovie.genres || [],
    genres: dbMovie.genres || [],
    budget: dbMovie.budget ? Number(dbMovie.budget) : null,
    boxOffice: dbMovie.boxOffice ? Number(dbMovie.boxOffice) : null,
    matchPercent: 85,
  };
}

/**
 * Transform DB TV show to frontend format
 */
function transformTvShow(dbShow: any) {
  return {
    id: dbShow.id,
    name: dbShow.name,
    title: dbShow.name,
    year: dbShow.year,
    poster: formatPosterUrl(dbShow.posterPath),
    lang: dbShow.language,
    langs: [dbShow.language],
    imdb: dbShow.imdbRating || dbShow.voteAverage,
    imdbVoterCount: dbShow.imdbVoterCount || dbShow.voteCount || 0,
    userReviewSummary: dbShow.userReviewSummary || null,
    rt: dbShow.rtRating || null,
    voteCount: dbShow.voteCount || 0,
    summary: dbShow.overview || 'No summary available',
    overview: dbShow.overview || 'No summary available',
    category: dbShow.genres?.[0] || 'Unknown',
    language: dbShow.language,
    languages: dbShow.genres || [],
    genres: dbShow.genres || [],
    numberOfSeasons: dbShow.numberOfSeasons,
    numberOfEpisodes: dbShow.numberOfEpisodes,
    episodeRunTime: dbShow.episodeRunTime,
    status: dbShow.status,
    matchPercent: 85,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    logger.info('SEARCH_PERPLEXITY', '🔍 Starting Perplexity search', {
      query,
      userEmail: session.user.email,
    });

    // Step 1: Extract media list from Perplexity
    let mediaList = await extractMediaListFromPerplexity(query);

    // If Perplexity returns nothing, do a direct TMDB search
    if (mediaList.length === 0) {
      logger.info('SEARCH_PERPLEXITY', '🔄 Perplexity returned no results, trying direct TMDB search');
      
      // Try both movie and TV show searches
      const movieResult = await searchInTMDB(query, undefined, 'movie');
      const tvShowResult = await searchInTMDB(query, undefined, 'tvshow');
      
      if (movieResult) {
        mediaList.push({
          title: movieResult.title,
          year: movieResult.release_date ? new Date(movieResult.release_date).getFullYear() : undefined,
          type: 'movie',
          language: 'English',
        });
      }
      
      if (tvShowResult) {
        mediaList.push({
          title: tvShowResult.name,
          year: tvShowResult.first_air_date ? new Date(tvShowResult.first_air_date).getFullYear() : undefined,
          type: 'tvshow',
          language: 'English',
        });
      }
      
      logger.info('SEARCH_PERPLEXITY', `🔍 Direct TMDB search found ${mediaList.length} items`);
    }

    if (mediaList.length === 0) {
      logger.warn('SEARCH_PERPLEXITY', 'No results found from Perplexity or TMDB');
      return NextResponse.json({ 
        movies: [], 
        tvShows: [],
        message: 'No movies or TV shows found for your query' 
      });
    }

    logger.info('SEARCH_PERPLEXITY', `📋 Processing ${mediaList.length} items`, {
      items: mediaList.map(m => ({ title: m.title, type: m.type })),
    });

    // Step 2: Process each item
    const results: any[] = [];

    for (const item of mediaList) {
      try {
        logger.info('SEARCH_PERPLEXITY', `Processing: ${item.title} (${item.type})`);

        // Check local DB first
        const dbItem = await searchInLocalDB(item.title, item.year, item.type);

        if (dbItem) {
          logger.info('SEARCH_PERPLEXITY', `✅ Found in local DB: ${item.title}`);
          
          // Always enrich if missing user review summary
          if (item.type === 'movie' && 'title' in dbItem && !dbItem.userReviewSummary) {
            logger.info('SEARCH_PERPLEXITY', 'Enriching movie from DB with IMDB metadata', {
              movieId: dbItem.id,
              title: dbItem.title,
            });
            await enrichMovieWithMetadata(dbItem.id, dbItem.title, dbItem.year || undefined);
            const enrichedMovie = await prisma.movie.findUnique({ where: { id: dbItem.id } });
            if (enrichedMovie) {
              results.push({
                ...transformMovie(enrichedMovie),
                type: 'movie',
              });
            }
          } else if (item.type === 'tvshow' && 'name' in dbItem && !dbItem.userReviewSummary) {
            logger.info('SEARCH_PERPLEXITY', 'Enriching TV show from DB with IMDB metadata', {
              showId: dbItem.id,
              name: dbItem.name,
            });
            await enrichTvShowWithMetadata(dbItem.id, dbItem.name, dbItem.year || undefined);
            const enrichedShow = await prisma.tvShow.findUnique({ where: { id: dbItem.id } });
            if (enrichedShow) {
              results.push({
                ...transformTvShow(enrichedShow),
                type: 'tvshow',
              });
            }
          } else {
            results.push({
              ...(item.type === 'tvshow' ? transformTvShow(dbItem) : transformMovie(dbItem)),
              type: item.type,
            });
          }
        } else {
          // Not in DB, fetch from TMDB
          logger.info('SEARCH_PERPLEXITY', `🔍 Not in DB, fetching from TMDB: ${item.title}`);
          
          let tmdbResult = await searchInTMDB(item.title, item.year, item.type);

          // If TV show not found, try without year (year might be incorrect)
          if (!tmdbResult && item.type === 'tvshow' && item.year) {
            logger.info('SEARCH_PERPLEXITY', `🔍 Retrying TV show search without year: ${item.title}`);
            tmdbResult = await searchInTMDB(item.title, undefined, item.type);
          }

          if (tmdbResult) {
            logger.info('SEARCH_PERPLEXITY', `✅ Found in TMDB: ${item.title}`, {
              tmdbId: tmdbResult.id,
              name: tmdbResult.name || tmdbResult.title,
            });
            
            if (item.type === 'tvshow') {
              const storedShow = await storeAndEnrichTvShow(tmdbResult);
              if (storedShow) {
                results.push({
                  ...transformTvShow(storedShow),
                  type: 'tvshow',
                });
              } else {
                // Even if storage failed, still return the TMDB result
                logger.warn('SEARCH_PERPLEXITY', `Storage failed for TV show, returning TMDB data: ${item.title}`);
                results.push({
                  id: tmdbResult.id,
                  name: tmdbResult.name,
                  title: tmdbResult.name,
                  year: tmdbResult.first_air_date ? new Date(tmdbResult.first_air_date).getFullYear() : null,
                  poster: formatPosterUrl(tmdbResult.poster_path),
                  lang: 'English',
                  overview: tmdbResult.overview,
                  summary: tmdbResult.overview,
                  voteAverage: tmdbResult.vote_average,
                  type: 'tvshow',
                });
              }
            } else {
              const storedMovie = await storeAndEnrichMovie(tmdbResult);
              if (storedMovie) {
                results.push({
                  ...transformMovie(storedMovie),
                  type: 'movie',
                });
              } else {
                // Even if storage failed, still return the TMDB result
                logger.warn('SEARCH_PERPLEXITY', `Storage failed for movie, returning TMDB data: ${item.title}`);
                results.push({
                  id: tmdbResult.id,
                  title: tmdbResult.title,
                  year: tmdbResult.release_date ? new Date(tmdbResult.release_date).getFullYear() : null,
                  poster: formatPosterUrl(tmdbResult.poster_path),
                  lang: 'English',
                  overview: tmdbResult.overview,
                  summary: tmdbResult.overview,
                  voteAverage: tmdbResult.vote_average,
                  type: 'movie',
                });
              }
            }
          } else {
            logger.warn('SEARCH_PERPLEXITY', `❌ Not found in TMDB: ${item.title}`, {
              searchedType: item.type,
              searchedYear: item.year,
            });
          }
        }
      } catch (error: any) {
        logger.error('SEARCH_PERPLEXITY', `Error processing ${item.title}`, {
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Separate movies and TV shows
    const movies = results.filter(r => r.type === 'movie');
    const tvShows = results.filter(r => r.type === 'tvshow');

    const duration = Date.now() - startTime;
    logger.info('SEARCH_PERPLEXITY', '✅ Search completed', {
      duration: `${duration}ms`,
      totalResults: results.length,
      movies: movies.length,
      tvShows: tvShows.length,
    });

    return NextResponse.json({
      movies,
      tvShows,
      totalResults: results.length,
    });
  } catch (error: any) {
    logger.error('SEARCH_PERPLEXITY', '❌ Error in Perplexity search', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

