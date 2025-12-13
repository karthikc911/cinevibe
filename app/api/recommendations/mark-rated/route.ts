import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markRecommendationRated } from "@/lib/bulk-recommendations-gpt";
import { logger } from "@/lib/logger";

/**
 * POST /api/recommendations/mark-rated
 * 
 * Mark a movie recommendation as rated by the user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { movieId } = body;
    
    if (!movieId) {
      return NextResponse.json({ error: "movieId is required" }, { status: 400 });
    }
    
    logger.info("MARK_RATED_API", `Marking movie ${movieId} as rated for user ${session.user.email}`);
    
    // Mark recommendation as rated
    await markRecommendationRated(session.user.id, movieId);
    
    return NextResponse.json({
      success: true,
      message: "Recommendation marked as rated",
    });
    
  } catch (error) {
    logger.error("MARK_RATED_API", "Failed to mark recommendation as rated", error);
    
    return NextResponse.json(
      {
        error: "Failed to mark as rated",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

