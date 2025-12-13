#!/usr/bin/env node

/**
 * Script to populate the database with top movies from TMDB API
 * 
 * Fetches top 25 highly-rated and most voted movies for each language:
 * - English (en)
 * - Hindi (hi)
 * - Spanish (es)
 * - French (fr)
 * - Japanese (ja)
 * - Korean (ko)
 * - Chinese (zh)
 * - German (de)
 * - Italian (it)
 * - Portuguese (pt)
 * - Russian (ru)
 * - Arabic (ar)
 * 
 * Usage:
 *   node scripts/populate-movies.js
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

// Languages to fetch (ISO 639-1 codes)
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'ko', name: 'Korean' },
  { code: 'ja', name: 'Japanese' },
  { code: 'it', name: 'Italian' },
];

const MOVIES_PER_LANGUAGE = 25;

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
 * Fetch top movies for a specific language from TMDB
 * Combines best-rated and most popular movies
 */
async function fetchTopMoviesForLanguage(languageCode) {
  const allMovies = new Map(); // Use Map to avoid duplicates
  
  console.log(`  Fetching movies for ${languageCode}...`);
  
  // Fetch best-rated movies (high vote average)
  console.log(`    Fetching best-rated movies...`);
  let page = 1;
  let ratedCount = 0;
  while (ratedCount < 15 && page <= 3) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=7.0&with_original_language=${languageCode}&page=${page}`;
    
    try {
      const data = await httpsGet(url);
      
      if (data.results && data.results.length > 0) {
        data.results.forEach(movie => {
          if (!allMovies.has(movie.id)) {
            allMovies.set(movie.id, movie);
            ratedCount++;
          }
        });
        console.log(`      Page ${page}: Found ${data.results.length} movies (rated total: ${ratedCount})`);
      } else {
        break;
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`      Error fetching rated page ${page}:`, error.message);
      break;
    }
  }
  
  // Fetch most popular movies (high vote count)
  console.log(`    Fetching most popular movies...`);
  page = 1;
  let popularCount = 0;
  while (allMovies.size < MOVIES_PER_LANGUAGE && page <= 3) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=6.5&with_original_language=${languageCode}&page=${page}`;
    
    try {
      const data = await httpsGet(url);
      
      if (data.results && data.results.length > 0) {
        data.results.forEach(movie => {
          if (!allMovies.has(movie.id) && allMovies.size < MOVIES_PER_LANGUAGE) {
            allMovies.set(movie.id, movie);
            popularCount++;
          }
        });
        console.log(`      Page ${page}: Found ${data.results.length} movies (popular total: ${popularCount}, combined: ${allMovies.size})`);
      } else {
        break;
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`      Error fetching popular page ${page}:`, error.message);
      break;
    }
  }
  
  const movies = Array.from(allMovies.values());
  console.log(`  ✓ Total unique movies found: ${movies.length}`);
  
  return movies.slice(0, MOVIES_PER_LANGUAGE);
}

/**
 * Get detailed movie information including genres
 */
async function getMovieDetails(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
  
  try {
    const data = await httpsGet(url);
    return data;
  } catch (error) {
    console.error(`    Error fetching details for movie ${movieId}:`, error.message);
    return null;
  }
}

/**
 * Transform TMDB movie data to our database format
 */
function transformMovie(tmdbMovie, languageCode) {
  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title,
    originalTitle: tmdbMovie.original_title,
    overview: tmdbMovie.overview || '',
    posterPath: tmdbMovie.poster_path,
    backdropPath: tmdbMovie.backdrop_path,
    releaseDate: tmdbMovie.release_date || null,
    year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null,
    voteAverage: tmdbMovie.vote_average || 0,
    voteCount: tmdbMovie.vote_count || 0,
    popularity: tmdbMovie.popularity || 0,
    language: languageCode,
    genres: (tmdbMovie.genres || []).map(g => g.name),
    runtime: tmdbMovie.runtime || null,
    tagline: tmdbMovie.tagline || null,
    imdbRating: null, // Can be added later
    rtRating: null, // Can be added later
  };
}

/**
 * Main function to populate database
 */
async function populateMovies() {
  console.log('🎬 Starting movie population from TMDB API...\n');
  
  if (!TMDB_API_KEY) {
    console.error('❌ Error: TMDB_API_KEY not found in environment variables!');
    console.error('   Please add TMDB_API_KEY to your .env.local file.');
    console.error('   Get your API key from: https://www.themoviedb.org/settings/api');
    process.exit(1);
  }
  
  // Clear existing movies (optional - comment out to keep old data)
  console.log('🗑️  Clearing existing movies from database...');
  try {
    const deletedCount = await prisma.movie.deleteMany({});
    console.log(`   ✓ Deleted ${deletedCount.count} existing movies\n`);
  } catch (error) {
    console.error('   ⚠ Error clearing database:', error.message);
    console.log('   Continuing anyway...\n');
  }
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const language of LANGUAGES) {
    console.log(`\n📚 Processing ${language.name} (${language.code})...`);
    
    try {
      // Fetch top movies for this language
      const movies = await fetchTopMoviesForLanguage(language.code);
      console.log(`  ✓ Found ${movies.length} movies`);
      
      // Insert or update each movie
      for (const movie of movies) {
        try {
          // Get detailed info including genres
          const details = await getMovieDetails(movie.id);
          
          if (!details) {
            console.log(`  ⚠ Skipping movie ${movie.id} (no details)`);
            totalSkipped++;
            continue;
          }
          
          // Transform and upsert
          const movieData = transformMovie(details, language.code);
          
          await prisma.movie.upsert({
            where: { id: movieData.id },
            update: movieData,
            create: movieData,
          });
          
          console.log(`  ✓ Added: ${movieData.title} (${movieData.year}) - ⭐ ${movieData.voteAverage}`);
          totalAdded++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`  ❌ Error adding movie ${movie.id}:`, error.message);
          totalSkipped++;
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${language.name}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Movie population complete!');
  console.log(`   Total movies added/updated: ${totalAdded}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log('='.repeat(60) + '\n');
  
  // Show summary
  const counts = await Promise.all(
    LANGUAGES.map(async (lang) => {
      const count = await prisma.movie.count({ where: { language: lang.code } });
      return { language: lang.name, count };
    })
  );
  
  console.log('\n📊 Movies by Language:');
  console.log('-'.repeat(40));
  counts.forEach(({ language, count }) => {
    console.log(`  ${language.padEnd(15)} ${count} movies`);
  });
  console.log('-'.repeat(40));
  console.log(`  ${'TOTAL'.padEnd(15)} ${counts.reduce((sum, c) => sum + c.count, 0)} movies\n`);
}

// Run the script
populateMovies()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

