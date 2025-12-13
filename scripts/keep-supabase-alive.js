#!/usr/bin/env node

/**
 * Keep Supabase Database Active
 * 
 * Supabase pauses databases after 7 days of inactivity.
 * Run this script periodically to keep your database active.
 * 
 * Usage:
 *   node scripts/keep-supabase-alive.js
 *   npm run db:ping
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function pingDatabase() {
  try {
    console.log('🏓 Pinging Supabase database...');
    
    // Execute a simple query to keep connection alive
    const result = await prisma.$queryRaw`SELECT 1 as ping, NOW() as timestamp`;
    
    console.log('✅ Database is active!');
    console.log('📊 Response:', result);
    console.log('⏰ Last pinged:', new Date().toISOString());
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to ping database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

pingDatabase();

