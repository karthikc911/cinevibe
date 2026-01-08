import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/mobile-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both web session and mobile token authentication
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const user = await getCurrentUser(session, authHeader);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const recommendationId = id;

    // Get the recommendation to verify ownership
    const recommendation = await prisma.friendMovieRecommendation.findUnique({
      where: { id: recommendationId },
      include: {
        receiver: true,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    // Only the receiver can delete the recommendation
    if (recommendation.receiver.email !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark as acknowledged instead of deleting
    await prisma.friendMovieRecommendation.update({
      where: { id: recommendationId },
      data: { acknowledged: true },
    });

    logger.info("FRIENDS_RECOMMENDATIONS", "Recommendation acknowledged", {
      recommendationId,
      movieId: recommendation.movieId,
      userEmail: user.email,
    });

    return NextResponse.json({ message: "Recommendation acknowledged successfully" });
  } catch (error: any) {
    logger.error("FRIENDS_RECOMMENDATIONS", "Error acknowledging recommendation", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to acknowledge recommendation" },
      { status: 500 }
    );
  }
}

