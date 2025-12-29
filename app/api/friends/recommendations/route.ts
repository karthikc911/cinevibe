import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/mobile-auth';

// GET - List movie recommendations (sent and received)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const authUser = await getCurrentUser(session, authHeader);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // First, get ALL recommendations to see what's in the database
    const allRecommendations = await prisma.friendMovieRecommendation.findMany({
      where: {
        receiverId: currentUser.id,
      },
    });

    logger.info('FRIEND_RECOMMENDATIONS', '🔍 All recommendations in DB', {
      userId: currentUser.id,
      totalCount: allRecommendations.length,
      recommendations: allRecommendations.map(r => ({
        id: r.id,
        movieId: r.movieId,
        movieTitle: r.movieTitle,
        acknowledged: r.acknowledged,
        seen: r.seen,
      })),
    });

    // Get received recommendations (exclude acknowledged ones)
    const receivedRecommendations = await prisma.friendMovieRecommendation.findMany({
      where: {
        receiverId: currentUser.id,
        acknowledged: false, // Only show unacknowledged recommendations
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('FRIEND_RECOMMENDATIONS', '📋 Unacknowledged recommendations', {
      userId: currentUser.id,
      unacknowledgedCount: receivedRecommendations.length,
    });

    // Get sent recommendations
    const sentRecommendations = await prisma.friendMovieRecommendation.findMany({
      where: {
        senderId: currentUser.id,
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('FRIEND_RECOMMENDATIONS', '📬 Movie recommendations fetched', {
      userId: currentUser.id,
      receivedCount: receivedRecommendations.length,
      sentCount: sentRecommendations.length,
    });

    return NextResponse.json({
      received: receivedRecommendations,
      sent: sentRecommendations,
    });
  } catch (error: any) {
    logger.error('FRIEND_RECOMMENDATIONS', '❌ Error fetching recommendations', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send movie recommendation to friend
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const authUser = await getCurrentUser(session, authHeader);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendId, movieId, movieTitle, movieYear, message } = await request.json();

    if (!friendId || !movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'Friend ID, movie ID, and movie title are required' },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify friendship exists and is accepted
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: currentUser.id,
            addresseeId: friendId,
            status: 'accepted',
          },
          {
            requesterId: friendId,
            addresseeId: currentUser.id,
            status: 'accepted',
          },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: 'You can only send recommendations to friends' },
        { status: 403 }
      );
    }

    // Create movie recommendation
    const recommendation = await prisma.friendMovieRecommendation.create({
      data: {
        senderId: currentUser.id,
        receiverId: friendId,
        movieId: movieId,
        movieTitle: movieTitle,
        movieYear: movieYear,
        message: message || null,
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    logger.info('FRIEND_RECOMMENDATIONS', '✅ Movie recommendation sent', {
      from: currentUser.id,
      fromName: currentUser.name,
      to: friendId,
      movieId,
      movieTitle,
      recommendationId: recommendation.id,
    });

    return NextResponse.json({
      message: 'Movie recommendation sent successfully',
      recommendation,
    });
  } catch (error: any) {
    logger.error('FRIEND_RECOMMENDATIONS', '❌ Error sending recommendation', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

