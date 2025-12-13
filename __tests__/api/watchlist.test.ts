import { GET, POST, DELETE } from '@/app/api/watchlist/route';
import { createNextRequest, mockSession, mockPrisma, mockWatchlistItem } from '../helpers/test-utils';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { getServerSession } from 'next-auth';

describe('Watchlist API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/watchlist', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('GET', 'http://localhost:3000/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all watchlist items for authenticated user', async () => {
      mockPrisma.watchlistItem.findMany.mockResolvedValue([mockWatchlistItem]);

      const request = createNextRequest('GET', 'http://localhost:3000/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.watchlist).toEqual([mockWatchlistItem]);
      expect(mockPrisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: { userId: mockSession.user.id },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if watchlist is empty', async () => {
      mockPrisma.watchlistItem.findMany.mockResolvedValue([]);

      const request = createNextRequest('GET', 'http://localhost:3000/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.watchlist).toEqual([]);
    });
  });

  describe('POST /api/watchlist', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('POST', 'http://localhost:3000/api/watchlist', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createNextRequest('POST', 'http://localhost:3000/api/watchlist', {
        movieId: 1,
        // Missing movieTitle, movieYear
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should add a movie to watchlist', async () => {
      mockPrisma.watchlistItem.create.mockResolvedValue(mockWatchlistItem);

      const request = createNextRequest('POST', 'http://localhost:3000/api/watchlist', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.watchlistItem).toEqual(mockWatchlistItem);
      expect(mockPrisma.watchlistItem.create).toHaveBeenCalled();
    });

    it('should handle duplicate watchlist items', async () => {
      mockPrisma.watchlistItem.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      const request = createNextRequest('POST', 'http://localhost:3000/api/watchlist', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/watchlist', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/watchlist?movieId=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if movieId is missing', async () => {
      const request = createNextRequest('DELETE', 'http://localhost:3000/api/watchlist');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should remove a movie from watchlist', async () => {
      mockPrisma.watchlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/watchlist?movieId=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.watchlistItem.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockSession.user.id,
          movieId: 1,
        },
      });
    });

    it('should handle removing non-existent watchlist item', async () => {
      mockPrisma.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/watchlist?movieId=999');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

