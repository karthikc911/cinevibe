import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET - Fetch user's AI feedback
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackType = searchParams.get("type") || "movie"; // "movie" or "tvshow"
    const activeOnly = searchParams.get("active") !== "false";

    const feedback = await prisma.aIFeedback.findMany({
      where: {
        userId: user.id,
        feedbackType,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10, // Limit to last 10 feedback entries
    });

    logger.info('AI_FEEDBACK', 'Fetched AI feedback', {
      userId: user.id,
      feedbackType,
      count: feedback.length,
    });

    return NextResponse.json({ feedback });
  } catch (error: any) {
    logger.error('AI_FEEDBACK', 'Failed to fetch feedback', {
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

// POST - Save new AI feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { feedback, feedbackType = "movie" } = body;

    if (!feedback || typeof feedback !== "string" || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: "Feedback text is required" },
        { status: 400 }
      );
    }

    // Simple sentiment classification based on keywords
    const lowerFeedback = feedback.toLowerCase();
    let sentiment = "neutral";
    
    const positiveKeywords = ["love", "great", "excellent", "perfect", "amazing", "good", "like", "more", "enjoy", "prefer"];
    const negativeKeywords = ["hate", "dislike", "don't want", "no more", "stop", "avoid", "less", "bad", "boring", "not interested"];
    
    const hasPositive = positiveKeywords.some(kw => lowerFeedback.includes(kw));
    const hasNegative = negativeKeywords.some(kw => lowerFeedback.includes(kw));
    
    if (hasPositive && !hasNegative) sentiment = "positive";
    else if (hasNegative && !hasPositive) sentiment = "negative";
    else if (hasPositive && hasNegative) sentiment = "mixed";

    const savedFeedback = await prisma.aIFeedback.create({
      data: {
        userId: user.id,
        feedbackType,
        feedback: feedback.trim(),
        sentiment,
        isActive: true,
      },
    });

    logger.info('AI_FEEDBACK', '✅ Feedback saved', {
      userId: user.id,
      feedbackId: savedFeedback.id,
      feedbackType,
      sentiment,
      feedbackPreview: feedback.substring(0, 50),
    });

    return NextResponse.json({ feedback: savedFeedback, success: true });
  } catch (error: any) {
    logger.error('AI_FEEDBACK', '❌ Failed to save feedback', {
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

// DELETE - Remove or deactivate feedback
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("id");

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    // Verify ownership and delete
    const feedback = await prisma.aIFeedback.findFirst({
      where: {
        id: feedbackId,
        userId: user.id,
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    await prisma.aIFeedback.delete({
      where: { id: feedbackId },
    });

    logger.info('AI_FEEDBACK', 'Feedback deleted', {
      userId: user.id,
      feedbackId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('AI_FEEDBACK', 'Failed to delete feedback', {
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}

