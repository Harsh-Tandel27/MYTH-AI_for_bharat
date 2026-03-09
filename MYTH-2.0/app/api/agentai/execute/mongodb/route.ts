import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { resolveVariables } from '@/app/agentai/lib/variable-resolver';
import { type ExecutionContext } from '@/app/agentai/lib/node-schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;
  
  try {
    const { 
      uri, 
      dbName, 
      collectionName, 
      operation, 
      query,
      data,
      context 
    } = await request.json();

    if (!uri || !dbName || !collectionName) {
      return NextResponse.json(
        { error: 'Missing required fields: uri, dbName, collectionName' },
        { status: 400 }
      );
    }

    // Resolve any variables in the query/data
    const executionContext: ExecutionContext = context || {};
    let resolvedQuery = query ? resolveVariables(query, executionContext) : '{}';
    let resolvedData = data ? resolveVariables(data, executionContext) : null;

    console.log('[MongoDB] Resolved data:', resolvedData?.substring?.(0, 200) || resolvedData);

    // Parse JSON strings
    let parsedQuery: Record<string, unknown> = {};
    let parsedData: Record<string, unknown> | null = null;

    try {
      parsedQuery = JSON.parse(resolvedQuery);
    } catch {
      console.warn('[MongoDB] Invalid query JSON, using empty object');
    }

    if (resolvedData) {
      try {
        // Try to parse as JSON first
        parsedData = JSON.parse(resolvedData);
      } catch {
        // If not valid JSON, wrap the raw string in a proper document
        console.log('[MongoDB] Data is not JSON, wrapping in document object');
        parsedData = {
          content: resolvedData,
          type: 'text',
          createdAt: new Date().toISOString(),
        };
      }
    }

    console.log(`[MongoDB] Connecting to database: ${dbName}`);
    console.log(`[MongoDB] Collection: ${collectionName}, Operation: ${operation}`);

    // Connect to user's MongoDB
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let result: unknown;
    let affectedCount = 0;

    switch (operation) {
      case 'insert':
        console.log('[MongoDB] Inserting data:', JSON.stringify(parsedData || parsedQuery, null, 2));
        const insertResult = await collection.insertOne(parsedData || parsedQuery);
        result = { insertedId: insertResult.insertedId };
        affectedCount = 1;
        break;

      case 'insertMany':
        const insertManyResult = await collection.insertMany(
          Array.isArray(parsedData) ? parsedData : [parsedData || parsedQuery]
        );
        result = { insertedIds: insertManyResult.insertedIds };
        affectedCount = insertManyResult.insertedCount;
        break;

      case 'find':
        const docs = await collection.find(parsedQuery).limit(100).toArray();
        result = docs;
        affectedCount = docs.length;
        break;

      case 'findOne':
        const doc = await collection.findOne(parsedQuery);
        result = doc;
        affectedCount = doc ? 1 : 0;
        break;

      case 'update':
        const updateResult = await collection.updateMany(
          parsedQuery,
          { $set: parsedData || {} }
        );
        result = { modifiedCount: updateResult.modifiedCount };
        affectedCount = updateResult.modifiedCount;
        break;

      case 'delete':
        const deleteResult = await collection.deleteMany(parsedQuery);
        result = { deletedCount: deleteResult.deletedCount };
        affectedCount = deleteResult.deletedCount;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    console.log(`[MongoDB] Operation complete, affected: ${affectedCount}`);

    return NextResponse.json({
      success: true,
      output: {
        success: true,
        operation,
        collection: collectionName,
        affectedCount,
        data: result,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[MongoDB] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'MongoDB operation failed',
        output: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  } finally {
    // Crucial: always close connection
    if (client) {
      await client.close();
    }
  }
}
