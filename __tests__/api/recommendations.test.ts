import { POST, GET } from '@/app/api/recommendations/bulk/route';
import { createNextRequest, mockSession, mockPrisma } from '../helpers/test-utils';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/perplexity-recommendations', () => ({
  generateRecommendationsWithPerplexity: jest.fn(),
  getRecommendationStatus: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { generateRecommendationsWithPerplexity, getRecommendationStatus } from '@/lib/perplexity-recommendations';

describe('Recommendations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('POST /api/recommendations/bulk', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if user has insufficient ratings', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(2); // Less than 3

      const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk', {
        count: 10,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Not enough ratings');
      expect(data.currentRatings).toBe(2);
    });

    it('should generate recommendations with default filters', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(5);
      (generateRecommendationsWithPerplexity as jest.Mock).mockResolvedValue({
        success: true,
        batchId: 'test-batch-id',
        totalRequested: 10,
        successfullyStored: 10,
        failed: 0,
        recommendations: [],
      });

      const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.successfullyStored).toBe(10);
      expect(generateRecommendationsWithPerplexity).toHaveBeenCalledWith(
        mockSession.user.id,
        expect.objectContaining({
          count: 10,
        })
      );
    });

    it('should generate recommendations with custom filters', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(5);
      (generateRecommendationsWithPerplexity as jest.Mock).mockResolvedValue({
        success: true,
        batchId: 'test-batch-id',
        totalRequested: 20,
        successfullyStored: 20,
        failed: 0,
        recommendations: [],
      });

      const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk', {
        count: 20,
        yearFrom: 2020,
        yearTo: 2024,
        genres: ['Action', 'Thriller'],
        minImdbRating: 7.5,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(generateRecommendationsWithPerplexity).toHaveBeenCalledWith(
        mockSession.user.id,
        expect.objectContaining({
          count: 20,
          yearFrom: 2020,
          yearTo: 2024,
          genres: ['Action', 'Thriller'],
          minImdbRating: 7.5,
        })
      );
    });

    it('should handle recommendation generation errors', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(5);
      (generateRecommendationsWithPerplexity as jest.Mock).mockRejectedValue(
        new Error('Failed to generate recommendations')
      );

      const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate recommendations');
    });
  });

  describe('GET /api/recommendations/bulk', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createNextRequest('GET', 'http://localhost:3000/api/recommendations/bulk');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return recommendation status for authenticated user', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(5);
      (getRecommendationStatus as jest.Mock).mockResolvedValue({
        total: 10,
        unshown: 5,
        shown: 3,
        rated: 2,
        available: 8,
      });

      const request = createNextRequest('GET', 'http://localhost:3000/api/recommendations/bulk');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe(mockSession.user.id);
      expect(data.user.ratingCount).toBe(5);
      expect(data.queue).toEqual({
        total: 10,
        unshown: 5,
        shown: 3,
        rated: 2,
        available: 8,
      });
      expect(data.ready).toBe(true);
    });

    it('should indicate not ready if insufficient ratings', async () => {
      mockPrisma.movieRating.count.mockResolvedValue(1);
      (getRecommendationStatus as jest.Mock).mockResolvedValue({
        total: 0,
        unshown: 0,
        shown: 0,
        rated: 0,
        available: 0,
      });

      const request = createNextRequest('GET', 'http://localhost:3000/api/recommendations/bulk');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ready).toBe(false);
      expect(data.message).toContain('Need 2 more ratings');
    });
  });
});

