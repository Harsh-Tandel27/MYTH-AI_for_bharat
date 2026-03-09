import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userWallets, walletTransactions } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

// POST /api/wallet/verify-payment — Verify Razorpay payment and add credits
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packId,
            credits,
        } = await req.json();

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('[VerifyPayment] Signature mismatch!');
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
        }

        // Check for duplicate transaction (idempotency)
        const [existingTxn] = await db
            .select()
            .from(walletTransactions)
            .where(eq(walletTransactions.razorpayPaymentId, razorpay_payment_id));

        if (existingTxn) {
            return NextResponse.json({
                success: true,
                message: 'Payment already processed',
                wallet: { credits: existingTxn.balance },
            });
        }

        const now = new Date();
        const creditAmount = parseInt(credits, 10);

        // Update wallet balance atomically
        await db
            .update(userWallets)
            .set({
                credits: sql`${userWallets.credits} + ${creditAmount}`,
                totalPurchased: sql`${userWallets.totalPurchased} + ${creditAmount}`,
                updatedAt: now,
            })
            .where(eq(userWallets.userId, userId));

        // Get updated balance
        const [updatedWallet] = await db
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        // Record transaction
        await db.insert(walletTransactions).values({
            id: crypto.randomUUID(),
            userId,
            type: 'purchase',
            amount: creditAmount,
            balance: updatedWallet.credits,
            description: `Purchased ${creditAmount} credits (${packId} pack)`,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            createdAt: now,
        });

        console.log(`[VerifyPayment] User ${userId} purchased ${creditAmount} credits. New balance: ${updatedWallet.credits}`);

        return NextResponse.json({
            success: true,
            wallet: { credits: updatedWallet.credits },
        });
    } catch (error) {
        console.error('[POST /api/wallet/verify-payment] Error:', error);
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
    }
}
