import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/rag";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check RAG pipeline components
    const ragStatus = await healthCheck();

    // Check database tables
    let tablesExist = false;
    try {
      await prisma.user.count();
      tablesExist = true;
    } catch (error) {
      console.error("Tables check failed:", error);
    }

    // Overall status
    const allHealthy =
      ragStatus.openai && ragStatus.database && ragStatus.pgvector && tablesExist;

    return NextResponse.json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        openai: ragStatus.openai ? "✅ Connected" : "❌ Failed",
        database: ragStatus.database ? "✅ Connected" : "❌ Failed",
        pgvector: ragStatus.pgvector ? "✅ Enabled" : "❌ Not enabled",
        tables: tablesExist ? "✅ Created" : "❌ Not created",
      },
      nextSteps: !allHealthy
        ? [
            !ragStatus.openai && "Add OPENAI_API_KEY to .env.local",
            !ragStatus.database && "Check DATABASE_URL and PostgreSQL connection",
            !ragStatus.pgvector && "Enable pgvector: CREATE EXTENSION vector;",
            !tablesExist && "Run migrations: npx prisma migrate dev",
          ].filter(Boolean)
        : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
        message: "Health check failed. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}

