import { POST } from '@/app/api/search/ai/route';
import { createNextRequest, mockSession, mockPrisma, mockMovie } from '../helpers/test-utils';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('openai');

import { getServerSession } from 'next-auth';

describe('POST /api/search/ai', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test query',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if query is missing', async () => {
    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {});

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query is required');
  });

  it('should return 400 if query is empty string', async () => {
    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: '   ',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query is required');
  });

  it('should search movies with Perplexity and return results', async () => {
    // Mock Perplexity response through OpenAI client
    const mockPerplexityResponse = {
      choices: [{
        message: {
          content: '1. Test Movie (2024)\n2. Another Movie (2023)',
        },
        finish_reason: 'stop',
      }],
      model: 'sonar-pro',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    // Mock OpenAI instance
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

    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'action movies',
      languages: ['English'],
      genres: ['Action'],
      yearRange: [2020, 2024],
      minRating: 7.0,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.movies).toBeDefined();
    expect(Array.isArray(data.movies)).toBe(true);
  });

  it('should handle Perplexity API errors gracefully', async () => {
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

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test query',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to perform AI search with Perplexity');
  });

  it('should apply language filters correctly', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test',
      languages: ['Hindi', 'Tamil'],
    });

    await POST(request);

    // Verify that findMany was called with language filter
    expect(mockPrisma.movie.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.movie.findMany.mock.calls[0][0];
    expect(callArgs.where.language).toBeDefined();
  });

  it('should apply genre filters correctly', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test',
      genres: ['Action', 'Thriller'],
    });

    await POST(request);

    expect(mockPrisma.movie.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.movie.findMany.mock.calls[0][0];
    expect(callArgs.where.genres).toBeDefined();
  });

  it('should apply year range filters correctly', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test',
      yearRange: [2020, 2024],
    });

    await POST(request);

    expect(mockPrisma.movie.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.movie.findMany.mock.calls[0][0];
    expect(callArgs.where.year).toBeDefined();
    expect(callArgs.where.year.gte).toBe(2020);
    expect(callArgs.where.year.lte).toBe(2024);
  });

  it('should apply minimum rating filters correctly', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);

    const request = createNextRequest('POST', 'http://localhost:3000/api/search/ai', {
      query: 'test',
      minRating: 7.5,
    });

    await POST(request);

    expect(mockPrisma.movie.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.movie.findMany.mock.calls[0][0];
    expect(callArgs.where.voteAverage).toBeDefined();
    expect(callArgs.where.voteAverage.gte).toBe(7.5);
  });
});

