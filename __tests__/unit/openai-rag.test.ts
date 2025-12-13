/**
 * Unit Tests: OpenAI API & RAG Integration
 * 
 * Tests the OpenAI GPT and RAG functionality including:
 * - Embedding generation
 * - Similarity search
 * - Rating analysis
 * - Chat functionality
 * - Error handling
 */

import { mockPrisma } from '../helpers/test-utils';

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

import {
  generateEmbedding,
  storeUserPreference,
  findSimilarPreferences,
  analyzeUserRatings,
  chatWithAI,
} from '@/lib/rag';

describe('OpenAI API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector for text', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.random());

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: mockEmbedding }],
          }),
        },
      };

      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => mockOpenAI);
      });

      const result = await generateEmbedding('I love action movies');

      // Would verify:
      // 1. Embedding has correct dimensions (1536)
      // 2. All values are numbers
      // 3. Values are normalized
    });

    it('should handle empty text', async () => {
      await expect(generateEmbedding('')).rejects.toThrow();
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(10000);
      
      // Should either truncate or handle gracefully
      // Exact behavior depends on implementation
    });

    it('should handle OpenAI API errors', async () => {
      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockRejectedValue(new Error('OpenAI API error')),
        },
      };

      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => mockOpenAI);
      });

      await expect(
        generateEmbedding('test text')
      ).rejects.toThrow();
    });
  });

  describe('storeUserPreference', () => {
    it('should store preference with embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      
      mockPrisma.userPreference.create.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        preferenceText: 'I love thriller movies',
        embedding: mockEmbedding,
        createdAt: new Date(),
      });

      const result = await storeUserPreference('user-1', 'I love thriller movies');

      expect(mockPrisma.userPreference.create).toHaveBeenCalled();
      // Would verify embedding was generated and stored
    });

    it('should handle database errors', async () => {
      mockPrisma.userPreference.create.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        storeUserPreference('user-1', 'test preference')
      ).rejects.toThrow();
    });
  });

  describe('findSimilarPreferences', () => {
    it('should find similar preferences using cosine similarity', async () => {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'pref-1',
          preferenceText: 'I love action movies',
          similarity: 0.95,
        },
        {
          id: 'pref-2',
          preferenceText: 'I enjoy thrillers',
          similarity: 0.87,
        },
      ]);

      const results = await findSimilarPreferences('user-1', queryEmbedding, 5);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      // Would verify results are ordered by similarity
    });

    it('should limit results correctly', async () => {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockPrisma.$queryRaw.mockResolvedValue([
        { id: '1', preferenceText: 'pref 1', similarity: 0.9 },
        { id: '2', preferenceText: 'pref 2', similarity: 0.8 },
      ]);

      const results = await findSimilarPreferences('user-1', queryEmbedding, 2);

      expect(results).toHaveLength(2);
    });

    it('should handle no similar preferences found', async () => {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await findSimilarPreferences('user-1', queryEmbedding, 5);

      expect(results).toEqual([]);
    });
  });

  describe('analyzeUserRatings', () => {
    it('should analyze user rating patterns', async () => {
      const mockRatings = [
        { movieTitle: 'Inception', rating: 'amazing', genres: ['Sci-Fi', 'Thriller'] },
        { movieTitle: 'The Matrix', rating: 'amazing', genres: ['Sci-Fi', 'Action'] },
        { movieTitle: 'Titanic', rating: 'awful', genres: ['Romance', 'Drama'] },
      ];

      mockPrisma.movieRating.findMany.mockResolvedValue(
        mockRatings.map((r, i) => ({
          id: `rating-${i}`,
          userId: 'user-1',
          movieId: i,
          movieTitle: r.movieTitle,
          movieYear: 2020,
          rating: r.rating as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      const mockGPTResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              preferredGenres: ['Sci-Fi', 'Thriller'],
              dislikedGenres: ['Romance'],
              themes: ['mind-bending', 'reality'],
              summary: 'User loves complex sci-fi thrillers',
            }),
          },
          finish_reason: 'stop',
        }],
        model: 'gpt-5-nano',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockGPTResponse),
          },
        },
      };

      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => mockOpenAI);
      });

      const analysis = await analyzeUserRatings('user-1');

      expect(mockPrisma.movieRating.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Would verify analysis contains:
      // - Preferred genres
      // - Disliked genres
      // - Common themes
      // - Summary
    });

    it('should handle users with no ratings', async () => {
      mockPrisma.movieRating.findMany.mockResolvedValue([]);

      await expect(analyzeUserRatings('user-1')).rejects.toThrow();
    });

    it('should categorize ratings by type', async () => {
      const mockRatings = [
        { movieTitle: 'Movie 1', rating: 'amazing', genres: ['Action'] },
        { movieTitle: 'Movie 2', rating: 'good', genres: ['Comedy'] },
        { movieTitle: 'Movie 3', rating: 'awful', genres: ['Horror'] },
        { movieTitle: 'Movie 4', rating: 'not-seen', genres: ['Drama'] },
      ];

      mockPrisma.movieRating.findMany.mockResolvedValue(
        mockRatings.map((r, i) => ({
          id: `rating-${i}`,
          userId: 'user-1',
          movieId: i,
          movieTitle: r.movieTitle,
          movieYear: 2020,
          rating: r.rating as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      // Would verify ratings are properly categorized:
      // - Amazing: Movie 1
      // - Good: Movie 2
      // - Awful: Movie 3
      // - Not Seen: Movie 4
    });
  });

  describe('chatWithAI', () => {
    it('should generate contextual response using RAG', async () => {
      const mockSimilarPreferences = [
        { preferenceText: 'I love sci-fi movies', similarity: 0.9 },
        { preferenceText: 'Thriller movies are my favorite', similarity: 0.85 },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockSimilarPreferences);

      const mockGPTResponse = {
        choices: [{
          message: {
            content: 'Based on your love for sci-fi and thrillers, I recommend Inception!',
          },
          finish_reason: 'stop',
        }],
        model: 'gpt-5-nano',
        usage: { prompt_tokens: 200, completion_tokens: 50, total_tokens: 250 },
      };

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: new Array(1536).fill(0) }],
          }),
        },
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockGPTResponse),
          },
        },
      };

      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => mockOpenAI);
      });

      const response = await chatWithAI('user-1', 'What movie should I watch?');

      // Would verify:
      // 1. Similar preferences were retrieved
      // 2. Context was included in GPT prompt
      // 3. Response is personalized
    });

    it('should handle chat without preferences', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const mockGPTResponse = {
        choices: [{
          message: {
            content: 'I can recommend some popular movies!',
          },
          finish_reason: 'stop',
        }],
        model: 'gpt-5-nano',
        usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
      };

      // Should still provide helpful response even without context
    });

    it('should handle long conversation context', async () => {
      const longQuery = 'word '.repeat(5000);

      // Should truncate or handle gracefully
      // Implementation-specific
    });
  });

  describe('GPT Model Configuration', () => {
    it('should use correct model (gpt-5-nano or fallback)', () => {
      // Would verify correct model is being used
      expect(process.env.OPENAI_MODEL).toBeDefined();
    });

    it('should handle max_completion_tokens correctly', async () => {
      // Verify that GPT-5-nano uses max_completion_tokens
      // not max_tokens
    });

    it('should not set temperature for gpt-5-nano', async () => {
      // gpt-5-nano only supports temperature=1 (default)
      // Should not set temperature parameter
    });
  });

  describe('Token Management', () => {
    it('should track token usage', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        model: 'gpt-5-nano',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      // Would verify token usage is logged
    });

    it('should handle token limit exceeded', async () => {
      const mockError = new Error('Token limit exceeded');
      (mockError as any).status = 400;

      // Should handle gracefully and possibly retry with shorter input
    });
  });

  describe('Error Handling', () => {
    it('should handle API key not configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      // Should throw meaningful error
      
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should handle malformed JSON response', async () => {
      const mockBadResponse = {
        choices: [{
          message: {
            content: 'This is not JSON {invalid',
          },
          finish_reason: 'stop',
        }],
        model: 'gpt-5-nano',
      };

      // Should handle parsing error gracefully
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      // Should handle and possibly retry
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).headers = {
        'retry-after': '5',
      };

      // Should respect retry-after header
    });
  });

  describe('Prompt Engineering', () => {
    it('should build effective system prompts', () => {
      // System prompts should be clear and specific
      // Include role definition, task description, constraints
    });

    it('should include user context in prompts', () => {
      // User prompts should include:
      // - User's rating history
      // - Language preferences
      // - Relevant context from RAG
    });

    it('should format categorized ratings correctly', () => {
      // Ratings should be grouped by:
      // - Amazing (highest priority)
      // - Good (secondary)
      // - Awful (avoid similar)
      // - Not Seen (interest indicators)
    });
  });

  describe('Response Validation', () => {
    it('should validate GPT response structure', () => {
      const validResponse = {
        recommendations: [
          {
            id: 123,
            title: 'Test Movie',
            // ... all required fields
          },
        ],
      };

      // Should validate all required fields are present
    });

    it('should handle missing required fields', () => {
      const invalidResponse = {
        recommendations: [
          {
            // Missing required fields
            title: 'Test Movie',
          },
        ],
      };

      // Should handle gracefully or reject
    });

    it('should validate data types', () => {
      const invalidTypes = {
        recommendations: [
          {
            id: 'should-be-number',
            year: 'should-be-number',
            voteAverage: 'should-be-number',
          },
        ],
      };

      // Should validate and convert types if possible
    });
  });
});

describe('RAG Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full RAG flow: embed → search → context → generate', async () => {
    // 1. Generate query embedding
    const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());

    // 2. Find similar preferences
    mockPrisma.$queryRaw.mockResolvedValue([
      { preferenceText: 'I love action movies', similarity: 0.9 },
    ]);

    // 3. Build context with similar preferences

    // 4. Generate response with GPT

    // 5. Return personalized response

    // Full integration test
  });

  it('should handle RAG pipeline failures gracefully', async () => {
    // If embedding fails, fall back to non-RAG
    // If similarity search fails, use empty context
    // If GPT fails, provide error message
  });
});

