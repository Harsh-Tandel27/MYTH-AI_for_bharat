// Script to clear all projects and checkpoints from database
const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const { projects, checkpoints } = require('../lib/schema');
require('dotenv').config();

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
    console.log('\n💡 Now also clear your browser localStorage:');
    console.log('   1. Open DevTools (F12)');
    console.log('   2. Go to Application > Local Storage');
    console.log('   3. Delete "promptai-session"');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
