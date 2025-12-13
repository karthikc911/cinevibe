#!/usr/bin/env node

/**
 * Script to populate the database with top TV shows from TMDB API
 * 
 * Fetches top TV shows for:
 * - English (en): Top 200 TV shows
 * - Hindi (hi): Top 100 TV shows
 * 
 * Usage:
 *   node scripts/populate-tvshows.js
 *   
 * Environment:
 *   Requires TMDB_API_KEY in .env.local or .env
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Configuration
const LANGUAGE_CONFIG = [
  { code: 'en', name: 'English', count: 200 },
  { code: 'hi', name: 'Hindi', count: 100 },
];

// Helper function to make HTTPS requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch top TV shows for a specific language from TMDB
 */
async function fetchTopTvShowsForLanguage(languageCode, targetCount) {
  const allShows = new Map(); // Use Map to avoid duplicates
  
  console.log(`  Fetching ${targetCount} TV shows for ${languageCode}...`);
  
  // Fetch best-rated TV shows (high vote average)
  console.log(`    Fetching best-rated TV shows...`);
  let page = 1;
  let ratedCount = 0;
  const ratedTarget = Math.floor(targetCount * 0.6); // 60% from best-rated
  
  while (ratedCount < ratedTarget && page <= 10) {
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en&sort_by=vote_average.desc&vote_count.gte=50&vote_average.gte=7.0&with_original_language=${languageCode}&page=${page}`;
    
    try {
      const data = await httpsGet(url);
      
      if (data.results && data.results.length > 0) {
        data.results.forEach(show => {
          if (!allShows.has(show.id) && ratedCount < ratedTarget) {
            allShows.set(show.id, show);
            ratedCount++;
          }
        });
        console.log(`      Page ${page}: Found ${data.results.length} shows (rated total: ${ratedCount})`);
      } else {
        break;
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`      Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  // Fetch most popular TV shows
  console.log(`    Fetching most popular TV shows...`);
  page = 1;
  let popularCount = 0;
  const popularTarget = targetCount - ratedCount; // Remaining from popular
  
  while (popularCount < popularTarget && page <= 10) {
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en&sort_by=popularity.desc&with_original_language=${languageCode}&page=${page}`;
    
    try {
      const data = await httpsGet(url);
      
      if (data.results && data.results.length > 0) {
        data.results.forEach(show => {
          if (!allShows.has(show.id) && popularCount < popularTarget) {
            allShows.set(show.id, show);
            popularCount++;
          }
        });
        console.log(`      Page ${page}: Found ${data.results.length} shows (popular total: ${popularCount})`);
      } else {
        break;
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`      Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  console.log(`  ✓ Total unique shows for ${languageCode}: ${allShows.size}`);
  return Array.from(allShows.values());
}

/**
 * Fetch detailed information for a TV show
 */
async function fetchTvShowDetails(tvShowId) {
  const url = `${TMDB_BASE_URL}/tv/${tvShowId}?api_key=${TMDB_API_KEY}&language=en`;
  
  try {
    return await httpsGet(url);
  } catch (error) {
    console.error(`    Error fetching details for show ${tvShowId}:`, error.message);
    return null;
  }
}

/**
 * Transform TMDB TV show data to our database schema
 */
function transformTvShowData(basicShow, detailedShow) {
  const show = detailedShow || basicShow;
  
  return {
    id: show.id,
    name: show.name,
    originalName: show.original_name,
    overview: show.overview || null,
    posterPath: show.poster_path || null,
    backdropPath: show.backdrop_path || null,
    firstAirDate: show.first_air_date || null,
    year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
    voteAverage: show.vote_average || null,
    voteCount: show.vote_count || null,
    popularity: show.popularity || null,
    language: show.original_language,
    genres: (show.genres || []).map(g => g.name || g),
    numberOfSeasons: detailedShow?.number_of_seasons || null,
    numberOfEpisodes: detailedShow?.number_of_episodes || null,
    episodeRunTime: detailedShow?.episode_run_time || [],
    status: detailedShow?.status || null,
    tagline: detailedShow?.tagline || null,
    imdbRating: null, // Can be enriched later
    imdbVoterCount: null,
    userReviewSummary: null,
    rtRating: null,
  };
}

/**
 * Save TV shows to database
 */
async function saveTvShows(shows, languageCode) {
  console.log(`  Saving ${shows.length} shows for ${languageCode} to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < shows.length; i++) {
    const basicShow = shows[i];
    
    try {
      // Fetch detailed information (with rate limiting)
      if (i > 0 && i % 10 === 0) {
        console.log(`    Progress: ${i}/${shows.length} shows processed...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const detailedShow = await fetchTvShowDetails(basicShow.id);
      await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
      
      const showData = transformTvShowData(basicShow, detailedShow);
      
      // Upsert (update if exists, create if not)
      await prisma.tvShow.upsert({
        where: { id: showData.id },
        update: showData,
        create: showData,
      });
      
      // Check if it was an update or create
      const existing = await prisma.tvShow.findUnique({ where: { id: showData.id } });
      if (existing) {
        updatedCount++;
      } else {
        savedCount++;
      }
      
    } catch (error) {
      console.error(`    Error saving show ${basicShow.id} (${basicShow.name}):`, error.message);
      skippedCount++;
    }
  }
  
  console.log(`  ✓ Completed for ${languageCode}:`);
  console.log(`    - New shows saved: ${savedCount}`);
  console.log(`    - Existing shows updated: ${updatedCount}`);
  console.log(`    - Skipped (errors): ${skippedCount}`);
  
  return { savedCount, updatedCount, skippedCount };
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('TV SHOW DATABASE POPULATION SCRIPT');
  console.log('='.repeat(70));
  console.log();
  
  if (!TMDB_API_KEY) {
    console.error('❌ Error: TMDB_API_KEY not found in environment variables');
    console.error('Please set TMDB_API_KEY in your .env.local or .env file');
    process.exit(1);
  }
  
  console.log('Configuration:');
  LANGUAGE_CONFIG.forEach(({ code, name, count }) => {
    console.log(`  - ${name} (${code}): ${count} TV shows`);
  });
  console.log();
  
  let totalSaved = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  // Process each language
  for (const { code, name, count } of LANGUAGE_CONFIG) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Processing ${name.toUpperCase()} (${code})`);
    console.log('='.repeat(70));
    
    try {
      // Fetch TV shows
      const shows = await fetchTopTvShowsForLanguage(code, count);
      
      if (shows.length === 0) {
        console.log(`  ⚠️  No shows found for ${name}`);
        continue;
      }
      
      // Save to database
      const { savedCount, updatedCount, skippedCount } = await saveTvShows(shows, code);
      
      totalSaved += savedCount;
      totalUpdated += updatedCount;
      totalSkipped += skippedCount;
      
    } catch (error) {
      console.error(`\n❌ Error processing ${name}:`, error.message);
      console.error(error.stack);
    }
    
    // Rate limiting between languages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total new shows saved: ${totalSaved}`);
  console.log(`Total shows updated: ${totalUpdated}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`\n✓ Database population complete!`);
}

// Run the script
main()
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

