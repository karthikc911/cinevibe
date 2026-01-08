import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/mobile-auth';

// PATCH - Accept or reject friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both web session and mobile token authentication
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get('authorization');
    const user = await getCurrentUser(session, authHeader);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15
    const { id } = await params;

    const { action } = await request.json(); // "accept" or "reject"

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const currentUser = { id: user.id, name: user.name };

    // Find the friend request
    const friendRequest = await prisma.friendship.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Verify that current user is the addressee
    if (friendRequest.addresseeId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only respond to friend requests sent to you' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (friendRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Friend request has already been processed' },
        { status: 400 }
      );
    }

    // Update friendship status
    const updatedFriendship = await prisma.friendship.update({
      where: { id },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
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
    });

    logger.info('FRIEND_REQUESTS', `✅ Friend request ${action}ed`, {
      requestId: id,
      from: friendRequest.requester.name,
      to: currentUser.name,
      action,
    });

    return NextResponse.json({
      message: `Friend request ${action}ed successfully`,
      friendship: {
        id: updatedFriendship.id,
        user: updatedFriendship.requester,
        status: updatedFriendship.status,
        createdAt: updatedFriendship.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('FRIEND_REQUESTS', '❌ Error processing friend request', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel friend request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both web session and mobile token authentication
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get('authorization');
    const user = await getCurrentUser(session, authHeader);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15
    const { id } = await params;

    const currentUser = { id: user.id };

    // Find the friend request
    const friendRequest = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Verify that current user is the requester
    if (friendRequest.requesterId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only cancel friend requests you sent' },
        { status: 403 }
      );
    }

    // Delete the friend request
    await prisma.friendship.delete({
      where: { id },
    });

    logger.info('FRIEND_REQUESTS', '✅ Friend request cancelled', {
      requestId: id,
      userId: currentUser.id,
    });

    return NextResponse.json({
      message: 'Friend request cancelled successfully',
    });
  } catch (error: any) {
    logger.error('FRIEND_REQUESTS', '❌ Error cancelling friend request', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

