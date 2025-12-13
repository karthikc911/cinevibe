import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET - List all friends
export async function GET(request: NextRequest) {
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

    // Get all accepted friendships
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUser.id, status: 'accepted' },
          { addresseeId: currentUser.id, status: 'accepted' },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            languages: true,
            genres: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            languages: true,
            genres: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map friendships to get the friend's info (not the current user)
    const friends = friendships.map(friendship => {
      const friend =
        friendship.requesterId === currentUser.id
          ? friendship.addressee
          : friendship.requester;

      return {
        friendshipId: friendship.id,
        ...friend,
        friendsSince: friendship.createdAt,
      };
    });

    logger.info('FRIENDS', '✅ Friends list fetched', {
      userId: currentUser.id,
      friendsCount: friends.length,
    });

    return NextResponse.json({ friends });
  } catch (error: any) {
    logger.error('FRIENDS', '❌ Error fetching friends list', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove friend
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendshipId } = await request.json();

    if (!friendshipId) {
      return NextResponse.json({ error: 'Friendship ID is required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    // Verify that current user is part of this friendship
    if (
      friendship.requesterId !== currentUser.id &&
      friendship.addresseeId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: 'You can only remove your own friends' },
        { status: 403 }
      );
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    logger.info('FRIENDS', '✅ Friend removed', {
      friendshipId,
      userId: currentUser.id,
      friendId:
        friendship.requesterId === currentUser.id
          ? friendship.addresseeId
          : friendship.requesterId,
    });

    return NextResponse.json({
      message: 'Friend removed successfully',
    });
  } catch (error: any) {
    logger.error('FRIENDS', '❌ Error removing friend', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

