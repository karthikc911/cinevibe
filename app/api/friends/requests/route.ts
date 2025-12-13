import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET - List friend requests (received and sent)
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

    // Get received pending requests
    const receivedRequests = await prisma.friendship.findMany({
      where: {
        addresseeId: currentUser.id,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get sent pending requests
    const sentRequests = await prisma.friendship.findMany({
      where: {
        requesterId: currentUser.id,
        status: 'pending',
      },
      include: {
        addressee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('FRIEND_REQUESTS', '📬 Friend requests fetched', {
      userId: currentUser.id,
      receivedCount: receivedRequests.length,
      sentCount: sentRequests.length,
    });

    return NextResponse.json({
      received: receivedRequests.map(r => ({
        id: r.id,
        user: r.requester,
        createdAt: r.createdAt,
      })),
      sent: sentRequests.map(r => ({
        id: r.id,
        user: r.addressee,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('FRIEND_REQUESTS', '❌ Error fetching friend requests', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send friend request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is trying to send request to themselves
    if (currentUser.id === userId) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, addresseeId: userId },
          { requesterId: userId, addresseeId: currentUser.id },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friend request already exists or you are already friends' },
        { status: 400 }
      );
    }

    // Create friend request
    const friendRequest = await prisma.friendship.create({
      data: {
        requesterId: currentUser.id,
        addresseeId: userId,
        status: 'pending',
      },
      include: {
        addressee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    logger.info('FRIEND_REQUESTS', '✅ Friend request sent', {
      from: currentUser.id,
      fromName: currentUser.name,
      to: userId,
      toName: targetUser.name,
      requestId: friendRequest.id,
    });

    return NextResponse.json({
      message: 'Friend request sent successfully',
      request: {
        id: friendRequest.id,
        user: friendRequest.addressee,
        createdAt: friendRequest.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('FRIEND_REQUESTS', '❌ Error sending friend request', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

