import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Debug endpoint to check watchlist status
 * GET /api/watchlist/debug
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get watchlist from database
    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: "desc" },
    });
    
    // Get total count
    const count = await prisma.watchlistItem.count({
      where: { userId: session.user.id },
    });
    
    return NextResponse.json({
      success: true,
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      watchlistCount: count,
      watchlist: watchlist.map(item => ({
        id: item.id,
        movieId: item.movieId,
        movieTitle: item.movieTitle,
        movieYear: item.movieYear,
        addedAt: item.addedAt.toISOString(),
      })),
      message: count === 0 
        ? "No movies in watchlist yet. Add movies from the home or search page!"
        : `Found ${count} movie(s) in your watchlist.`
    });
  } catch (error) {
    console.error("Debug watchlist error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch watchlist debug info",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

