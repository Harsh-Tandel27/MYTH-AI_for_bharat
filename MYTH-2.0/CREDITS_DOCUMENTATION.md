# MYTH 2.0 Credit & Billing System Documentation

This document explains the architecture and implementation of the self-serve credit system in MYTH 2.0, powered by Clerk for authentication and Razorpay for payments.

## 1. Core Architecture

The system is built on an atomic-deduction model. Before any AI service performs work, it verifies the user's identity and credit balance, then deducts the required amount.

### Key Components

- **Database (`lib/schema.ts`):** 
    - `user_wallets`: Tracks current `credits`, `totalPurchased`, and `totalSpent` for each Clerk `userId`.
    - `wallet_transactions`: A full audit log of every purchase, deduction, bonus, or refund.
- **Credit Helper (`lib/credits.ts`):** Centralized logic for server-side credit checks.
- **Wallet Context (`lib/wallet-context.tsx`):** Frontend provider that syncs balance and handles the Razorpay checkout flow.

---

## 2. Credit Costs (Service Rates)

Each AI action has a fixed credit cost defined in `lib/credits.ts`.

| Action | Cost | Description |
|---|---|---|
| **Prompt Generation** | 10 | Generating a new React website from a prompt |
| **Chat Edit** | 5 | Targeted modification of existing code via chat |
| **MERN Build** | 25 | Full-stack generation (Frontend + Backend + Admin) |
| **Sandbox Creation** | 3 | Provisioning an E2B cloud development environment |
| **URL Clone** | 8 | Extracting content and images via Firecrawl |
| **Data Dashboard** | 7 | Generating a Streamlit dashboard from a dataset |

---

## 3. The Deduction Flow

### Server-Side (Secure)
Most service routes use the `requireCredits` helper:
```typescript
import { requireCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(req: Request) {
  // 1. Charge credits (returns early if unauthorized or insufficient)
  const result = await requireCredits(CREDIT_COSTS.PROMPT_GENERATION, 'Description');
  if (result.ok === false) return result.response;

  // 2. Perform AI work only if above succeeded
  // ...
}
```

### Edge Runtime
For routes using `runtime = "edge"` (like MERN builds), the system uses `requireCreditsViaAPI`. This performs an internal server-to-server request to the wallet deduction endpoint because Edge environments cannot connect directly to the SQLite/Drizzle database in some configurations.

---

## 4. Purchasing Credits

Purchases are handled via **Razorpay**.

1. **Order Creation:** `/api/wallet/create-order` calculates the price based on the selected pack (`Starter`, `Pro`, or `Power`).
2. **Checkout:** The frontend opens the Razorpay modal.
3. **Verification:** `/api/wallet/verify-payment` checks the cryptographic signature from Razorpay.
4. **Fulfillment:** Credits are added to the user's wallet, and a `purchase` transaction is recorded.

---

## 5. First-Time Users

When a new user first interacts with the wallet or any credit-gated service, the system automatically:
1. Creates a new row in `user_wallets`.
2. Grants a **Welcome Bonus of 100 Free Credits**.
3. Records a `bonus` transaction in the audit log.

---

## 6. Error Handling

When a user runs out of credits, the server returns a **402 Payment Required** status. The frontend detects this and displays an "Insufficient Credits" message, prompting the user to top up via the Pricing page.
