import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;
  
  try {
    const { uri, dbName } = await request.json();

    if (!uri) {
      return NextResponse.json(
        { error: 'Connection URI is required' },
        { status: 400 }
      );
    }

    console.log('[MongoDB Test] Testing connection...');

    // Try to connect with short timeout
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    
    // If dbName provided, verify it exists
    let databases: string[] = [];
    let collections: string[] = [];

    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    databases = dbList.databases.map((db) => db.name);

    if (dbName) {
      const db = client.db(dbName);
      const collectionList = await db.listCollections().toArray();
      collections = collectionList.map((c) => c.name);
    }

    console.log('[MongoDB Test] Connection successful!');

    return NextResponse.json({
      success: true,
      connected: true,
      databases,
      collections,
      message: 'Connection successful!',
    });

  } catch (error) {
    console.error('[MongoDB Test] Connection failed:', error);
    
    let errorMessage = 'Connection failed';
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Host not found. Check your connection string.';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Check your credentials.';
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timeout. Check network/firewall.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      connected: false,
      error: errorMessage,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
