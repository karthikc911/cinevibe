import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { aiInstructions } = body;

    // Update user with AI instructions
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        aiInstructions: aiInstructions || null,
      },
    });

    logger.info("AI_INSTRUCTIONS", "User updated AI instructions", {
      userId: session.user.id,
      hasInstructions: !!aiInstructions,
      instructionsLength: aiInstructions?.length || 0,
    });

    return NextResponse.json({
      success: true,
      aiInstructions: updatedUser.aiInstructions,
    });
  } catch (error: any) {
    logger.error("AI_INSTRUCTIONS", "Error saving AI instructions", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to save AI instructions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        aiInstructions: true,
      },
    });

    return NextResponse.json({
      success: true,
      aiInstructions: user?.aiInstructions || "",
    });
  } catch (error: any) {
    logger.error("AI_INSTRUCTIONS", "Error fetching AI instructions", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch AI instructions" },
      { status: 500 }
    );
  }
}

