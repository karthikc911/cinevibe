import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/mobile-auth';

// GET - List comments for a recommendation (threaded)
export async function GET(
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

    const currentUser = { id: user.id };

    const { id: recommendationId } = await params;

    // Verify recommendation exists and user has access
    const recommendation = await prisma.friendMovieRecommendation.findUnique({
      where: { id: recommendationId },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    // Check if user is part of this recommendation
    if (
      recommendation.senderId !== currentUser.id &&
      recommendation.receiverId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: 'You can only view comments on your own recommendations' },
        { status: 403 }
      );
    }

    // Get all comments for this recommendation (including nested replies)
    const comments = await prisma.recommendationComment.findMany({
      where: {
        recommendationId: recommendationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
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
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Filter to only top-level comments (replies are nested)
    const topLevelComments = comments.filter(c => !c.parentId);

    logger.info('RECOMMENDATION_COMMENTS', '✅ Comments fetched', {
      recommendationId: recommendationId,
      commentsCount: topLevelComments.length,
    });

    return NextResponse.json({ comments: topLevelComments });
  } catch (error: any) {
    logger.error('RECOMMENDATION_COMMENTS', '❌ Error fetching comments', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add comment or reply to a recommendation
export async function POST(
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

    const { content, parentId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const currentUser = { id: user.id, name: user.name };

    const { id: recommendationId } = await params;

    // Verify recommendation exists and user has access
    const recommendation = await prisma.friendMovieRecommendation.findUnique({
      where: { id: recommendationId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        movieTitle: true,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    // Check if user is part of this recommendation
    if (
      recommendation.senderId !== currentUser.id &&
      recommendation.receiverId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: 'You can only comment on your own recommendations' },
        { status: 403 }
      );
    }

    // If replying to a comment, verify parent exists and belongs to same recommendation
    if (parentId) {
      const parentComment = await prisma.recommendationComment.findUnique({
        where: { id: parentId },
        select: {
          recommendationId: true,
        },
      });

      if (!parentComment || parentComment.recommendationId !== recommendationId) {
        return NextResponse.json(
          { error: 'Invalid parent comment' },
          { status: 400 }
        );
      }
    }

    // Create comment
    const comment = await prisma.recommendationComment.create({
      data: {
        recommendationId: recommendationId,
        userId: currentUser.id,
        parentId: parentId || null,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Mark recommendation as seen if the receiver is commenting
    if (currentUser.id === recommendation.receiverId) {
      await prisma.friendMovieRecommendation.update({
        where: { id: recommendationId },
        data: { seen: true },
      });
    }

    logger.info('RECOMMENDATION_COMMENTS', '✅ Comment added', {
      recommendationId: recommendationId,
      movieTitle: recommendation.movieTitle,
      userId: currentUser.id,
      userName: currentUser.name,
      commentId: comment.id,
      isReply: !!parentId,
    });

    return NextResponse.json({
      message: 'Comment added successfully',
      comment,
    });
  } catch (error: any) {
    logger.error('RECOMMENDATION_COMMENTS', '❌ Error adding comment', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

