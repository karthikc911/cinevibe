import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/mobile-auth";

// GET - Fetch user's watchlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    logger.info('WATCHLIST', 'GET request received', {
      hasSession: !!session,
      hasMobileToken: !!authHeader,
      userEmail: currentUser?.email,
    });
    
    if (!currentUser) {
      logger.warn('WATCHLIST', 'Unauthorized watchlist GET request', { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('WATCHLIST', 'User not found in database', { email: currentUser.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    logger.info('WATCHLIST', 'User found, fetching watchlist items', { userId: user.id });
    
    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
    });
    
    logger.info('WATCHLIST', 'Watchlist fetched successfully', { 
      userId: user.id,
      itemCount: watchlist.length,
      items: watchlist.map(item => ({ id: item.movieId, title: item.movieTitle })),
    });
    
    return NextResponse.json({ watchlist });
  } catch (error: any) {
    logger.error('WATCHLIST', 'Get watchlist error', { 
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch watchlist",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Add to watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    logger.info('WATCHLIST', 'POST request received', { 
      hasSession: !!session,
      hasMobileToken: !!authHeader,
      userEmail: currentUser?.email,
    });
    
    if (!currentUser) {
      logger.warn('WATCHLIST', 'Unauthorized watchlist POST request', { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { movieId, movieTitle, movieYear } = body;
    
    logger.info('WATCHLIST', 'Add to watchlist request body', { movieId, movieTitle, movieYear });
    
    if (!movieId || !movieTitle) {
      logger.warn('WATCHLIST', 'Missing required fields', { movieId, movieTitle });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('WATCHLIST', 'User not found in database', { email: currentUser.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check if movie already exists in watchlist
    const existingItem = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: parseInt(movieId),
        },
      },
    });

    if (existingItem) {
      logger.info('WATCHLIST', 'Movie already in watchlist', {
        userId: user.id,
        movieId: parseInt(movieId),
        movieTitle,
      });
      
      return NextResponse.json({
        message: "Movie already in watchlist",
        item: existingItem,
        alreadyExists: true,
      });
    }
    
    const item = await prisma.watchlistItem.create({
      data: {
        userId: user.id,
        movieId: parseInt(movieId),
        movieTitle,
        movieYear: movieYear ? String(movieYear) : null,
      },
    });
    
    logger.info('WATCHLIST', 'Movie added to watchlist successfully', {
      userId: user.id,
      movieId: item.movieId,
      movieTitle: item.movieTitle,
    });
    
    return NextResponse.json({ item });
  } catch (error: any) {
    if (error.code === "P2002") {
      logger.warn('WATCHLIST', 'Movie already in watchlist', { 
        movieId: error.meta?.target,
      });
      return NextResponse.json(
        { error: "Movie already in watchlist" },
        { status: 400 }
      );
    }
    logger.error('WATCHLIST', 'Add to watchlist error', { 
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

// DELETE - Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    if (!currentUser) {
      logger.warn('WATCHLIST', 'Unauthorized watchlist DELETE request', { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");
    
    if (!movieId) {
      logger.warn('WATCHLIST', 'Missing movieId in DELETE request');
      return NextResponse.json(
        { error: "Missing movieId" },
        { status: 400 }
      );
    }
    
    // Get user by email to ensure we have the correct user ID
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      logger.error('WATCHLIST', 'User not found in database', { email: currentUser.email });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    await prisma.watchlistItem.delete({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: parseInt(movieId),
        },
      },
    });
    
    logger.info('WATCHLIST', 'Movie removed from watchlist successfully', {
      userId: user.id,
      movieId: parseInt(movieId),
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('WATCHLIST', 'Delete from watchlist error', { 
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}

