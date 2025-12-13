import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNextRecommendations } from "@/lib/bulk-recommendations-gpt";
import { logger } from "@/lib/logger";

/**
 * GET /api/recommendations/next?limit=10
 * 
 * Fetch next batch of unshown recommendations for the user
 * Default: 10 movies at a time
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    
    logger.info("RECOMMENDATIONS_NEXT_API", `Fetching ${limit} recommendations for user ${session.user.email}`);
    
    // Get next batch of recommendations
    const recommendations = await getNextRecommendations(session.user.id, limit);
    
    // Transform to match frontend Movie type
    const transformedMovies = recommendations.map((rec: any) => ({
      id: rec.id,
      title: rec.title,
      year: rec.year?.toString() || rec.releaseDate?.split('-')[0] || '',
      poster: rec.posterPath ? `https://image.tmdb.org/t/p/w500${rec.posterPath}` : '',
      imdb: rec.imdbRating || rec.voteAverage || 0,
      rt: rec.rtRating || Math.round((rec.voteAverage || 0) * 10),
      summary: rec.overview || '',
      category: rec.genres?.[0] || 'Movie',
      langs: [rec.language],
      ottIcon: getOTTIcon(rec.language),
      match: rec.matchPercentage || 85,
      reason: rec.reason,
      recommendationId: rec.recommendationId,
    }));
    
    logger.info("RECOMMENDATIONS_NEXT_API", `Returning ${transformedMovies.length} recommendations`);
    
    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      count: transformedMovies.length,
    });
    
  } catch (error) {
    logger.error("RECOMMENDATIONS_NEXT_API", "Failed to fetch next recommendations", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
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

