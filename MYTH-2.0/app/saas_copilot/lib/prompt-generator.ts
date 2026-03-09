/**
 * SitePilot Prompt Generator
 * Transforms Vapi-collected JSON requirements into a comprehensive,
 * phase-wise system builder prompt.
 */

export interface BlueprintData {
  projectName: string;
  projectDescription: string;
  websiteType: string;
  theme: {
    style?: string;
    colors?: string[];
    inspiration?: string[];
  };
  pages: Array<{
    name: string;
    sections?: string[];
  }>;
  features: {
    authentication?: boolean;
    staticPayments?: boolean;
    adminDashboard?: boolean;
    landingPage?: boolean;
    forms?: string[];
    other?: string[];
  };
  targetAudience?: string;
  callToAction?: string;
}

export interface Phase {
  number: number;
  title: string;
  description: string;
  tasks: string[];
}

function generatePhases(data: BlueprintData): Phase[] {
  const phases: Phase[] = [];
  let phaseNum = 1;

  // Phase 1: Project Scaffolding
  phases.push({
    number: phaseNum++,
    title: "Project Setup & Scaffolding",
    description:
      "Initialize the project with the required tech stack and folder structure.",
    tasks: [
      "Initialize Next.js project with App Router and Tailwind CSS",
      "Set up MongoDB connection with Mongoose in /lib/db.ts",
      "Configure project structure: /app (pages & API routes), /components, /lib, /models",
      "Install core dependencies: mongoose, next-auth (if auth needed), tailwindcss",
      "Set up Tailwind CSS configuration with custom theme colors",
      ...(data.theme?.colors?.length
        ? [
            `Configure Tailwind theme with brand colors: ${data.theme.colors.join(", ")}`,
          ]
        : []),
      ...(data.theme?.style
        ? [
            `Apply "${data.theme.style}" design system — typography, spacing, and component styles`,
          ]
        : []),
    ],
  });

  // Phase 2: Database & API
  phases.push({
    number: phaseNum++,
    title: "Database Schema & API Routes",
    description:
      "Design the MongoDB schemas and build Next.js API routes (app/api/).",
    tasks: [
      "Design MongoDB schemas in /models directory",
      "IMPORTANT: Use the same MongoDB connection URL that is hardcoded in the client code so that the admin dashboard and client app share the same database",
      ...(data.features?.authentication
        ? [
            "Create User model (name, email, password hash, role, createdAt)",
            "Create Next.js API routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me",
            "Implement JWT or NextAuth.js for authentication and session management",
          ]
        : []),
      ...(data.features?.adminDashboard
        ? ["Add role field to User model (admin/user) for access control"]
        : []),
      ...(data.features?.staticPayments
        ? ["Create GET /api/plans route returning static plan data"]
        : []),
      ...data.pages.map(
        (p) => `Create API route for "${p.name}" page data if dynamic`,
      ),
      ...(data.features?.forms?.map(
        (f) =>
          `Create POST /api/${f.toLowerCase().replace(/\s+/g, "-")} route to handle "${f}" form submissions`,
      ) || []),
    ],
  });

  // Phase 3: Frontend Pages
  phases.push({
    number: phaseNum++,
    title: "Frontend Pages & Components",
    description: `Build all ${data.pages.length} pages with Next.js App Router and Tailwind CSS.`,
    tasks: [
      "Set up Next.js App Router file-based routing for all pages",
      "Create shared Layout (layout.tsx) with Navbar and Footer",
      `Navbar links: ${data.pages.map((p) => p.name).join(", ")}`,
      ...(data.features?.landingPage
        ? [
            "Build a stunning Landing Page with hero section, features grid, testimonials, and CTA",
          ]
        : []),
      ...data.pages.map((page) => {
        const sections = page.sections?.length
          ? ` — Sections: ${page.sections.join(", ")}`
          : "";
        return `Build "${page.name}" page${sections}`;
      }),
      ...(data.callToAction
        ? [`Primary CTA: "${data.callToAction}" in hero + strategic positions`]
        : []),
      ...(data.targetAudience ? [`Tailor UX for: ${data.targetAudience}`] : []),
      "Ensure full mobile responsiveness",
      `Apply ${data.theme?.style || "modern"} design aesthetic`,
    ],
  });

  // Phase 4: Auth
  if (data.features?.authentication) {
    phases.push({
      number: phaseNum++,
      title: "Authentication System",
      description:
        "Implement user registration, login, and session management.",
      tasks: [
        "Create Login/Register pages",
        "Implement JWT token handling",
        "Create AuthContext for global auth state",
        "Add ProtectedRoute wrapper",
        "User profile dropdown in navbar",
      ],
    });
  }

  // Phase 5: Admin Dashboard
  if (data.features?.adminDashboard) {
    phases.push({
      number: phaseNum++,
      title: "Admin Dashboard",
      description: "Admin panel with sidebar, analytics, and user management.",
      tasks: [
        "Create admin layout with collapsible sidebar",
        "Sidebar tabs: Overview, Users, Analytics, Activity Logs, Settings",
        "Overview: stat cards (Total Users, Revenue, Subscriptions, Page Views)",
        "Users: searchable, sortable table with Name, Email, Role, Status, Joined",
        "Analytics: traffic graphs, top pages, user growth (static mock data)",
        "Activity Logs: table with recent events and timestamps",
        "Settings: site name, timezone, notification preferences",
        "Admin route protection — redirect non-admin users",
      ],
    });
  }

  // Phase 6: Static Payments
  if (data.features?.staticPayments) {
    phases.push({
      number: phaseNum++,
      title: "Pricing & Billing UI (Static)",
      description:
        "Static pricing cards and simulated subscription management.",
      tasks: [
        "Pricing page: 3 cards — Free, Pro ($29/mo), Enterprise ($99/mo)",
        "Each card: plan name, price, feature list, CTA button",
        'Highlight "Pro" as recommended',
        "Mock Checkout page (visual only, no real payments)",
        "Subscription Management in user profile",
        "Invoice history table with static mock data",
      ],
    });
  }

  // Phase 7: Forms & Features
  const hasExtra =
    (data.features?.forms?.length || 0) > 0 ||
    (data.features?.other?.length || 0) > 0;
  if (hasExtra) {
    phases.push({
      number: phaseNum++,
      title: "Forms & Additional Features",
      description: "Implement requested forms and special functionality.",
      tasks: [
        ...(data.features?.forms?.map(
          (f) => `Build "${f}" form with validation`,
        ) || []),
        ...(data.features?.other?.map((f) => `Implement: ${f}`) || []),
        "Add toast notifications for form submissions",
      ],
    });
  }

  // Final Phase
  phases.push({
    number: phaseNum++,
    title: "Polish & Deploy Prep",
    description: "Final checks, responsive testing, and deployment readiness.",
    tasks: [
      "Cross-browser testing",
      "Mobile responsiveness audit",
      "Add page transition animations",
      "Add proper meta tags and SEO",
      "Create 404 page",
      ...(data.theme?.inspiration?.length
        ? [`Reference check: ${data.theme.inspiration.join(", ")}`]
        : []),
    ],
  });

  return phases;
}

