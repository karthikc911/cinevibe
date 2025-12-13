import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRecommendationsWithPerplexity, getRecommendationStatus } from "@/lib/perplexity-recommendations";
import { logger } from "@/lib/logger";

/**
 * POST /api/recommendations/bulk
 * 
 * NEW ARCHITECTURE: Perplexity → GPT Pipeline
 * 
 * Flow:
 * 1. User filter selection
 * 2. Backend creates prompt with user rating data and preferences
 * 3. Perplexity Sonar API → returns real-time movie data
 * 4. GPT-5-nano → applies JSON schema + taste logic
 * 5. Final 10 JSON recommendations stored in DB
 * 
 * This is a long-running operation (30-60 seconds)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    logger.info("BULK_RECOMMENDATIONS_API", `Request from user: ${session.user.email}`);
    
    // Parse filters from request body
    const body = await request.json().catch(() => ({}));
    const filters = {
      count: body.count || 10,
      yearFrom: body.yearFrom,
      yearTo: body.yearTo,
      genres: body.genres,
      languages: body.languages,
      minImdbRating: body.minImdbRating,
      minBoxOffice: body.minBoxOffice,
      maxBudget: body.maxBudget,
    };
    
    logger.info("BULK_RECOMMENDATIONS_API", `Filters: ${JSON.stringify(filters)}`);
    
    // Check if user has rated any movies
    const { prisma } = await import("@/lib/prisma");
    const ratingCount = await prisma.movieRating.count({
      where: { userId: session.user.id },
    });
    
    if (ratingCount < 3) {
      return NextResponse.json({
        error: "Not enough ratings",
        message: "Please rate at least 3 movies before getting personalized recommendations",
        currentRatings: ratingCount,
      }, { status: 400 });
    }
    
    logger.info("BULK_RECOMMENDATIONS_API", `User has ${ratingCount} ratings, proceeding...`);
    logger.info("BULK_RECOMMENDATIONS_API", "🚀 Using NEW Perplexity → GPT pipeline");
    
    // Generate recommendations using Perplexity → GPT pipeline (30-60 seconds)
    const results = await generateRecommendationsWithPerplexity(session.user.id, filters);
    
    logger.info("BULK_RECOMMENDATIONS_API", `✅ Success: ${results.successfullyStored} movies stored`);
    
    return NextResponse.json({
      message: `Generated ${results.successfullyStored} personalized recommendations`,
      ...results,
    });
    
  } catch (error) {
    logger.error("BULK_RECOMMENDATIONS_API", "Failed to generate bulk recommendations", error);
    
    return NextResponse.json(
      {
        error: "Failed to generate recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recommendations/bulk
 * 
 * Get status of bulk recommendation generation and queue
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { prisma } = await import("@/lib/prisma");
    
    // Get user's rating count
    const ratingCount = await prisma.movieRating.count({
      where: { userId: session.user.id },
    });
    
    // Get recommendation queue status
    const queueStatus = await getRecommendationStatus(session.user.id);
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        ratingCount,
      },
      queue: queueStatus,
      ready: ratingCount >= 3,
      message: ratingCount >= 3 
        ? "Ready to generate recommendations" 
        : `Need ${3 - ratingCount} more ratings`,
    });
    
  } catch (error) {
    logger.error("BULK_RECOMMENDATIONS_API", "Failed to get status", error);
    
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}

