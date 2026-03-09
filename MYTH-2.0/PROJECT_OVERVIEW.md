# MYTH 2.0 Project Master Overview

MYTH 2.0 is an advanced AI-powered development platform designed to automate the creation of websites, full-stack applications, and data dashboards. It combines multiple state-of-the-art AI models with a cloud-based sandboxing environment to provide a seamless "Prompt-to-Product" or "No-Code" experience.

---

## 1. High-Level Architecture & Tech Stack

The project is built as a highly scalable web application using **Next.js 15** with the App Router paradigm.

### Tech Stack Breakdown:
- **Frontend Framework:** React 19, Next.js 15
- **Styling & UI:** Tailwind CSS, Framer Motion (for animations), Radix UI, Lucide React (icons)
- **Backend & API:** Next.js API Routes (Serverless & Edge Runtime)
- **Database (Main Platform):** SQLite managed via **Drizzle ORM** (connected via Turso).
- **Database (AI Output):** The AI generates **MongoDB (Mongoose)** code for the user's MERN apps, but the core MYTH 2.0 platform itself runs strictly on SQL.
- **Authentication:** **Clerk** for user management, identity verification, and session security.
- **Payments & Billing:** **Razorpay** for a secure, pay-as-you-go credit system.
- **Cloud Sandboxing:** **E2B** (Code Interpreter) for spinning up secure, ephemeral cloud development environments.
- **AI Integration:** **Vercel AI SDK** with support for multiple providers:
  - Google (Gemini 2.5 Flash / Gemini 3 Pro)
  - Anthropic (Claude 3.5 Sonnet)
  - OpenAI (GPT-4o / GPT-4o-mini)
  - Groq (Llama 3.3 70B Fast inference)

---

## 2. Core Modules & Features

The platform is divided into several specialized AI generation pipelines, each accessible from a different route in the application:

### 🚀 PromptAI (React AI Builder)
Located at `/app/promptai`, this is the main entry point for generating modern, responsive React websites. 
- **How it works:** Users enter a prompt. The AI streams code back via `/api/generate-ai-code-stream`. The code is continuously written to an E2B Sandbox, compiled via Vite, and displayed to the user in a live iframe preview.
- **Key Capabilities:** Handles surgical edits (modifying only specific files) and specializes in complex GSAP-style animations and rich visual design.

### 🍱 MERN Fullstack AI (Backend & Admin Builder)
Located at `/app/fullstackai`, this module generates a complete MERN stack application (MongoDB, Express, React, Node.js).
- **How it works:** It uses an Edge Runtime API (`/api/generate-mern-code`) to simultaneously generate the Backend API (Express/Mongoose routes), the Frontend UI, and a fully functional Admin Dashboard separate from the main frontend.
- **Key Capabilities:** Automatically creates database seeding logic and standard CRUD REST endpoints for data models.

### 🌐 URL AI (Website Cloner)
Located at `/app/urlai`, this allows users to input the URL of any existing website and recreate it.
- **How it works:** It uses **Firecrawl** (`/api/scrape-url-enhanced`) to scrape the target website, extracting markdown, raw HTML, and contextualizing images. 
- **Key Capabilities:** The AI reconstructs the site's layout, styling, and content into a clean, modern Tailwind CSS React codebase.

### 📊 Data-to-Dashboard AI
Located at `/app/datatodashboardai`, it converts raw data files (CSV, Excel) into fully interactive analytical dashboards.
- **How it works:** Users upload a dataset. The AI analyzes it, devises a "Dashboard Plan" (identifying key metrics and visual charts), and then generates a complete **Python Streamlit** application (`app.py`) via `/api/datadashboard/generate`.
- **Key Capabilities:** Uses `pandas` for data manipulation and `plotly.express` for interactive data visualization.

### 🧠 SaaS Copilot / Voice Agent
Located at `/app/saas_copilot`, an intelligent assistant for interacting with complex SaaS environments.
- **Key Capabilities:** Integrates with **VAPI** for voice-based interactions and uses a multi-agent routing system to handle different types of user commands.

### 🎨 Visual Builder (Drag & Drop)
Located at `/app/drag-drop`, a no-code visual interface allowing users to assemble pre-built UI sections without writing text prompts, acting as a traditional website builder.

---

## 3. Infrastructure & Shared Services

### 🏗️ E2B Sandboxes
The backbone of the live preview system. Whenever code is generated, the system calls `/api/create-ai-sandbox` to provision a secure Linux container. 
- It automatically creates standard `package.json`, `vite.config.js`, and `tailwind.config.js` files. It installs dependencies, runs `npm run dev`, and streams the port output back to the frontend iframe.

### 💳 Wallet & Credit Deduction System
A unified, atomic pay-as-you-go billing system.
- **Tracking:** User balances and transactions are tracked in the SQLite DB via Drizzle (`user_wallets` and `wallet_transactions` tables).
- **Deduction:** Every AI action has a predefined cost (e.g., MERN build = 25 credits, URL Clone = 8). A centralized helper function (`lib/credits.ts`) intercepts backend API requests, verifies the Clerk user, checks the credit balance, and atomically deducts the cost *before* any AI or Cloud resources are utilized.
- **Purchasing:** Users top up balances via the Razorpay checkout flow, triggered from the Pricing page.

---

## 4. Key Directory Map

Understanding the file structure is crucial for navigating MYTH 2.0:

- **`/app`**: The Next.js App Router root. Contains all pages, layouts, and API routes.
  - **`/app/api`**: All server-side logic, AI streaming handlers, and Webhooks.
  - **`/app/(features)`**: Folders like `urlai`, `promptai`, `fullstackai` contain the UI for those specific AI pipelines.
- **`/components`**: Reusable React components.
  - **`/components/ui`**: Base UI elements (buttons, dialogs, inputs) typically built on Radix UI.
  - Includes complex components like `TerminalCore.tsx` and `SandboxPreview.tsx`.
- **`/lib`**: Shared utilities and configurations.
  - `db.ts` & `schema.ts`: Drizzle ORM setup and table definitions.
  - `credits.ts`: The central billing verification logic.
  - `context-selector.ts` & `file-parser.ts`: Utilities for managing and parsing the virtual file system used by the AI during generation.
- **`/config`**: Global application settings, theme configurations, and API timeout limits.

---

## 5. Typical Development Workflow (Prompt-to-Product)
1. **Request:** A user logs in (Clerk) and submits a prompt on the dashboard.
2. **Billing Authorization:** The corresponding API route calls the credit system to safely deduct the specific cost of the requested service.
3. **Environment Provisioning:** The backend orchestrates a call to E2B to spin up a new development sandbox, injecting base configurations (Vite/React).
4. **AI Generation:** The Vercel AI SDK streams response chunks back to the client while simultaneously applying the code modifications directly into the E2B Sandbox's virtual filesystem.
5. **Live Render:** The user watches the AI "type" the files, while the integrated iframe live-reloads the Vite server, demonstrating the final output in real-time.
