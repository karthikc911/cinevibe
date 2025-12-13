import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    logger.info('FRIENDS_SEARCH', '🔍 Searching for users', {
      query,
      requestedBy: session.user.email,
    });

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Search for users by name or email (exclude current user)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: currentUser.id,
            },
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
      take: 20, // Limit to 20 results
    });

    // Check existing friendships for these users
    const userIds = users.map(u => u.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          {
            requesterId: currentUser.id,
            addresseeId: { in: userIds },
          },
          {
            requesterId: { in: userIds },
            addresseeId: currentUser.id,
          },
        ],
      },
      select: {
        requesterId: true,
        addresseeId: true,
        status: true,
      },
    });

    // Map friendship status for each user
    const usersWithStatus = users.map(user => {
      const friendship = friendships.find(
        f =>
          (f.requesterId === currentUser.id && f.addresseeId === user.id) ||
          (f.requesterId === user.id && f.addresseeId === currentUser.id)
      );

      let friendshipStatus = 'none';
      let isSentRequest = false;
      let isReceivedRequest = false;

      if (friendship) {
        friendshipStatus = friendship.status;
        isSentRequest = friendship.requesterId === currentUser.id;
        isReceivedRequest = friendship.addresseeId === currentUser.id;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        memberSince: user.createdAt,
        friendshipStatus,
        isSentRequest,
        isReceivedRequest,
      };
    });

    logger.info('FRIENDS_SEARCH', '✅ Search completed', {
      query,
      resultsCount: usersWithStatus.length,
    });

    return NextResponse.json({ users: usersWithStatus });
  } catch (error: any) {
    logger.error('FRIENDS_SEARCH', '❌ Error searching users', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

