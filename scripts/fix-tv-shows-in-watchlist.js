const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Known TV shows that might be in movie watchlist
const knownTVShows = [
  'Paatal Lok', 'Better Call Saul', 'Planet Earth III', 'The Good Doctor',
  'Young Sheldon', 'The Family Man', 'The West Wing', 'The Newsroom',
  'The Night Agent', 'Bodyguard', 'Altered Carbon', 'Special Ops',
  'Breathe', 'Dept. Q'
];

async function searchTMDBTV(title) {
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results?.[0];
}

async function fixTVShowsInWatchlist() {
  console.log('\n📺 Moving TV shows from movie watchlist to TV show watchlist...\n');
  
  const watchlistItems = await prisma.watchlistItem.findMany();
  console.log(`Found ${watchlistItems.length} movie watchlist items\n`);
  
  let movedCount = 0;
  
  for (const item of watchlistItems) {
    // Check if this is a TV show
    const isTV = knownTVShows.some(tv => 
      item.movieTitle?.toLowerCase().includes(tv.toLowerCase())
    );
    
    if (isTV) {
      console.log(`📺 Found TV show in movie watchlist: "${item.movieTitle}"`);
      
      try {
        // Search TMDB for TV show
        const tvShow = await searchTMDBTV(item.movieTitle);
        
        if (tvShow) {
          console.log(`   ✅ Found on TMDB: "${tvShow.name}" (ID: ${tvShow.id}, Lang: ${tvShow.original_language})`);
          
          // Create or update TV show in database
          await prisma.tvShow.upsert({
            where: { id: tvShow.id },
            create: {
              id: tvShow.id,
              name: tvShow.name,
              originalName: tvShow.original_name,
              overview: tvShow.overview,
              posterPath: tvShow.poster_path,
              backdropPath: tvShow.backdrop_path,
              firstAirDate: tvShow.first_air_date,
              voteAverage: tvShow.vote_average || 0,
              voteCount: tvShow.vote_count || 0,
              popularity: tvShow.popularity || 0,
              language: tvShow.original_language || 'en',
              genres: [],
            },
            update: {
              name: tvShow.name,
              posterPath: tvShow.poster_path,
              language: tvShow.original_language,
            },
          });
          
          // Check if already in TV show watchlist
          const existingTV = await prisma.tvShowWatchlistItem.findFirst({
            where: { tvShowId: tvShow.id, userId: item.userId }
          });
          
          if (!existingTV) {
            // Parse year as integer
            const yearStr = tvShow.first_air_date?.split('-')[0];
            const yearInt = yearStr ? parseInt(yearStr, 10) : null;
            
            // Add to TV show watchlist
            await prisma.tvShowWatchlistItem.create({
              data: {
                userId: item.userId,
                tvShowId: tvShow.id,
                tvShowName: tvShow.name,
                tvShowYear: yearInt,
                addedAt: item.addedAt,
              },
            });
            console.log(`   ✅ Added to TV show watchlist`);
          } else {
            console.log(`   ℹ️ Already in TV show watchlist`);
          }
          
          // Remove from movie watchlist
          await prisma.watchlistItem.delete({
            where: { id: item.id }
          });
          console.log(`   ✅ Removed from movie watchlist`);
          
          movedCount++;
        } else {
          console.log(`   ⚠️ Not found on TMDB TV`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }
  
  console.log(`\n✅ Done! Moved ${movedCount} TV shows to correct watchlist`);
  await prisma.$disconnect();
}

fixTVShowsInWatchlist().catch(console.error);
