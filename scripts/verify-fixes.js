const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFixes() {
  console.log('\n✅ VERIFICATION REPORT\n');
  
  // Check The Matrix
  const matrix = await prisma.movie.findUnique({
    where: { id: 603 }
  });
  
  console.log('📽️ THE MATRIX:');
  if (matrix) {
    console.log(`   ID: ${matrix.id}`);
    console.log(`   Title: ${matrix.title}`);
    console.log(`   Language: ${matrix.language}`);
    console.log(`   Year: ${matrix.year}`);
    console.log(`   Status: ✅ CORRECT`);
  } else {
    console.log(`   ❌ Not found in database`);
  }
  
  // Check if Matrix is in watchlist
  const matrixInWatchlist = await prisma.watchlistItem.findFirst({
    where: { movieTitle: { contains: 'Matrix', mode: 'insensitive' } }
  });
  
  if (matrixInWatchlist) {
    console.log(`   In Watchlist: Yes (ID: ${matrixInWatchlist.movieId})`);
  }
  
  console.log('\n📺 TV SHOWS (Now in correct table):');
  const tvShows = await prisma.tvShowWatchlistItem.findMany({
    take: 15,
    orderBy: { addedAt: 'desc' }
  });
  
  for (const item of tvShows) {
    const show = await prisma.tvShow.findUnique({ where: { id: item.tvShowId } });
    console.log(`   - ${item.tvShowName} (ID: ${item.tvShowId}, Lang: ${show?.language || 'unknown'})`);
  }
  
  console.log('\n📽️ MOVIES (Remaining in movie watchlist):');
  const movies = await prisma.watchlistItem.findMany({
    take: 15,
    orderBy: { addedAt: 'desc' }
  });
  
  for (const item of movies) {
    const movie = await prisma.movie.findUnique({ where: { id: item.movieId } });
    console.log(`   - ${item.movieTitle} (ID: ${item.movieId}, Lang: ${movie?.language || 'unknown'})`);
  }
  
  await prisma.$disconnect();
}

verifyFixes().catch(console.error);
