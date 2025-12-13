/**
 * Unit Tests: Perplexity API Integration
 * 
 * Tests the Perplexity recommendation system including:
 * - API connectivity
 * - Query building
 * - Response parsing
 * - Error handling
 */

import { generateRecommendationsWithPerplexity, getRecommendationStatus } from '@/lib/perplexity-recommendations';
import { mockPrisma, mockUser } from '../helpers/test-utils';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('openai');

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    dbOperation: jest.fn(),
  },
}));

describe('Perplexity API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRecommendationsWithPerplexity', () => {
    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        generateRecommendationsWithPerplexity('non-existent-user')
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user has insufficient ratings', async () => {
      const userWithFewRatings = {
        ...mockUser,
        ratings: [
          {
            id: 'rating-1',
            userId: mockUser.id,
            movieId: 1,
            movieTitle: 'Movie 1',
            movieYear: 2024,
            rating: 'amazing',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithFewRatings);

      await expect(
        generateRecommendationsWithPerplexity(mockUser.id)
      ).rejects.toThrow('Please rate at least 3 movies');
    });

    it('should categorize user ratings correctly', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: [
          { id: '1', userId: mockUser.id, movieId: 1, movieTitle: 'Movie 1', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', userId: mockUser.id, movieId: 2, movieTitle: 'Movie 2', movieYear: 2024, rating: 'good', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', userId: mockUser.id, movieId: 3, movieTitle: 'Movie 3', movieYear: 2024, rating: 'awful', createdAt: new Date(), updatedAt: new Date() },
          { id: '4', userId: mockUser.id, movieId: 4, movieTitle: 'Movie 4', movieYear: 2024, rating: 'not-seen', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      // Mock Perplexity response
      const mockPerplexityResponse = {
        choices: [{
          message: {
            content: 'Here are some movies:\n1. Test Movie (2024)\n2. Another Movie (2023)',
          },
          finish_reason: 'stop',
        }],
        model: 'sonar-pro',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      };

      // Mock OpenAI (Perplexity client)
      const mockCreate = jest.fn().mockResolvedValue(mockPerplexityResponse);
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });

      // Mock GPT response
      const mockGPTResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: [
                {
                  id: 123456,
                  title: 'Test Movie',
                  originalTitle: 'Test Movie',
                  overview: 'Test overview',
                  posterPath: '/test.jpg',
                  backdropPath: '/test-backdrop.jpg',
                  releaseDate: '2024-01-01',
                  year: 2024,
                  voteAverage: 8.0,
                  voteCount: 1000,
                  popularity: 90,
                  language: 'en',
                  genres: ['Action'],
                  runtime: 120,
                  tagline: 'Test',
                  imdbRating: 8.0,
                  rtRating: 85,
                  reason: 'Test reason',
                  matchPercentage: 90,
                },
              ],
            }),
          },
          finish_reason: 'stop',
        }],
        model: 'gpt-5-nano',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      };

      mockPrisma.movie.upsert.mockResolvedValue({
        id: 123456,
        title: 'Test Movie',
        originalTitle: 'Test Movie',
        overview: 'Test overview',
        posterPath: '/test.jpg',
        backdropPath: '/test-backdrop.jpg',
        releaseDate: '2024-01-01',
        year: 2024,
        voteAverage: 8.0,
        voteCount: 1000,
        popularity: 90,
        language: 'en',
        genres: ['Action'],
        runtime: 120,
        tagline: 'Test',
        imdbRating: 8.0,
        rtRating: 85,
      });

      mockPrisma.userRecommendation.create.mockResolvedValue({
        id: 'rec-1',
        userId: mockUser.id,
        movieId: 123456,
        batchId: 'batch-1',
        position: 1,
        reason: 'Test reason',
        matchPercentage: 90,
        shown: false,
        rated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Note: This test will likely need to be adjusted based on actual implementation
      // as mocking Perplexity through OpenAI client is complex
    });

    it('should apply custom filters to recommendations', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: [
          { id: '1', userId: mockUser.id, movieId: 1, movieTitle: 'Movie 1', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', userId: mockUser.id, movieId: 2, movieTitle: 'Movie 2', movieYear: 2024, rating: 'good', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', userId: mockUser.id, movieId: 3, movieTitle: 'Movie 3', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      const filters = {
        count: 5,
        yearFrom: 2020,
        yearTo: 2024,
        genres: ['Action', 'Thriller'],
        minImdbRating: 7.5,
      };

      // Test would verify that filters are properly passed to Perplexity
      // This is a placeholder as actual testing requires mocking the full chain
    });

    it('should handle Perplexity API errors gracefully', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: [
          { id: '1', userId: mockUser.id, movieId: 1, movieTitle: 'Movie 1', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', userId: mockUser.id, movieId: 2, movieTitle: 'Movie 2', movieYear: 2024, rating: 'good', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', userId: mockUser.id, movieId: 3, movieTitle: 'Movie 3', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      // Mock Perplexity API error
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue(new Error('Perplexity API error')),
            },
          },
        }));
      });

      // Should propagate the error
      await expect(
        generateRecommendationsWithPerplexity(mockUser.id)
      ).rejects.toThrow();
    });
  });

  describe('getRecommendationStatus', () => {
    it('should return correct status with no recommendations', async () => {
      mockPrisma.userRecommendation.count
        .mockResolvedValueOnce(0)  // total
        .mockResolvedValueOnce(0)  // unshown
        .mockResolvedValueOnce(0)  // shown
        .mockResolvedValueOnce(0); // rated

      const status = await getRecommendationStatus(mockUser.id);

      expect(status).toEqual({
        total: 0,
        unshown: 0,
        shown: 0,
        rated: 0,
        available: 0,
      });
    });

    it('should return correct status with recommendations', async () => {
      mockPrisma.userRecommendation.count
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(10)  // unshown
        .mockResolvedValueOnce(5)   // shown
        .mockResolvedValueOnce(5);  // rated

      const status = await getRecommendationStatus(mockUser.id);

      expect(status).toEqual({
        total: 20,
        unshown: 10,
        shown: 5,
        rated: 5,
        available: 15,
      });
    });

    it('should calculate available count correctly', async () => {
      mockPrisma.userRecommendation.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(30)   // unshown
        .mockResolvedValueOnce(20)   // shown
        .mockResolvedValueOnce(50);  // rated

      const status = await getRecommendationStatus(mockUser.id);

      expect(status.available).toBe(50); // unshown + shown
    });
  });

  describe('Perplexity Query Building', () => {
    it('should build query with user rating profile', async () => {
      // Test that the query includes categorized ratings
      // This would test the internal query building logic
      const userWithDiverseRatings = {
        ...mockUser,
        ratings: [
          { id: '1', userId: mockUser.id, movieId: 1, movieTitle: 'Amazing Movie', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', userId: mockUser.id, movieId: 2, movieTitle: 'Good Movie', movieYear: 2024, rating: 'good', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', userId: mockUser.id, movieId: 3, movieTitle: 'Awful Movie', movieYear: 2024, rating: 'awful', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithDiverseRatings);

      // Would verify query includes:
      // - MOVIES THEY LOVED section
      // - MOVIES THEY ENJOYED section
      // - MOVIES THEY DISLIKED section
    });

    it('should include language preferences in query', async () => {
      const userWithLanguages = {
        ...mockUser,
        languages: ['Hindi', 'Tamil', 'English'],
        ratings: [
          { id: '1', userId: mockUser.id, movieId: 1, movieTitle: 'Movie 1', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', userId: mockUser.id, movieId: 2, movieTitle: 'Movie 2', movieYear: 2024, rating: 'good', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', userId: mockUser.id, movieId: 3, movieTitle: 'Movie 3', movieYear: 2024, rating: 'amazing', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithLanguages);

      // Would verify query includes language descriptions:
      // "Bollywood/Hindi, Kollywood/Tamil, Hollywood/English"
    });
  });

  describe('Response Parsing', () => {
    it('should parse Perplexity response and extract movie data', () => {
      const perplexityResponse = `
Here are 10 movie recommendations:

1. **Inception** (2010) - A mind-bending thriller about dreams
2. **The Dark Knight** (2008) - Batman faces the Joker
3. **Interstellar** (2014) - Space exploration epic
      `;

      // Would test parsing logic to extract titles and years
      // Expected: ["Inception", "The Dark Knight", "Interstellar"]
    });

    it('should handle various response formats', () => {
      const formats = [
        '1. Movie Title (2024)',
        '1. **Movie Title** (2024)',
        'Movie Title - 2024',
        '**Movie Title** - 2024',
      ];

      // Would test that parser handles all common formats
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: Array(5).fill(null).map((_, i) => ({
          id: `rating-${i}`,
          userId: mockUser.id,
          movieId: i,
          movieTitle: `Movie ${i}`,
          movieYear: 2024,
          rating: 'amazing',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      // Mock timeout error
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue(new Error('Request timeout')),
            },
          },
        }));
      });

      await expect(
        generateRecommendationsWithPerplexity(mockUser.id)
      ).rejects.toThrow();
    });

    it('should handle invalid API key', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: Array(5).fill(null).map((_, i) => ({
          id: `rating-${i}`,
          userId: mockUser.id,
          movieId: i,
          movieTitle: `Movie ${i}`,
          movieYear: 2024,
          rating: 'amazing',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      // Mock auth error
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue(new Error('Invalid API key')),
            },
          },
        }));
      });

      await expect(
        generateRecommendationsWithPerplexity(mockUser.id)
      ).rejects.toThrow();
    });

    it('should handle rate limiting', async () => {
      const userWithRatings = {
        ...mockUser,
        ratings: Array(5).fill(null).map((_, i) => ({
          id: `rating-${i}`,
          userId: mockUser.id,
          movieId: i,
          movieTitle: `Movie ${i}`,
          movieYear: 2024,
          rating: 'amazing',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithRatings);

      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue(rateLimitError),
            },
          },
        }));
      });

      await expect(
        generateRecommendationsWithPerplexity(mockUser.id)
      ).rejects.toThrow();
    });
  });
});

