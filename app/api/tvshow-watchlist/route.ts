import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET - Fetch user's TV show watchlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const watchlist = await prisma.tvShowWatchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: 'desc' },
    });

    logger.info('TV_SHOW_WATCHLIST', 'Fetched TV show watchlist', {
      userId: user.id,
      count: watchlist.length,
    });

    return NextResponse.json({ watchlist });
  } catch (error: any) {
    logger.error('TV_SHOW_WATCHLIST', 'Error fetching TV show watchlist', {
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

// POST - Add TV show to watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    logger.info('TV_SHOW_WATCHLIST', 'POST request received', { 
      hasSession: !!session,
      userEmail: session?.user?.email,
    });
    
    if (!session?.user?.email) {
      logger.warn('TV_SHOW_WATCHLIST', 'Unauthorized POST request');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { tvShowId, tvShowName, tvShowYear } = body;
    
    logger.info('TV_SHOW_WATCHLIST', 'Add to watchlist request body', { 
      tvShowId, 
      tvShowName, 
      tvShowYear 
    });
    
    if (!tvShowId || !tvShowName) {
      logger.warn('TV_SHOW_WATCHLIST', 'Missing required fields', { tvShowId, tvShowName });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('TV_SHOW_WATCHLIST', 'User not found in database', { 
        email: session.user.email 
      });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check if TV show already exists in watchlist
    const existingItem = await prisma.tvShowWatchlistItem.findUnique({
      where: {
        userId_tvShowId: {
          userId: user.id,
          tvShowId: parseInt(tvShowId),
        },
      },
    });

    if (existingItem) {
      logger.info('TV_SHOW_WATCHLIST', 'TV show already in watchlist', {
        userId: user.id,
        tvShowId: parseInt(tvShowId),
        tvShowName,
      });
      
      return NextResponse.json({
        message: "TV show already in watchlist",
        item: existingItem,
        alreadyExists: true,
      });
    }
    
    const item = await prisma.tvShowWatchlistItem.create({
      data: {
        userId: user.id,
        tvShowId: parseInt(tvShowId),
        tvShowName,
        tvShowYear: tvShowYear ? parseInt(tvShowYear) : null,
      },
    });
    
    logger.info('TV_SHOW_WATCHLIST', 'TV show added to watchlist successfully', {
      userId: user.id,
      tvShowId: item.tvShowId,
      tvShowName: item.tvShowName,
    });
    
    return NextResponse.json({ item });
  } catch (error: any) {
    if (error.code === "P2002") {
      logger.warn('TV_SHOW_WATCHLIST', 'TV show already in watchlist', { 
        tvShowId: error.meta?.target,
      });
      return NextResponse.json(
        { error: "TV show already in watchlist" },
        { status: 400 }
      );
    }
    logger.error('TV_SHOW_WATCHLIST', 'Add to watchlist error', { 
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

// DELETE - Remove TV show from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tvShowId = searchParams.get("tvShowId");

    if (!tvShowId) {
      return NextResponse.json(
        { error: "TV show ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.tvShowWatchlistItem.delete({
      where: {
        userId_tvShowId: {
          userId: user.id,
          tvShowId: parseInt(tvShowId),
        },
      },
    });

    logger.info('TV_SHOW_WATCHLIST', 'TV show removed from watchlist', {
      userId: user.id,
      tvShowId: parseInt(tvShowId),
    });

    return NextResponse.json({ message: "Removed from watchlist" });
  } catch (error: any) {
    logger.error('TV_SHOW_WATCHLIST', 'Remove from watchlist error', {
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}

