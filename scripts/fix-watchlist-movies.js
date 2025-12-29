const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function searchTMDB(title, year) {
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results?.[0];
}

async function fetchTMDBDetails(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function fixWatchlistMovies() {
  console.log('\n🔧 Fixing watchlist movies with incorrect data...\n');
  
  const watchlistItems = await prisma.watchlistItem.findMany();
  console.log(`Found ${watchlistItems.length} watchlist items\n`);
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const item of watchlistItems) {
    // Check if movie exists and matches
    const movie = await prisma.movie.findUnique({
      where: { id: item.movieId }
    });
    
    const dbTitle = movie?.title?.toLowerCase()?.trim();
    const expectedTitle = item.movieTitle?.toLowerCase()?.trim();
    
    // Check if titles match
    const titlesMatch = dbTitle === expectedTitle || 
      dbTitle?.includes(expectedTitle) || 
      expectedTitle?.includes(dbTitle);
    
    if (!titlesMatch) {
      console.log(`❌ Mismatch: ID ${item.movieId}`);
      console.log(`   Expected: "${item.movieTitle}"`);
      console.log(`   Got: "${movie?.title || 'NOT FOUND'}"`);
      
      // Search TMDB for correct movie
      try {
        const tmdbMovie = await searchTMDB(item.movieTitle, item.movieYear);
        
        if (tmdbMovie) {
          console.log(`   ✅ Found: "${tmdbMovie.title}" (ID: ${tmdbMovie.id}, Lang: ${tmdbMovie.original_language})`);
          
          // Fetch full details
          const details = await fetchTMDBDetails(tmdbMovie.id);
          
          // Update or create movie
          await prisma.movie.upsert({
            where: { id: tmdbMovie.id },
            create: {
              id: tmdbMovie.id,
              title: tmdbMovie.title,
              originalTitle: tmdbMovie.original_title,
              overview: tmdbMovie.overview,
              posterPath: tmdbMovie.poster_path,
              backdropPath: tmdbMovie.backdrop_path,
              releaseDate: tmdbMovie.release_date || null,
              year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
              voteAverage: tmdbMovie.vote_average || 0,
              voteCount: tmdbMovie.vote_count || 0,
              popularity: tmdbMovie.popularity || 0,
              language: tmdbMovie.original_language || 'en',
              genres: details.genres?.map(g => g.name) || [],
              runtime: details.runtime,
              tagline: details.tagline,
            },
            update: {
              title: tmdbMovie.title,
              posterPath: tmdbMovie.poster_path,
              language: tmdbMovie.original_language,
            },
          });
          
          // Update watchlist item with correct ID
          await prisma.watchlistItem.update({
            where: { id: item.id },
            data: {
              movieId: tmdbMovie.id,
              movieTitle: tmdbMovie.title,
            },
          });
          
          fixedCount++;
          console.log(`   ✅ Fixed!`);
        } else {
          console.log(`   ⚠️ Not found on TMDB`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
      
      console.log('');
    }
  }
  
  console.log(`\n✅ Done! Fixed: ${fixedCount}, Errors: ${errorCount}`);
  await prisma.$disconnect();
}

fixWatchlistMovies().catch(console.error);
