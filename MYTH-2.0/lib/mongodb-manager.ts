import mongoose from 'mongoose';

/**
 * MongoDB Manager for Full Stack MERN Builder
 * Handles database creation, connection, and cleanup
 */

export interface DatabaseConfig {
    name: string;
    connectionString: string;
    createdAt: Date;
}

/**
 * Generate a unique database name for a project
 */
export function generateDatabaseName(projectId: string): string {
    const timestamp = Date.now();
    const sanitizedProjectId = projectId.replace(/[^a-zA-Z0-9]/g, '_');
    return `myth_${sanitizedProjectId}_${timestamp}`;
}

/**
 * Get MongoDB connection string for a specific database
 */
export function getMongoConnectionString(dbName: string): string {
    const password = process.env.MONGO_DB_PASS;
    if (!password) {
        throw new Error('MONGO_DB_PASS environment variable is not set');
    }

    return `mongodb+srv://myth20:${password}@cluster0.pdpcegk.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
}

/**
 * Create a new unique database for a project
 */
export async function createUniqueDatabase(projectId: string): Promise<DatabaseConfig> {
    const dbName = generateDatabaseName(projectId);
    const connectionString = getMongoConnectionString(dbName);

    try {
        // Test connection by creating a temporary connection
        const connection = await mongoose.createConnection(connectionString).asPromise();

        // Create a test collection to ensure database is created
        await connection.db.createCollection('_init');

        // Close the test connection
        await connection.close();

        return {
            name: dbName,
            connectionString,
            createdAt: new Date(),
        };
    } catch (error) {
        console.error('[MongoDB Manager] Failed to create database:', error);
        throw new Error(`Failed to create MongoDB database: ${(error as Error).message}`);
    }
}

/**
 * Test MongoDB connection
 */
export async function testMongoConnection(dbName: string): Promise<boolean> {
    try {
        const connectionString = getMongoConnectionString(dbName);
        const connection = await mongoose.createConnection(connectionString).asPromise();
        const isConnected = connection.readyState === 1;
        await connection.close();
        return isConnected;
    } catch (error) {
        console.error('[MongoDB Manager] Connection test failed:', error);
        return false;
    }
}

/**
 * Drop a database (for cleanup)
 */
export async function dropDatabase(dbName: string): Promise<void> {
    try {
        const connectionString = getMongoConnectionString(dbName);
        const connection = await mongoose.createConnection(connectionString).asPromise();
        await connection.db.dropDatabase();
        await connection.close();
        console.log(`[MongoDB Manager] Database ${dbName} dropped successfully`);
    } catch (error) {
        console.error('[MongoDB Manager] Failed to drop database:', error);
        throw new Error(`Failed to drop database: ${(error as Error).message}`);
    }
}

/**
 * List all collections in a database
 */
export async function listCollections(dbName: string): Promise<string[]> {
    try {
        const connectionString = getMongoConnectionString(dbName);
        const connection = await mongoose.createConnection(connectionString).asPromise();
        const collections = await connection.db.listCollections().toArray();
        await connection.close();
        return collections.map(c => c.name).filter(name => name !== '_init');
    } catch (error) {
        console.error('[MongoDB Manager] Failed to list collections:', error);
        return [];
    }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(dbName: string): Promise<any> {
    try {
        const connectionString = getMongoConnectionString(dbName);
        const connection = await mongoose.createConnection(connectionString).asPromise();
        const stats = await connection.db.stats();
        await connection.close();
        return stats;
    } catch (error) {
        console.error('[MongoDB Manager] Failed to get database stats:', error);
        return null;
    }
}
