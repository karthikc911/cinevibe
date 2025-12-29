import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/movies - Fetch movies from database
 * Query params:
 *   - ids: Comma-separated list of movie IDs (e.g., "123,456,789")
 *   - language: Filter by language (e.g., "en", "hi", "ta")
 *   - limit: Number of movies to return (default: 100)
 *   - offset: Pagination offset (default: 0)
 *   - sort: Sort order - "rating", "popularity", "recent" (default: "rating")
 *   - search: Search by movie title
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const idsParam = searchParams.get("ids");
    const language = searchParams.get("language");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || "rating";
    const search = searchParams.get("search");
    
    logger.info('MOVIES_API', `Fetching movies`, {
      ids: idsParam || 'none',
      language,
      limit,
      sort,
      search: search || 'none',
    });
    
    // Build where clause
    const where: any = {};
    
    // If specific IDs are requested, fetch only those
    if (idsParam) {
      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      where.id = { in: ids };
    }
    
    if (language) {
      where.language = language;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { originalTitle: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case "popularity":
        orderBy = { popularity: "desc" };
        break;
      case "recent":
        orderBy = { releaseDate: "desc" };
        break;
      case "rating":
      default:
        orderBy = [
          { voteAverage: "desc" },
          { voteCount: "desc" },
        ];
        break;
    }
    
    // Fetch movies
    const movies = await prisma.movie.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    });
    
    // Get total count
    const total = await prisma.movie.count({ where });
    
    logger.info('MOVIES_API', `Found ${movies.length} movies (total: ${total})`);
    
    // Transform to match frontend Movie type
    const transformedMovies = movies.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year?.toString() || movie.releaseDate?.split('-')[0] || '',
      poster: movie.posterPath 
        ? (movie.posterPath.startsWith('http') 
            ? movie.posterPath 
            : `https://image.tmdb.org/t/p/w500${movie.posterPath}`)
        : '',
      imdb: movie.imdbRating || movie.voteAverage || 0,
      rt: movie.rtRating || Math.round((movie.voteAverage || 0) * 10),
      summary: movie.overview || '',
      category: movie.genres[0] || 'Movie',
      langs: [movie.language],
      ottIcon: getOTTIcon(movie.language),
      match: 85, // Default match percentage (can be calculated based on user preferences)
    }));
    
    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("MOVIES_API", "Failed to fetch movies", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch movies",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to get OTT icon based on language
function getOTTIcon(language: string): string {
  const ottMap: Record<string, string> = {
    'en': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'hi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/200px-Disney%2B_Hotstar_logo.svg.png',
    'ta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/200px-Disney%2B_Hotstar_logo.svg.png',
    'te': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/200px-Disney%2B_Hotstar_logo.svg.png',
    'ml': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/200px-Disney%2B_Hotstar_logo.svg.png',
    'kn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/200px-Disney%2B_Hotstar_logo.svg.png',
    'ko': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'ja': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'it': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  };
  
  return ottMap[language] || 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg';
}

