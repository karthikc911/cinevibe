import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRecommendations, analyzeUserRatings } from "@/lib/rag";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") || undefined;
    const analyze = searchParams.get("analyze") === "true";
    
    // First, analyze ratings to extract preferences if requested
    if (analyze) {
      await analyzeUserRatings(session.user.id);
    }
    
    // Generate recommendations
    const recommendations = await generateRecommendations(
      session.user.id,
      context
    );
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

