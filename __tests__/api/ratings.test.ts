import { GET, POST, DELETE } from '@/app/api/ratings/route';
import { createNextRequest, mockSession, mockPrisma, mockRating } from '../helpers/test-utils';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { getServerSession } from 'next-auth';

describe('Ratings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/ratings', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('GET', 'http://localhost:3000/api/ratings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all ratings for authenticated user', async () => {
      mockPrisma.movieRating.findMany.mockResolvedValue([mockRating]);

      const request = createNextRequest('GET', 'http://localhost:3000/api/ratings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ratings).toEqual([mockRating]);
      expect(mockPrisma.movieRating.findMany).toHaveBeenCalledWith({
        where: { userId: mockSession.user.id },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no ratings', async () => {
      mockPrisma.movieRating.findMany.mockResolvedValue([]);

      const request = createNextRequest('GET', 'http://localhost:3000/api/ratings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ratings).toEqual([]);
    });
  });

  describe('POST /api/ratings', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
        rating: 'amazing',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId: 1,
        // Missing movieTitle, movieYear, rating
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should create a new rating', async () => {
      mockPrisma.movieRating.upsert.mockResolvedValue(mockRating);

      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
        rating: 'amazing',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rating).toEqual(mockRating);
      expect(mockPrisma.movieRating.upsert).toHaveBeenCalled();
    });

    it('should update an existing rating', async () => {
      const updatedRating = { ...mockRating, rating: 'good' as const };
      mockPrisma.movieRating.upsert.mockResolvedValue(updatedRating);

      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
        rating: 'good',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rating.rating).toBe('good');
    });

    it('should validate rating values', async () => {
      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId: 1,
        movieTitle: 'Test Movie',
        movieYear: 2024,
        rating: 'invalid-rating', // Invalid rating
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/ratings', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/ratings?movieId=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if movieId is missing', async () => {
      const request = createNextRequest('DELETE', 'http://localhost:3000/api/ratings');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should delete a rating', async () => {
      mockPrisma.movieRating.deleteMany.mockResolvedValue({ count: 1 });

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/ratings?movieId=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.movieRating.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockSession.user.id,
          movieId: 1,
        },
      });
    });

    it('should handle non-existent rating deletion', async () => {
      mockPrisma.movieRating.deleteMany.mockResolvedValue({ count: 0 });

      const request = createNextRequest('DELETE', 'http://localhost:3000/api/ratings?movieId=999');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

