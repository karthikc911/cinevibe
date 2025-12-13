/**
 * Diagnostic Script: Identify Movies with Invalid Poster Paths
 * 
 * This script scans the database for movies with poster paths that won't load correctly:
 * - Custom paths (e.g., "poster15.jpg", "poster_movie_2023.jpg")
 * - Empty/null paths
 * - Invalid TMDB paths
 * 
 * Usage: npx ts-node scripts/diagnose-posters.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PosterDiagnostic {
  movieId: number;
  title: string;
  year: number | null;
  language: string;
  posterPath: string | null;
  issue: string;
  suggestedFix: string;
}

async function diagnosePosters() {
  console.log('🔍 Starting Poster Path Diagnostic...\n');
  
  try {
    // Get all movies
    const allMovies = await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        language: true,
        posterPath: true,
      },
      orderBy: { id: 'asc' },
    });

    console.log(`📊 Total movies in database: ${allMovies.length}\n`);

    const issues: PosterDiagnostic[] = [];
    let validPosters = 0;
    let invalidPosters = 0;
    let missingPosters = 0;

    for (const movie of allMovies) {
      const posterPath = movie.posterPath;

      // Case 1: No poster path
      if (!posterPath) {
        missingPosters++;
        issues.push({
          movieId: movie.id,
          title: movie.title,
          year: movie.year,
          language: movie.language,
          posterPath: null,
          issue: 'MISSING - No poster path in database',
          suggestedFix: 'Fetch from TMDB API using movie title and year',
        });
        continue;
      }

      // Case 2: Already a full URL (valid)
      if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
        validPosters++;
        continue;
      }

      // Case 3: TMDB path format (valid - starts with /)
      if (posterPath.startsWith('/')) {
        validPosters++;
        continue;
      }

      // Case 4: Custom/Invalid path (doesn't start with / or http)
      invalidPosters++;
      issues.push({
        movieId: movie.id,
        title: movie.title,
        year: movie.year,
        language: movie.language,
        posterPath: posterPath,
        issue: 'INVALID - Custom path (not TMDB format)',
        suggestedFix: `Search TMDB for "${movie.title} ${movie.year}" and update posterPath`,
      });
    }

    // Print summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 POSTER PATH SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Valid Posters:   ${validPosters} (${((validPosters / allMovies.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Invalid Posters: ${invalidPosters} (${((invalidPosters / allMovies.length) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Missing Posters: ${missingPosters} (${((missingPosters / allMovies.length) * 100).toFixed(1)}%)`);
    console.log(`📋 Total Issues:    ${issues.length}\n`);

    if (issues.length === 0) {
      console.log('🎉 All movies have valid poster paths!\n');
      return;
    }

    // Print detailed issues
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DETAILED ISSUES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.title} (${issue.year || 'Unknown Year'})`);
      console.log(`   Movie ID: ${issue.movieId}`);
      console.log(`   Language: ${issue.language}`);
      console.log(`   Poster Path: ${issue.posterPath || 'NULL'}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Fix: ${issue.suggestedFix}`);
      console.log('');
    });

    // Generate SQL fix script
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛠️  SQL FIX SCRIPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('-- Set invalid poster paths to NULL so fallback will show:');
    console.log('-- Then you can manually update them with correct TMDB paths\n');

    const invalidMovieIds = issues
      .filter(i => i.posterPath !== null)
      .map(i => i.movieId)
      .join(', ');

    if (invalidMovieIds) {
      console.log(`UPDATE "Movie" SET "posterPath" = NULL WHERE id IN (${invalidMovieIds});\n`);
    }

    console.log('-- Individual movie IDs with issues:');
    issues.forEach(issue => {
      console.log(`-- Movie ID ${issue.movieId}: ${issue.title} (${issue.year || 'N/A'})`);
    });
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnosePosters().catch(console.error);

