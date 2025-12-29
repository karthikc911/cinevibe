const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMovies() {
  console.log('\n🔍 Checking movie data in database...\n');
  
  // Check The Matrix
  const matrix = await prisma.movie.findFirst({
    where: { title: { contains: 'Matrix', mode: 'insensitive' } }
  });
  
  if (matrix) {
    console.log('📽️ THE MATRIX (Movie):');
    console.log('  ID:', matrix.id);
    console.log('  Title:', matrix.title);
    console.log('  Language:', matrix.language);
    console.log('  Year:', matrix.year);
    console.log('  Poster:', matrix.posterPath?.substring(0, 50));
    console.log('');
  } else {
    console.log('❌ The Matrix not found in Movie table');
  }
  
  // Check for Paatal Lok in movies
  const paatalMovie = await prisma.movie.findFirst({
    where: { title: { contains: 'Paatal', mode: 'insensitive' } }
  });
  
  if (paatalMovie) {
    console.log('⚠️ PAATAL LOK (Found in MOVIES - WRONG!):');
    console.log('  ID:', paatalMovie.id);
    console.log('  Title:', paatalMovie.title);
    console.log('  Language:', paatalMovie.language);
    console.log('');
  }
  
  // Check for Paatal Lok in TV shows
  const paatalTV = await prisma.tvShow.findFirst({
    where: { name: { contains: 'Paatal', mode: 'insensitive' } }
  });
  
  if (paatalTV) {
    console.log('📺 PAATAL LOK (TV Show - Correct):');
    console.log('  ID:', paatalTV.id);
    console.log('  Name:', paatalTV.name);
    console.log('  Language:', paatalTV.language);
    console.log('');
  } else {
    console.log('❌ Paatal Lok not found in TV Shows table');
  }
  
  // Check watchlist
  const watchlistItems = await prisma.watchlistItem.findMany({
    take: 20,
    orderBy: { addedAt: 'desc' }
  });
  
  console.log('\n📋 WATCHLIST ITEMS:');
  for (const item of watchlistItems) {
    console.log(`  - ID: ${item.movieId}, Title: ${item.movieTitle}`);
  }
  
  // Check TV show watchlist
  const tvWatchlist = await prisma.tvShowWatchlistItem.findMany({
    take: 10,
    orderBy: { addedAt: 'desc' }
  });
  
  console.log('\n📺 TV SHOW WATCHLIST:');
  for (const item of tvWatchlist) {
    console.log(`  - ID: ${item.tvShowId}, Name: ${item.tvShowName}`);
  }
  
  await prisma.$disconnect();
}

checkMovies().catch(console.error);
