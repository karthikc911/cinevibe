import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Debug endpoint to check ratings status
 * GET /api/ratings/debug
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get ratings from database
    const ratings = await prisma.movieRating.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    
    // Get total count
    const count = await prisma.movieRating.count({
      where: { userId: session.user.id },
    });
    
    // Get ratings by type
    const ratingBreakdown = await prisma.movieRating.groupBy({
      by: ['rating'],
      where: { userId: session.user.id },
      _count: true,
    });
    
    return NextResponse.json({
      success: true,
      userId: session.user.id,
      userName: session.user.name,
      totalRatings: count,
      ratingBreakdown: ratingBreakdown.map(r => ({
        rating: r.rating,
        count: r._count,
      })),
      recentRatings: ratings.slice(0, 10).map(r => ({
        movieId: r.movieId,
        movieTitle: r.movieTitle,
        movieYear: r.movieYear,
        rating: r.rating,
        createdAt: r.createdAt,
      })),
      allRatings: ratings,
    });
  } catch (error) {
    console.error("Debug ratings error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch ratings", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

