import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tvShowId = parseInt(id);

    logger.info('TV_SHOW_DETAILS', 'Fetching TV show details', { tvShowId });

    // Fetch TV show from database
    const tvShow = await prisma.tvShow.findUnique({
      where: { id: tvShowId },
    });

    if (!tvShow) {
      logger.warn('TV_SHOW_DETAILS', 'TV show not found in database', { tvShowId });
      return NextResponse.json(
        { error: 'TV show not found' },
        { status: 404 }
      );
    }

    // Transform to frontend format
    const transformedTvShow = {
      id: tvShow.id,
      name: tvShow.name,
      title: tvShow.name,
      originalName: tvShow.originalName,
      overview: tvShow.overview,
      poster: tvShow.posterPath 
        ? `https://image.tmdb.org/t/p/w780${tvShow.posterPath}`
        : '',
      backdrop: tvShow.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${tvShow.backdropPath}`
        : '',
      year: tvShow.year,
      firstAirDate: tvShow.firstAirDate,
      imdb: tvShow.imdbRating,
      imdbVoterCount: tvShow.imdbVoterCount,
      userReviewSummary: tvShow.userReviewSummary,
      rt: tvShow.rtRating,
      voteAverage: tvShow.voteAverage,
      voteCount: tvShow.voteCount,
      popularity: tvShow.popularity,
      lang: getLanguageName(tvShow.language),
      language: tvShow.language,
      genres: tvShow.genres,
      numberOfSeasons: tvShow.numberOfSeasons,
      numberOfEpisodes: tvShow.numberOfEpisodes,
      episodeRunTime: tvShow.episodeRunTime,
      status: tvShow.status,
      tagline: tvShow.tagline,
      summary: tvShow.overview,
      category: tvShow.genres?.[0] || 'Unknown',
      type: 'tvshow', // Explicitly mark as TV show
      mediaType: 'tv', // For compatibility with MovieCard
    };

    logger.info('TV_SHOW_DETAILS', 'TV show details fetched successfully', {
      tvShowId,
      name: tvShow.name,
    });

    return NextResponse.json(transformedTvShow);
  } catch (error: any) {
    logger.error('TV_SHOW_DETAILS', 'Error fetching TV show details', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch TV show details' },
      { status: 500 }
    );
  }
}

// Helper to get language name from code
function getLanguageName(code: string): string {
  const languageMap: { [key: string]: string } = {
    en: 'English',
    hi: 'Hindi',
    kn: 'Kannada',
    ta: 'Tamil',
    te: 'Telugu',
    ml: 'Malayalam',
    ko: 'Korean',
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    de: 'German',
    pt: 'Portuguese',
  };
  return languageMap[code] || code.toUpperCase();
}
