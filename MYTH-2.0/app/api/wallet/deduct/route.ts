import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userWallets, walletTransactions } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// POST /api/wallet/deduct — Deduct credits for AI usage
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { amount, description } = await req.json();
        const deductAmount = parseInt(amount, 10);

        if (!deductAmount || deductAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Get current balance
        let [wallet] = await db
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        // Auto-create wallet if it doesn't exist
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
        }

        if (wallet.credits < deductAmount) {
            return NextResponse.json({
                error: 'Insufficient credits',
                required: deductAmount,
                available: wallet.credits,
            }, { status: 402 });
        }

        const now = new Date();

        // Deduct atomically
        await db
            .update(userWallets)
            .set({
                credits: sql`${userWallets.credits} - ${deductAmount}`,
                totalSpent: sql`${userWallets.totalSpent} + ${deductAmount}`,
                updatedAt: now,
            })
            .where(eq(userWallets.userId, userId));

        const newBalance = wallet.credits - deductAmount;

        // Record transaction
        await db.insert(walletTransactions).values({
            id: crypto.randomUUID(),
            userId,
            type: 'deduction',
            amount: -deductAmount,
            balance: newBalance,
            description: description || 'AI usage',
            createdAt: now,
        });

        return NextResponse.json({
            success: true,
            deducted: deductAmount,
            wallet: { credits: newBalance },
        });
    } catch (error) {
        console.error('[POST /api/wallet/deduct] Error:', error);
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
    }
}
