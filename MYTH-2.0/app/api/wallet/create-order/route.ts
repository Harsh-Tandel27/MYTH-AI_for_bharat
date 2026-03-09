import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Credit packs configuration — PRICES IN PAISE (1 INR = 100 paise)
// Using INR because Razorpay test mode only supports INR; international cards are handled by Razorpay
const CREDIT_PACKS: Record<string, { credits: number; priceInPaise: number; priceInINR: number; name: string }> = {
    starter: { credits: 500, priceInPaise: 16700, priceInINR: 167, name: 'Starter Pack' },  // ~$1.99 USD
    pro: { credits: 1500, priceInPaise: 41900, priceInINR: 419, name: 'Pro Pack' },       // ~$4.99 USD
    power: { credits: 4000, priceInPaise: 83900, priceInINR: 839, name: 'Power Pack' },     // ~$9.99 USD
};

// POST /api/wallet/create-order — Create a Razorpay order for a credit pack
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { packId } = await req.json();
        const pack = CREDIT_PACKS[packId];

        if (!pack) {
            return NextResponse.json({
                error: 'Invalid pack',
                availablePacks: Object.keys(CREDIT_PACKS),
            }, { status: 400 });
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        console.log('[create-order] Keys present:', { keyId: !!keyId, keySecret: !!keySecret });

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
        }

        // Create order using Razorpay REST API directly (avoids CJS/ESM issues)
        const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                amount: pack.priceInPaise,
                currency: 'INR',
                receipt: `w_${userId.slice(-8)}_${Date.now().toString(36)}`,
                notes: {
                    userId,
                    packId,
                    credits: pack.credits.toString(),
                },
            }),
        });

        if (!razorpayRes.ok) {
            const errorBody = await razorpayRes.text();
            console.error('[create-order] Razorpay API error:', razorpayRes.status, errorBody);
            return NextResponse.json({ error: 'Razorpay order creation failed' }, { status: 500 });
        }

        const order = await razorpayRes.json();
        console.log('[create-order] Order created:', order.id);

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            pack: {
                id: packId,
                name: pack.name,
                credits: pack.credits,
                price: pack.priceInINR,
            },
        });
    } catch (error: any) {
        console.error('[POST /api/wallet/create-order] Error:', error?.message || error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
