/**
 * Server-side credit deduction helper.
 * Import this in any Node.js API route (NOT edge runtime).
 * For edge routes, use the deductCreditsViaAPI helper instead.
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userWallets, walletTransactions } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export type CreditSuccess = { ok: true; userId: string };
export type CreditFailure = { ok: false; response: NextResponse };
export type CreditResult = CreditSuccess | CreditFailure;

/**
 * Checks that the user is authenticated AND has enough credits,
 * then atomically deducts them. Returns { ok: true, userId } on success,
 * or { ok: false, response } where response is a ready-to-return NextResponse.
 */
export async function requireCredits(
    amount: number,
    description: string,
): Promise<CreditResult> {
    const { userId } = await auth();
    if (!userId) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    // Auto-create wallet if it doesn't exist yet
    let [wallet] = await db
        .select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId));

    if (!wallet) {
        const now = new Date();
        [wallet] = await db
            .insert(userWallets)
            .values({
                userId,
                credits: 100,
                totalPurchased: 0,
                totalSpent: 0,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
    }

    if (wallet.credits < amount) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'Insufficient credits',
                    required: amount,
                    available: wallet.credits,
                },
                { status: 402 },
            ),
        };
    }

    const now = new Date();

    // Atomic deduction
    await db
        .update(userWallets)
        .set({
            credits: sql`${userWallets.credits} - ${amount}`,
            totalSpent: sql`${userWallets.totalSpent} + ${amount}`,
            updatedAt: now,
        })
        .where(eq(userWallets.userId, userId));

    const newBalance = wallet.credits - amount;

    // Audit log
    await db.insert(walletTransactions).values({
        id: crypto.randomUUID(),
        userId,
        type: 'deduction',
        amount: -amount,
        balance: newBalance,
        description,
        createdAt: now,
    });

    console.log(`[credits] Deducted ${amount} credits from ${userId} for "${description}". Remaining: ${newBalance}`);

    return { ok: true, userId };
}

/**
 * Credit deduction for edge-runtime routes.
 * Calls the /api/wallet/deduct endpoint internally using a server-to-server request.
 * Pass the incoming request's headers so Clerk can authenticate.
 */
export async function requireCreditsViaAPI(
    amount: number,
    description: string,
    headers: Headers,
): Promise<CreditResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Forward the cookie header for Clerk auth
    const cookieHeader = headers.get('cookie') || '';

    const res = await fetch(`${appUrl}/api/wallet/deduct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            cookie: cookieHeader,
        },
        body: JSON.stringify({ amount, description }),
    });

    if (res.status === 401) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    if (res.status === 402) {
        const data = await res.json();
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'Insufficient credits',
                    required: data.required,
                    available: data.available,
                },
                { status: 402 },
            ),
        };
    }

    if (!res.ok) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Failed to process credits' },
                { status: 500 },
            ),
        };
    }

    // We don't have a userId here but it's not needed for edge routes
    return { ok: true, userId: '' };
}

// Centralised credit costs — mirrors CREDIT_COSTS in wallet-context.tsx
export const CREDIT_COSTS = {
    PROMPT_GENERATION: 10,
    CHAT_EDIT: 5,
    MERN_BUILD: 25,
    SANDBOX_CREATION: 1, // lowered from 3
    URL_CLONE: 8,
    DATA_DASHBOARD: 7,
} as const;
