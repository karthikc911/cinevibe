const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWrongMovies() {
  console.log('\n🔍 Checking potentially wrong movie data...\n');
  
  // Check specific IDs from watchlist that look wrong
  const suspectIds = [68421, 245703, 129552, 15621, 688, 80307, 603];
  
  for (const id of suspectIds) {
    const movie = await prisma.movie.findUnique({
      where: { id }
    });
    
    if (movie) {
      console.log(`📽️ Movie ID ${id}:`);
      console.log(`  Title: ${movie.title}`);
      console.log(`  Language: ${movie.language}`);
      console.log(`  Year: ${movie.year}`);
      console.log(`  Poster: ${movie.posterPath?.substring(0, 40) || 'NONE'}`);
      console.log('');
    } else {
      console.log(`❌ Movie ID ${id}: NOT FOUND in database\n`);
    }
  }
  
  // Find movies with ID 1000000000+ (likely manually added)
  const manualMovies = await prisma.movie.findMany({
    where: { id: { gte: 1000000000 } },
    take: 10
  });
  
  if (manualMovies.length > 0) {
    console.log('\n⚠️ MANUALLY ADDED MOVIES (ID >= 1000000000):');
    for (const m of manualMovies) {
      console.log(`  - ID: ${m.id}, Title: ${m.title}, Lang: ${m.language}`);
    }
  }
  
  await prisma.$disconnect();
}

checkWrongMovies().catch(console.error);
