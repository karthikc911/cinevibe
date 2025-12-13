#!/usr/bin/env node

/**
 * CineMate Setup Wizard
 * 
 * Interactive setup script that guides you through:
 * - Database configuration
 * - OAuth setup
 * - OpenAI API keys
 * - Environment file generation
 * - Database migrations
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function banner() {
  console.clear();
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🎬  CineMate Backend Setup Wizard', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

async function setupDatabase() {
  log('\n📦 Database Configuration\n', 'blue');
  
  log('Choose your database option:', 'bright');
  log('  1. Local PostgreSQL');
  log('  2. Supabase (cloud)');
  log('  3. Vercel Postgres');
  log('  4. Custom PostgreSQL URL');
  
  const choice = await question('\nEnter choice (1-4): ');
  
  let databaseUrl = '';
  
  switch (choice.trim()) {
    case '1':
      log('\n📝 Local PostgreSQL Setup\n', 'dim');
      const dbName = await question('Database name (default: cinemate): ') || 'cinemate';
      const dbUser = await question('Database user (default: postgres): ') || 'postgres';
      const dbPass = await question('Database password (leave empty if none): ');
      const dbHost = await question('Database host (default: localhost): ') || 'localhost';
      const dbPort = await question('Database port (default: 5432): ') || '5432';
      
      if (dbPass) {
        databaseUrl = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?schema=public`;
      } else {
        databaseUrl = `postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}?schema=public`;
      }
      break;
      
    case '2':
      log('\n☁️  Supabase Setup\n', 'dim');
      log('Get your connection string from: https://app.supabase.com/project/_/settings/database', 'dim');
      databaseUrl = await question('Paste Supabase connection string: ');
      
      // Ensure pgvector is enabled
      log('\n⚠️  Important: Enable pgvector extension in Supabase:', 'yellow');
      log('   1. Go to Database > Extensions in Supabase dashboard', 'dim');
      log('   2. Search for "vector" and enable it\n', 'dim');
      await question('Press Enter when you\'ve enabled pgvector...');
      break;
      
    case '3':
      log('\n▲ Vercel Postgres Setup\n', 'dim');
      log('Note: You\'ll need to deploy to Vercel first and add Postgres from the dashboard.', 'dim');
      databaseUrl = await question('Paste Vercel Postgres connection string: ');
      break;
      
    case '4':
      databaseUrl = await question('Enter PostgreSQL connection URL: ');
      break;
      
    default:
      log('Invalid choice. Using local PostgreSQL default.', 'yellow');
      databaseUrl = 'postgresql://postgres@localhost:5432/cinemate?schema=public';
  }
  
  return databaseUrl;
}

async function setupAuth() {
  log('\n🔐 Authentication Setup (NextAuth + Google OAuth)\n', 'blue');
  
  log('To get Google OAuth credentials:', 'dim');
  log('  1. Go to https://console.cloud.google.com/', 'dim');
  log('  2. Create/select project → APIs & Services → Credentials', 'dim');
  log('  3. Create OAuth 2.0 Client ID', 'dim');
  log('  4. Add redirect URI: http://localhost:3000/api/auth/callback/google\n', 'dim');
  
  const hasCredentials = await question('Do you have Google OAuth credentials? (y/n): ');
  
  let googleClientId = '';
  let googleClientSecret = '';
  
  if (hasCredentials.toLowerCase() === 'y') {
    googleClientId = await question('Google Client ID: ');
    googleClientSecret = await question('Google Client Secret: ');
  } else {
    log('⚠️  Using placeholder values. You\'ll need to update these later.', 'yellow');
    googleClientId = 'YOUR_GOOGLE_CLIENT_ID';
    googleClientSecret = 'YOUR_GOOGLE_CLIENT_SECRET';
  }
  
  // Generate NextAuth secret
  log('\nGenerating NextAuth secret...', 'dim');
  let nextAuthSecret = '';
  try {
    const { stdout } = await execPromise('openssl rand -base64 32');
    nextAuthSecret = stdout.trim();
    log('✓ NextAuth secret generated', 'green');
  } catch (error) {
    log('⚠️  Could not generate secret automatically. Using fallback.', 'yellow');
    nextAuthSecret = 'PLEASE_REPLACE_WITH_openssl_rand_base64_32';
  }
  
  const nextAuthUrl = await question('NextAuth URL (default: http://localhost:3000): ') || 'http://localhost:3000';
  
  return {
    googleClientId,
    googleClientSecret,
    nextAuthSecret,
    nextAuthUrl
  };
}

async function setupOpenAI() {
  log('\n🤖 OpenAI API Setup\n', 'blue');
  
  log('To get an OpenAI API key:', 'dim');
  log('  1. Go to https://platform.openai.com/', 'dim');
  log('  2. Sign in → API keys → Create new secret key', 'dim');
  log('  3. Note: You\'ll need billing set up ($5-10 covers typical usage)\n', 'dim');
  
  const hasKey = await question('Do you have an OpenAI API key? (y/n): ');
  
  let openaiKey = '';
  
  if (hasKey.toLowerCase() === 'y') {
    openaiKey = await question('OpenAI API Key: ');
  } else {
    log('⚠️  Using placeholder. You\'ll need to add your API key later.', 'yellow');
    openaiKey = 'sk-YOUR_OPENAI_API_KEY_HERE';
  }
  
  return openaiKey;
}

async function generateEnvFile(config) {
  const envPath = path.join(process.cwd(), '.env.local');
  
  const envContent = `# CineMate Backend Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE_URL="${config.databaseUrl}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NextAuth Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXTAUTH_URL="${config.nextAuthUrl}"
NEXTAUTH_SECRET="${config.nextAuthSecret}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Google OAuth Configuration
# Get from: https://console.cloud.google.com/
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOOGLE_CLIENT_ID="${config.googleClientId}"
GOOGLE_CLIENT_SECRET="${config.googleClientSecret}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OpenAI API Configuration
# Get from: https://platform.openai.com/api-keys
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPENAI_API_KEY="${config.openaiKey}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Optional: Additional Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Enable detailed Prisma query logging (development only)
# DEBUG=prisma:*

# OpenAI Model (default: gpt-4-turbo-preview)
# OPENAI_MODEL=gpt-4-turbo-preview

# Vector embedding dimension (default: 1536 for text-embedding-3-small)
# EMBEDDING_DIMENSION=1536
`;

  fs.writeFileSync(envPath, envContent);
  log(`\n✓ Environment file created: ${envPath}`, 'green');
}

async function runMigrations() {
  log('\n📊 Database Setup\n', 'blue');
  
  const runNow = await question('Run database migrations now? (y/n): ');
  
  if (runNow.toLowerCase() === 'y') {
    try {
      log('\nGenerating Prisma Client...', 'dim');
      await execPromise('npx prisma generate');
      log('✓ Prisma Client generated', 'green');
      
      log('\nRunning database migrations...', 'dim');
      await execPromise('npx prisma migrate dev --name init');
      log('✓ Database migrations completed', 'green');
      
      log('\nEnabling pgvector extension...', 'dim');
      const vectorSql = fs.readFileSync(
        path.join(process.cwd(), 'prisma/migrations/enable_pgvector.sql'),
        'utf8'
      );
      log('⚠️  Run this SQL manually in your database:\n', 'yellow');
      log(vectorSql, 'dim');
      
    } catch (error) {
      log(`\n⚠️  Migration failed: ${error.message}`, 'red');
      log('You can run migrations manually later with: npx prisma migrate dev', 'dim');
    }
  } else {
    log('\n⚠️  Remember to run migrations later:', 'yellow');
    log('  npx prisma generate', 'dim');
    log('  npx prisma migrate dev --name init', 'dim');
  }
}

async function showNextSteps(config) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('✨ Setup Complete!', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  
  log('\n📋 Next Steps:\n', 'blue');
  
  if (config.googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
    log('⚠️  1. Update Google OAuth credentials in .env.local', 'yellow');
  }
  
  if (config.openaiKey.includes('YOUR_OPENAI_API_KEY')) {
    log('⚠️  2. Update OpenAI API key in .env.local', 'yellow');
  }
  
  log('3. Start the development server:', 'bright');
  log('   npm run dev\n', 'dim');
  
  log('4. Open your browser:', 'bright');
  log('   http://localhost:3000\n', 'dim');
  
  log('5. View your database:', 'bright');
  log('   npx prisma studio\n', 'dim');
  
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📚 For more information, see:', 'blue');
  log('   - README.md', 'dim');
  log('   - BACKEND_SETUP.md', 'dim');
  log('   - COMPLETE_CONFIG_GUIDE.md', 'dim');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

async function main() {
  try {
    banner();
    
    log('This wizard will help you set up CineMate backend.\n', 'dim');
    log('You\'ll need:', 'bright');
    log('  • PostgreSQL database (local or cloud)');
    log('  • Google OAuth credentials (optional for now)');
    log('  • OpenAI API key (optional for now)\n');
    
    const proceed = await question('Ready to begin? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      log('\n👋 Setup cancelled. Run this script again when ready!', 'yellow');
      rl.close();
      return;
    }
    
    // Gather configuration
    const databaseUrl = await setupDatabase();
    const auth = await setupAuth();
    const openaiKey = await setupOpenAI();
    
    const config = {
      databaseUrl,
      ...auth,
      openaiKey
    };
    
    // Generate .env.local
    await generateEnvFile(config);
    
    // Run migrations
    await runMigrations();
    
    // Show next steps
    await showNextSteps(config);
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    log('\nPlease check the error and try again.', 'dim');
  } finally {
    rl.close();
  }
}

// Run the wizard
main();