export function generatePrompt(data: BlueprintData): string {
  const phases = generatePhases(data);

  let prompt = "";

  prompt += `PROJECT: ${data.projectName}\n`;
  prompt += `DESCRIPTION: ${data.projectDescription}\n`;
  prompt += `TYPE: ${data.websiteType}\n`;
  prompt += `STYLE: ${data.theme?.style || "Modern & Clean"}\n`;
  if (data.theme?.colors?.length)
    prompt += `COLORS: ${data.theme.colors.join(", ")}\n`;
  if (data.targetAudience) prompt += `AUDIENCE: ${data.targetAudience}\n`;
  if (data.callToAction) prompt += `CTA: ${data.callToAction}\n`;
  if (data.theme?.inspiration?.length)
    prompt += `INSPIRATION: ${data.theme.inspiration.join(", ")}\n`;
  prompt += `\nTECH STACK: Next.js (App Router) + Tailwind CSS (frontend & API routes), MongoDB + Mongoose (database)\n`;
  prompt += `PAYMENTS: Static/Simulated only (no real payment integration)\n\n`;

  prompt += `FEATURES:\n`;
  prompt += `- Authentication: ${data.features?.authentication ? "Yes" : "No"}\n`;
  prompt += `- Static Payments: ${data.features?.staticPayments ? "Yes" : "No"}\n`;
  prompt += `- Admin Dashboard: ${data.features?.adminDashboard ? "Yes" : "No"}\n`;
  prompt += `- Landing Page: ${data.features?.landingPage ? "Yes" : "No"}\n`;
  if (data.features?.forms?.length)
    prompt += `- Forms: ${data.features.forms.join(", ")}\n`;
  if (data.features?.other?.length)
    prompt += `- Other: ${data.features.other.join(", ")}\n`;
  prompt += `\n`;

  prompt += `PAGES:\n`;
  data.pages.forEach((page, i) => {
    prompt += `${i + 1}. ${page.name}`;
    if (page.sections?.length) prompt += ` [${page.sections.join(", ")}]`;
    prompt += `\n`;
  });
  prompt += `\n`;

  prompt += `BUILD PHASES:\n\n`;
  phases.forEach((phase) => {
    prompt += `PHASE ${phase.number}: ${phase.title}\n`;
    prompt += `${phase.description}\n`;
    phase.tasks.forEach((task) => {
      prompt += `  • ${task}\n`;
    });
    prompt += `\n`;
  });

  prompt += `\nBuild this project following the phases above. Start with Phase 1 and proceed sequentially. Use Next.js (App Router) with Tailwind CSS for the full-stack application and MongoDB with Mongoose for the database. All payment features should be static/simulated.\n\nIMPORTANT: For the MongoDB connection, use the SAME MongoDB connection URL that is already hardcoded in the client code. This ensures the admin dashboard and client application communicate with the same database and share accurate data.`;

  return prompt;
}
