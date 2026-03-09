// Script to clear all projects and checkpoints from database
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { projects, checkpoints } from '../lib/schema.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...');
    console.log('Database URL:', process.env.TURSO_DATABASE_URL);
    
    // Delete all checkpoints first (foreign key constraint)
    console.log('\nDeleting checkpoints...');
    await db.delete(checkpoints);
    console.log('✅ Checkpoints deleted');
    
    // Delete all projects
    console.log('\nDeleting projects...');
    await db.delete(projects);
    console.log('✅ Projects deleted');
    
    console.log('\n🎉 Database cleared successfully!');
    console.log('\n💡 Now also clear your browser cache:');
    console.log('   1. Open DevTools (F12)');
    console.log('   2. Go to Application > Local Storage > http://localhost:3000');
    console.log('   3. Right-click > Clear');
    console.log('   4. Refresh the page');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
