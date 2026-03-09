import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userWallets, walletTransactions } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/wallet — Get wallet balance + recent transactions
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get existing wallet
        let [wallet] = await db
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        // Auto-create wallet with 100 free credits on first access
        if (!wallet) {
            const now = new Date();
            [wallet] = await db.insert(userWallets).values({
                userId,
                credits: 100,
                totalPurchased: 0,
                totalSpent: 0,
                createdAt: now,
                updatedAt: now,
            }).returning();

            // Record the bonus transaction
            await db.insert(walletTransactions).values({
                id: crypto.randomUUID(),
                userId,
                type: 'bonus',
                amount: 100,
                balance: 100,
                description: 'Welcome bonus — 100 free credits',
                createdAt: now,
            });
        }

        // Get recent transactions (last 20)
        const transactions = await db
            .select()
            .from(walletTransactions)
            .where(eq(walletTransactions.userId, userId))
            .orderBy(desc(walletTransactions.createdAt))
            .limit(20);

        return NextResponse.json({
            success: true,
            wallet: {
                credits: wallet.credits,
                totalPurchased: wallet.totalPurchased,
                totalSpent: wallet.totalSpent,
            },
            transactions,
        });
    } catch (error: any) {
        console.error('[GET /api/wallet] Error:', error);

        // Connection timeout — return a graceful fallback so the UI still renders
        const isTimeout =
            error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            error?.message?.includes('Connect Timeout') ||
            error?.name === 'AbortError';

        if (isTimeout) {
            console.warn('[GET /api/wallet] DB connection timed out — returning fallback wallet');
            return NextResponse.json({
                success: true,
                wallet: { credits: 0, totalPurchased: 0, totalSpent: 0 },
                transactions: [],
                warning: 'Database temporarily unavailable. Balance may not be current.',
            });
        }

        return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
    }
}
