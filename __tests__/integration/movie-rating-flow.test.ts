/**
 * Integration Test: Movie Rating Flow
 * 
 * Tests the complete flow of:
 * 1. User authentication
 * 2. Fetching movies
 * 3. Rating a movie
 * 4. Adding to watchlist
 * 5. Generating recommendations
 */

import { createNextRequest, mockSession, mockPrisma, mockMovie, mockUser } from '../helpers/test-utils';

// Mock all dependencies
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
import { generateRecommendationsWithPerplexity } from '@/lib/perplexity-recommendations';
import { GET as getMovies } from '@/app/api/movies/route';
import { GET as getRatings, POST as postRating } from '@/app/api/ratings/route';
import { POST as postWatchlist } from '@/app/api/watchlist/route';
import { POST as generateRecommendations } from '@/app/api/recommendations/bulk/route';

describe('Integration: Complete Movie Rating Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('should complete full user journey: browse → rate → watchlist → recommendations', async () => {
    // Step 1: User is authenticated
    expect(mockSession.user).toBeDefined();
    expect(mockSession.user.email).toBe('test@example.com');

    // Step 2: User browses movies
    mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);
    
    const moviesRequest = createNextRequest('GET', 'http://localhost:3000/api/movies');
    const moviesResponse = await getMovies(moviesRequest);
    const moviesData = await moviesResponse.json();

    expect(moviesResponse.status).toBe(200);
    expect(moviesData.movies).toHaveLength(1);
    expect(moviesData.movies[0].title).toBe('Test Movie');

    // Step 3: User rates the movie
    const mockRating = {
      id: 'rating-1',
      userId: mockSession.user.id,
      movieId: mockMovie.id,
      movieTitle: mockMovie.title,
      movieYear: mockMovie.year,
      rating: 'amazing' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.movieRating.upsert.mockResolvedValue(mockRating);

    const ratingRequest = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
      movieId: mockMovie.id,
      movieTitle: mockMovie.title,
      movieYear: mockMovie.year,
      rating: 'amazing',
    });

    const ratingResponse = await postRating(ratingRequest);
    const ratingData = await ratingResponse.json();

    expect(ratingResponse.status).toBe(200);
    expect(ratingData.success).toBe(true);
    expect(ratingData.rating.rating).toBe('amazing');

    // Step 4: User adds movie to watchlist
    const mockWatchlistItem = {
      id: 'watchlist-1',
      userId: mockSession.user.id,
      movieId: mockMovie.id,
      movieTitle: mockMovie.title,
      movieYear: mockMovie.year,
      createdAt: new Date(),
    };

    mockPrisma.watchlistItem.create.mockResolvedValue(mockWatchlistItem);

    const watchlistRequest = createNextRequest('POST', 'http://localhost:3000/api/watchlist', {
      movieId: mockMovie.id,
      movieTitle: mockMovie.title,
      movieYear: mockMovie.year,
    });

    const watchlistResponse = await postWatchlist(watchlistRequest);
    const watchlistData = await watchlistResponse.json();

    expect(watchlistResponse.status).toBe(200);
    expect(watchlistData.success).toBe(true);

    // Step 5: User has rated enough movies, generates recommendations
    mockPrisma.movieRating.count.mockResolvedValue(5);
    (generateRecommendationsWithPerplexity as jest.Mock).mockResolvedValue({
      success: true,
      batchId: 'batch-1',
      totalRequested: 10,
      successfullyStored: 10,
      failed: 0,
      recommendations: [],
    });

    const recommendationsRequest = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk', {
      count: 10,
    });

    const recommendationsResponse = await generateRecommendations(recommendationsRequest);
    const recommendationsData = await recommendationsResponse.json();

    expect(recommendationsResponse.status).toBe(200);
    expect(recommendationsData.success).toBe(true);
    expect(recommendationsData.successfullyStored).toBe(10);

    // Step 6: Verify all operations were called correctly
    expect(mockPrisma.movie.findMany).toHaveBeenCalled();
    expect(mockPrisma.movieRating.upsert).toHaveBeenCalled();
    expect(mockPrisma.watchlistItem.create).toHaveBeenCalled();
    expect(generateRecommendationsWithPerplexity).toHaveBeenCalled();
  });

  it('should handle rating multiple movies and generating diverse recommendations', async () => {
    // Rate multiple movies
    const ratings = [
      { movieId: 1, rating: 'amazing' },
      { movieId: 2, rating: 'good' },
      { movieId: 3, rating: 'amazing' },
      { movieId: 4, rating: 'awful' },
      { movieId: 5, rating: 'not-seen' },
    ];

    for (const { movieId, rating } of ratings) {
      mockPrisma.movieRating.upsert.mockResolvedValue({
        id: `rating-${movieId}`,
        userId: mockSession.user.id,
        movieId,
        movieTitle: `Movie ${movieId}`,
        movieYear: 2024,
        rating: rating as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
        movieId,
        movieTitle: `Movie ${movieId}`,
        movieYear: 2024,
        rating,
      });

      const response = await postRating(request);
      expect(response.status).toBe(200);
    }

    // Verify all ratings were created
    expect(mockPrisma.movieRating.upsert).toHaveBeenCalledTimes(5);

    // Generate recommendations based on diverse ratings
    mockPrisma.movieRating.count.mockResolvedValue(5);
    (generateRecommendationsWithPerplexity as jest.Mock).mockResolvedValue({
      success: true,
      batchId: 'batch-diverse',
      totalRequested: 10,
      successfullyStored: 10,
      failed: 0,
      recommendations: [],
    });

    const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk', {
      count: 10,
      genres: ['Action', 'Thriller'],
      yearFrom: 2020,
      yearTo: 2024,
    });

    const response = await generateRecommendations(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(generateRecommendationsWithPerplexity).toHaveBeenCalledWith(
      mockSession.user.id,
      expect.objectContaining({
        count: 10,
        genres: ['Action', 'Thriller'],
        yearFrom: 2020,
        yearTo: 2024,
      })
    );
  });

  it('should handle user journey with insufficient ratings', async () => {
    // User tries to generate recommendations with only 1 rating
    mockPrisma.movieRating.count.mockResolvedValue(1);

    const request = createNextRequest('POST', 'http://localhost:3000/api/recommendations/bulk');
    const response = await generateRecommendations(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Not enough ratings');
    expect(data.currentRatings).toBe(1);

    // Verify recommendation generation was not called
    expect(generateRecommendationsWithPerplexity).not.toHaveBeenCalled();
  });

  it('should maintain data consistency across operations', async () => {
    // Create a rating
    const rating = {
      id: 'rating-1',
      userId: mockSession.user.id,
      movieId: 1,
      movieTitle: 'Test Movie',
      movieYear: 2024,
      rating: 'amazing' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.movieRating.upsert.mockResolvedValue(rating);
    mockPrisma.movieRating.findMany.mockResolvedValue([rating]);

    // Rate the movie
    const rateRequest = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
      movieId: 1,
      movieTitle: 'Test Movie',
      movieYear: 2024,
      rating: 'amazing',
    });

    await postRating(rateRequest);

    // Fetch ratings
    const getRatingsRequest = createNextRequest('GET', 'http://localhost:3000/api/ratings');
    const ratingsResponse = await getRatings(getRatingsRequest);
    const ratingsData = await ratingsResponse.json();

    expect(ratingsData.ratings).toHaveLength(1);
    expect(ratingsData.ratings[0].movieId).toBe(1);
    expect(ratingsData.ratings[0].rating).toBe('amazing');

    // Update the rating
    const updatedRating = { ...rating, rating: 'good' as const, updatedAt: new Date() };
    mockPrisma.movieRating.upsert.mockResolvedValue(updatedRating);

    const updateRequest = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
      movieId: 1,
      movieTitle: 'Test Movie',
      movieYear: 2024,
      rating: 'good',
    });

    const updateResponse = await postRating(updateRequest);
    const updateData = await updateResponse.json();

    expect(updateData.rating.rating).toBe('good');
    expect(mockPrisma.movieRating.upsert).toHaveBeenCalledTimes(2);
  });
});

