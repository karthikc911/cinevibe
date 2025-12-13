import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint to check friend recommendations in the database
 * GET /api/friends/recommendations/debug
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get ALL recommendations (no filters)
    const allReceived = await prisma.friendMovieRecommendation.findMany({
      where: {
        receiverId: currentUser.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const allSent = await prisma.friendMovieRecommendation.findMany({
      where: {
        senderId: currentUser.id,
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Count by status
    const receivedStats = {
      total: allReceived.length,
      acknowledged: allReceived.filter(r => r.acknowledged).length,
      unacknowledged: allReceived.filter(r => !r.acknowledged).length,
      seen: allReceived.filter(r => r.seen).length,
      unseen: allReceived.filter(r => !r.seen).length,
    };

    return NextResponse.json({
      success: true,
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      },
      received: {
        stats: receivedStats,
        recommendations: allReceived.map(r => ({
          id: r.id,
          movieId: r.movieId,
          movieTitle: r.movieTitle,
          movieYear: r.movieYear,
          message: r.message,
          acknowledged: r.acknowledged,
          seen: r.seen,
          createdAt: r.createdAt,
          sender: r.sender,
        })),
      },
      sent: {
        total: allSent.length,
        recommendations: allSent.map(r => ({
          id: r.id,
          movieId: r.movieId,
          movieTitle: r.movieTitle,
          receiver: r.receiver,
          acknowledged: r.acknowledged,
          seen: r.seen,
        })),
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch debug info',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * Reset all acknowledged flags to false for testing
 * POST /api/friends/recommendations/debug
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Reset all recommendations for this user to unacknowledged
    const result = await prisma.friendMovieRecommendation.updateMany({
      where: {
        receiverId: currentUser.id,
      },
      data: {
        acknowledged: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All recommendations reset to unacknowledged',
      count: result.count,
    });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset recommendations',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

