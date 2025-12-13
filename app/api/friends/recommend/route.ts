import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST - Send movie recommendation to friends
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendIds, movieId, movieTitle, movieYear, message } = await request.json();

    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'Friend IDs are required' }, { status: 400 });
    }

    if (!movieId || !movieTitle) {
      return NextResponse.json({ error: 'Movie ID and title are required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify all friend IDs are valid friendships
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          {
            requesterId: currentUser.id,
            addresseeId: { in: friendIds },
            status: 'accepted',
          },
          {
            addresseeId: currentUser.id,
            requesterId: { in: friendIds },
            status: 'accepted',
          },
        ],
      },
    });

    const validFriendIds = friendships.map(f =>
      f.requesterId === currentUser.id ? f.addresseeId : f.requesterId
    );

    if (validFriendIds.length === 0) {
      return NextResponse.json({ error: 'No valid friendships found' }, { status: 400 });
    }

    // Create recommendations for all valid friends
    const recommendations = await Promise.all(
      validFriendIds.map(friendId =>
        prisma.friendMovieRecommendation.create({
          data: {
            senderId: currentUser.id,
            receiverId: friendId,
            movieId,
            movieTitle,
            movieYear,
            message: message || null,
          },
        })
      )
    );

    logger.info('RECOMMEND', '✅ Movie recommendations sent', {
      senderId: currentUser.id,
      senderName: currentUser.name,
      movieTitle,
      friendCount: recommendations.length,
      friendIds: validFriendIds,
    });

    return NextResponse.json({
      message: 'Recommendations sent successfully',
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    logger.error('RECOMMEND', '❌ Error sending recommendations', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

