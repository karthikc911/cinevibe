import { createMocks, RequestMethod } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock NextAuth session
 */
export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Mock Prisma client
 */
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  movie: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  movieRating: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  watchlistItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  userRecommendation: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

/**
 * Mock OpenAI client
 */
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

/**
 * Create mock API request
 */
export function createMockRequest(
  method: RequestMethod,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  const { req, res } = createMocks({
    method,
    url,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  return { req, res };
}

/**
 * Create mock Next.js API request
 */
export function createNextRequest(
  method: string,
  url: string,
  body?: any
): NextRequest {
  const request = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return request as NextRequest;
}

/**
 * Mock movie data
 */
export const mockMovie = {
  id: 1,
  title: 'Test Movie',
  originalTitle: 'Test Movie',
  overview: 'A test movie description',
  posterPath: '/test-poster.jpg',
  backdropPath: '/test-backdrop.jpg',
  releaseDate: '2024-01-01',
  year: 2024,
  voteAverage: 8.5,
  voteCount: 1000,
  popularity: 95.5,
  language: 'en',
  genres: ['Action', 'Thriller'],
  runtime: 120,
  tagline: 'Test tagline',
  imdbRating: 8.3,
  rtRating: 90,
};

/**
 * Mock user data
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: new Date(),
  password: null,
  languages: ['English', 'Hindi'],
  onboardingComplete: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock rating data
 */
export const mockRating = {
  id: 'test-rating-id',
  userId: 'test-user-id',
  movieId: 1,
  movieTitle: 'Test Movie',
  movieYear: 2024,
  rating: 'amazing' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock watchlist item data
 */
export const mockWatchlistItem = {
  id: 'test-watchlist-id',
  userId: 'test-user-id',
  movieId: 1,
  movieTitle: 'Test Movie',
  movieYear: 2024,
  createdAt: new Date(),
};

/**
 * Wait for promises to resolve
 */
export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Mock logger
 */
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  dbOperation: jest.fn(),
};

