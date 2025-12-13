import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = 'sonar-pro';

/**
 * POST /api/ott-availability
 * Fetch OTT availability for a movie from Perplexity API
 * Body: { movieId: number, movieTitle: string, movieYear?: number }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { movieId, movieTitle, movieYear } = body;

    if (!movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'Missing movieId or movieTitle' },
        { status: 400 }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      logger.error('OTT_AVAILABILITY', 'Perplexity API key not configured');
      return NextResponse.json(
        { error: 'Perplexity API not configured' },
        { status: 500 }
      );
    }

    logger.info('OTT_AVAILABILITY', `🔍 Fetching OTT availability ON-DEMAND for: ${movieTitle}`, {
      movieId,
      movieTitle,
      movieYear,
    });

    // Build query for Perplexity (always fetch fresh data on click)
    const movieQuery = movieYear
      ? `${movieTitle} (${movieYear})`
      : movieTitle;

    const prompt = `Find the current streaming availability for the movie "${movieQuery}" ONLY in the United States (USA).

**IMPORTANT: Only include platforms available in the USA. Do NOT include international platforms.**

Please provide:
1. List of streaming/OTT platforms where it's currently available in the USA (e.g., Netflix, Prime Video, Disney+, Hulu, Apple TV+, HBO Max, Peacock, Paramount+, etc.)
2. Cost or availability type for each platform (e.g., "Included with subscription", "$3.99 to rent", "$14.99 to buy")

Format your response EXACTLY as a list with each line starting with "- ":
- Platform Name: Cost/Availability

Examples:
- Netflix: Included with subscription
- Prime Video: $3.99 to rent, $14.99 to buy
- Hulu: Included with subscription
- Apple TV+: $4.99 to rent

**Only list platforms available in the USA. Exclude all international/region-specific platforms (UK, Germany, France, Australia, etc.).**

If not available on streaming in the USA, mention theatrical release or physical media.`;

    logger.info('OTT_AVAILABILITY', '📤 PERPLEXITY API REQUEST', {
      movieTitle,
      promptLength: prompt.length,
    });

    // Call Perplexity API
    const perplexity = new OpenAI({
      apiKey: PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    const perplexityStartTime = Date.now();
    const perplexityResponse = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides accurate streaming availability information for movies.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const perplexityDuration = Date.now() - perplexityStartTime;
    const rawResponse = perplexityResponse.choices[0]?.message?.content || '';

    logger.info('OTT_AVAILABILITY', '📥 PERPLEXITY API RESPONSE', {
      duration: `${perplexityDuration}ms`,
      responseLength: rawResponse.length,
      response: rawResponse.substring(0, 500),
    });

    // Parse the response
    const platforms: string[] = [];
    const costs: string[] = [];

    // Filter out international indicators
    const internationalKeywords = [
      'U.K.',
      'UK',
      'Germany',
      'France',
      'Australia',
      'Canada',
      'only)',
      'international',
    ];

    // Try to parse the response (format: - Platform: Cost)
    const lines = rawResponse.split('\n');
    for (const line of lines) {
      const match = line.match(/^[-•*]\s*([^:]+):\s*(.+)$/);
      if (match) {
        let platform = match[1].trim();
        const cost = match[2].trim();
        
        // Skip if it contains international keywords (except "only)" for USA)
        const hasInternational = internationalKeywords.some(keyword => {
          if (keyword === 'only)') {
            // Check if it's NOT "U.S. only" or "USA only"
            return line.includes('only)') && !line.toLowerCase().includes('u.s.') && !line.toLowerCase().includes('usa');
          }
          return line.includes(keyword) && !line.toLowerCase().includes('u.s.') && !line.toLowerCase().includes('usa');
        });
        
        if (hasInternational) {
          logger.info('OTT_AVAILABILITY', 'Skipping international platform', { platform, line });
          continue;
        }
        
        // Clean up platform name (remove markdown, parentheses with locations)
        platform = platform.replace(/\*\*/g, '').replace(/\(.*?\)/g, '').trim();
        
        platforms.push(platform);
        costs.push(cost);
      }
    }

    // If parsing failed, try alternative format (USA platforms only)
    if (platforms.length === 0) {
      // Try to extract common USA platform names
      const commonUSAPlatforms = [
        'Netflix',
        'Prime Video',
        'Amazon Prime',
        'Disney+',
        'Disney Plus',
        'Hulu',
        'Apple TV+',
        'Apple TV Plus',
        'HBO Max',
        'Max',
        'Paramount+',
        'Peacock',
        'YouTube',
        'Google Play',
        'iTunes',
        'Vudu',
        'Fandango',
        'Showtime',
        'Starz',
        'AMC+',
        'Crunchyroll',
      ];

      for (const platformName of commonUSAPlatforms) {
        const lowerResponse = rawResponse.toLowerCase();
        const lowerPlatform = platformName.toLowerCase();
        
        // Only add if platform is mentioned without international location tags
        if (lowerResponse.includes(lowerPlatform) && 
            !lowerResponse.includes(`${lowerPlatform} (uk`) &&
            !lowerResponse.includes(`${lowerPlatform} (germany`) &&
            !lowerResponse.includes(`${lowerPlatform} (france`) &&
            !lowerResponse.includes(`${lowerPlatform} (australia`)) {
          platforms.push(platformName);
          costs.push('Available - check platform for pricing');
        }
      }
    }

    logger.info('OTT_AVAILABILITY', '✅ Successfully parsed OTT data', {
      platformsFound: platforms.length,
      platforms,
      costs,
    });

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      platforms,
      costs,
      rawResponse,
      duration: totalDuration,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('OTT_AVAILABILITY', 'Error fetching OTT availability', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch OTT availability' },
      { status: 500 }
    );
  }
}

