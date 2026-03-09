import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { requireCreditsViaAPI, CREDIT_COSTS } from '@/lib/credits';

export const runtime = 'edge';
export const maxDuration = 300;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const modelMap: Record<string, any> = {
  'claude-3-5-sonnet-20241022': anthropic('claude-3-5-sonnet-20241022'),
  'gpt-4o': openai('gpt-4o'),
  'gpt-4o-mini': openai('gpt-4o-mini'),
  'gemini-2.5-flash': google('gemini-2.5-flash'),
  'google/gemini-2.5-flash': google('gemini-2.5-flash'),
  'gemini-3-flash-preview': google('gemini-3-flash-preview'),
  'google/gemini-3-flash-preview': google('gemini-3-flash-preview'),
  'gemini-3-pro-preview': google('gemini-3-pro-preview'),
  'google/gemini-3-pro-preview': google('gemini-3-pro-preview'),
  'llama-3.3-70b': groq('llama-3.3-70b-versatile'),
};

export async function POST(req: NextRequest) {
  try {
    // Deduct credits before generating MERN code
    const creditResult = await requireCreditsViaAPI(
      CREDIT_COSTS.MERN_BUILD,
      'MERN Build — Full-stack code generation',
      req.headers,
    );
    if (creditResult.ok === false) return creditResult.response;

    const { prompt, model = 'gemini-2.5-flash', layer = 'both', apiContext = '', currentCodebase = [], isEdit = false, style = 'Modern', backendSchema = '' } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // Use the model passed by the user, fallback to gemini-2.5-flash
    const selectedModel = modelMap[model] || modelMap['gemini-2.5-flash'];

    let layerInstruction = '';
    if (layer === 'backend') {
      layerInstruction = `Focus ONLY on generating the BACKEND (Express server, models, routes). Use this MongoDB Connection String: ${apiContext}.
CRITICAL BACKEND RULES:
1. ENV: You MUST use the provided MongoDB Connection String in your .env file as MONGO_URI.
2. NO PLACEHOLDERS: DO NOT use placeholders like "your_mongodb_connection_string_here". Use the REAL URI provided.
3. COMPLEX APPS: For complex applications (e-commerce, CMS, etc.), generate comprehensive models with proper relationships:
   - Use Mongoose refs and populate for related data
   - Include proper validation, default values, and indexes
   - Generate seed data endpoints (POST /api/seed) for testing with realistic mock data
4. NO AUTHENTICATION: DO NOT generate ANY authentication, JWT, bcryptjs, auth middleware, login routes, register routes, or token verification. ALL API routes must be fully public and accessible without any tokens or headers. Never import or use jsonwebtoken or bcryptjs.
4b. CORS: You MUST use cors with origin '*' to allow connections from both the frontend website AND the admin dashboard: app.use(cors({ origin: '*' })). Add "cors" to dependencies.
5. API RESPONSE FORMAT: All GET endpoints that return lists MUST return a plain JSON array, NOT wrapped in an object.
   - CORRECT: res.json(products)  // returns [...]
   - WRONG: res.json({ products: products })  // returns { products: [...] }
   - For single items: res.json(item) is fine.
6. AUTO-SEED ON STARTUP: For ANY app that has database models (products, posts, items, users, menu items, etc.), you MUST create a seedDatabase() function in server.js that:
   - Runs AUTOMATICALLY after mongoose.connect() succeeds (call it right after DB connects, before app.listen)
   - Checks if each collection is empty (e.g., const count = await Product.countDocuments())
   - If empty, inserts 6-10 realistic sample documents with real-looking data (names, descriptions, prices, categories, image URLs using https://picsum.photos/seed/itemN/400/400)
   - Logs "Seeded X items into [collection]" for each seeded collection
   - Does NOT delete existing data — only adds if collection is empty
   - Example pattern in server.js:
     // async function seedDatabase() { const count = await Product.countDocuments(); if (count === 0) { await Product.insertMany([{name:'Product 1', price:29.99, image:'https://picsum.photos/seed/p1/400/400'}, ...]); console.log('Seeded products'); } }
     // Call after DB connect: mongoose.connect(MONGO_URI).then(() => { seedDatabase(); });
   - Also keep the POST /api/seed endpoint for manual re-seeding (this one SHOULD clear and re-insert).
7. EMPTY COLLECTION HANDLING: All GET endpoints must handle empty collections gracefully — always return [] (empty array), never null or undefined.
8. FULL CRUD ENDPOINTS: For EVERY model, generate complete REST endpoints:
   - GET /api/[resource] — list all items (return plain array)
   - GET /api/[resource]/:id — get single item
   - POST /api/[resource] — create new item
   - PUT /api/[resource]/:id — update item
   - DELETE /api/[resource]/:id — delete item
   These are required for the admin dashboard to manage all data.
DO NOT generate any frontend code.`;
    } else if (layer === 'frontend') {
      const schemaHint = backendSchema ? `\n\nBACKEND MODEL SCHEMA (use these EXACT field names):\n${backendSchema}\n` : '';
      layerInstruction = `Focus ONLY on generating the FRONTEND (React/Vite). Use this Backend API URL: ${apiContext}.
${schemaHint}
CRITICAL FRONTEND RULES:
1. STYLE: The user has selected the "${style}" design style. You MUST strictly adhere to this style using appropriate Tailwind CSS classes, spacing, and color palettes.
2. SCRIPTS: The "dev" script in package.json MUST be "vite --host 0.0.0.0".
3. VITE CONFIG: You MUST include a vite.config.js with:
   server: {
     host: '0.0.0.0',
     allowedHosts: ['.e2b.app']
   }
4. CONNECTIVITY: Ensure all API calls use the provided Backend API URL. Create a src/utils/api.js file:
   import axios from 'axios';
   const API_URL = '${apiContext}';
   export default API_URL;
   Then import and use API_URL in every page that needs data.
5. STYLING: Use Tailwind CSS classes.
6. MANDATORY COMPONENTS:
   - HEADER: Every project MUST have a professional Header/Navbar component at \`src/components/Header.jsx\` rendered in \`App.jsx\`.
   - FOOTER: Every project MUST have a Footer component at \`src/components/Footer.jsx\` rendered in \`App.jsx\`.
     The footer MUST contain this exact dynamic copyright notice: \`<p>&copy; \${new Date().getFullYear()} CreatedBy@MYTH. All rights reserved.</p>\`.

*** CRITICAL: ABSOLUTELY NO STATIC/HARDCODED DATA ***
This is the #1 most important rule. EVERY piece of data displayed on the website MUST come from the backend API.
- NEVER define hardcoded arrays of products, items, posts, users, or any data in your components.
- NEVER use const products = [{name: '...', price: ...}, ...] or similar static data.
- ALL data MUST be fetched from the backend API using axios.get() in a useEffect hook.
- The homepage featured section, shop page, product listings — ALL must call the API.
- Example for homepage featured products:
  useEffect(() => {
    axios.get(\`\${API_URL}/products\`).then(res => {
      setProducts(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
    }).catch(console.error);
  }, []);
- For images: Use the product's image/imageUrl field from the database. Use the item's own image field, NOT picsum placeholders for product data.
  <img src={product.image || product.imageUrl || 'https://picsum.photos/400/400'} />

CRITICAL MULTI-PAGE ROUTING RULES:
1. ROUTER IS PRE-CONFIGURED: The app's \`main.jsx\` ALREADY wraps <App /> with <BrowserRouter>. DO NOT import or add BrowserRouter in App.jsx or anywhere else. It is ALREADY in main.jsx.
2. ROUTING IN App.jsx: Use Routes and Route from react-router-dom in App.jsx to define pages:
   \`\`\`jsx
   import { Routes, Route } from 'react-router-dom';
   import HomePage from './pages/HomePage';
   import ShopPage from './pages/ShopPage';
   // ... etc
   function App() {
     return (
       <>
         <Header />
         <Routes>
           <Route path="/" element={<HomePage />} />
           <Route path="/shop" element={<ShopPage />} />
           <Route path="/product/:id" element={<ProductPage />} />
         </Routes>
         <Footer />
       </>
     );
   }
   \`\`\`
3. NAVIGATION: Use \`<Link to="/path">\` from react-router-dom for navigation links (NOT <a href>). Use \`useNavigate()\` for programmatic navigation.
4. PAGE STRUCTURE: Create individual page components inside \`src/pages/\` folder. Each page should be a separate file (e.g., HomePage.jsx, ShopPage.jsx, ProductPage.jsx).
5. SHARED COMPONENTS: Create reusable components in \`src/components/\` folder (e.g., ProductCard.jsx, Sidebar.jsx).
6. ALWAYS generate multi-page apps when the prompt suggests multiple views, sections, or roles (e.g., "home page and shop page" = 2+ routes).

CRITICAL NO-ADMIN RULE:
- DO NOT include ANY admin panel, admin page, admin route, or admin link in the frontend website.
- The admin functionality is handled by a COMPLETELY SEPARATE application. NEVER generate /admin route, AdminPage.jsx, or any admin-related navigation link.
- If the user mentions admin in the description, IGNORE it for the frontend — the admin will be generated separately.

CRITICAL VISUAL DESIGN RULES:
1. IMAGES: For hero sections and banners, use https://picsum.photos. But for product/data images, ALWAYS use the image field from the API response.
   - Hero banner: \`<img src="https://picsum.photos/seed/hero/1200/600" alt="Hero" />\`
   - Product card: \`<img src={product.image || product.imageUrl || 'https://picsum.photos/seed/placeholder/400/400'} alt={product.name} />\`
2. ICONS: Use icons from \`react-icons\` (e.g., \`import { FiShoppingCart, FiUser } from 'react-icons/fi'\`) or \`lucide-react\` (e.g., \`import { ShoppingCart, User } from 'lucide-react'\`). Both packages are pre-installed. DO NOT use plain text emoji or SVG icons.
3. RICH UI: Generate visually rich, premium-looking interfaces:
   - Cards with shadows, hover effects, and transitions
   - Gradient backgrounds and accent colors
   - Proper spacing, typography hierarchy, and responsive design
   - Loading states and empty states
   - Animations using Tailwind's transition and animate utilities

CRITICAL DEFENSIVE CODING RULES (MUST FOLLOW):
1. STATE INITIALIZATION: ALWAYS initialize array state with empty arrays, NEVER null or undefined:
   - CORRECT: const [products, setProducts] = useState([])
   - WRONG: const [products, setProducts] = useState(null)
2. SAFE ARRAY OPERATIONS: ALWAYS use Array.isArray() checks before .map(), .filter(), .find(), .reduce():
   - CORRECT: {Array.isArray(products) && products.length > 0 ? products.map(...) : <EmptyState />}
   - WRONG: {products.map(...)}
3. API RESPONSE EXTRACTION: The backend returns PLAIN ARRAYS. Extract data safely:
   - CORRECT: const data = response.data; setProducts(Array.isArray(data) ? data : data.products || data.items || []);
   - This handles both array responses AND accidentally wrapped responses.
4. EMPTY STATE UI: Every list/grid that shows data MUST have an empty state message:
   - Show "No products available yet" or similar friendly message when the array is empty
   - Show a loading spinner/skeleton while data is being fetched
   - Show an error message with retry button if the API call fails
5. ERROR BOUNDARIES: Every page component MUST wrap its API calls in try/catch:
   \`\`\`jsx
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   useEffect(() => {
     const fetchData = async () => {
       try {
         const res = await axios.get(\`\${API_URL}/items\`);
         setItems(Array.isArray(res.data) ? res.data : []);
       } catch (err) {
         setError('Failed to load data');
         console.error(err);
       } finally {
         setLoading(false);
       }
     };
     fetchData();
   }, []);
   if (loading) return <div className="text-center py-20">Loading...</div>;
   if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
   \`\`\`
6. CONDITIONAL RENDERING: Before rendering any dynamic data, check it exists:
   - CORRECT: {product?.name || 'Unnamed Product'}
   - CORRECT: {product?.price ? \`$\${product.price}\` : 'Price unavailable'}
DO NOT generate any backend code.`;
    } else if (layer === 'admin') {
      const schemaHint = backendSchema ? `\n\nBACKEND MODEL SCHEMA (use these EXACT field names for forms and tables):\n${backendSchema}\n` : '';
      layerInstruction = `Focus ONLY on generating an ADMIN DASHBOARD / CMS PANEL (React/Vite). Use this Backend API URL: ${apiContext}.
This is a SEPARATE application from the main frontend website. It is an admin control panel for managing all data.
${schemaHint}

CRITICAL ADMIN DASHBOARD RULES:
1. STYLE: ALWAYS use a CLEAN WHITE/LIGHT theme. NEVER use dark mode. The admin dashboard MUST be white-themed:
   - Background: white (#ffffff) or very light gray (#f8fafc, #f1f5f9)
   - Sidebar: white or light gray (#f8fafc) with a subtle border
   - Cards and tables: white with subtle gray borders
   - Text: dark gray/black (#1e293b, #334155)
   - Primary accent: blue (#3b82f6) for buttons, links, active states
   - Danger: red (#ef4444) for delete buttons
   - Success: green (#22c55e) for success states
   - Use Tailwind CSS with bg-white, bg-gray-50, text-gray-800, etc.
2. SCRIPTS: The "dev" script in package.json MUST be "vite --host 0.0.0.0".
3. VITE CONFIG: You MUST include a vite.config.js with:
   server: {
     host: '0.0.0.0',
     allowedHosts: ['.e2b.app']
   }
4. API CONNECTIVITY: Create an api.js utility file:
   - import axios from 'axios';
   - const API = axios.create({ baseURL: '${apiContext}' });
   - Export API instance and use it across all pages
   - Every page that needs data should import API from '../utils/api'
5. LAYOUT: The admin dashboard MUST have:
   - A clean white sidebar with navigation links to each data section, with icons
   - A top bar showing "Admin Dashboard" title with a subtle shadow
   - Main content area with proper padding and spacing
6. FULL CRUD OPERATIONS: For EVERY model/collection in the backend (products, users, orders, posts, etc.):
   - LIST VIEW: Clean data table with white background, alternating row colors, showing all key fields, plus Edit and Delete action buttons per row
   - CREATE: A prominent "Add New" button that opens a modal/form with all required fields
   - EDIT: Clicking edit opens a pre-filled modal/form to update the item
   - DELETE: Clicking delete shows a confirmation dialog before calling DELETE endpoint
   - API calls: GET /api/[resource], POST /api/[resource], PUT /api/[resource]/:id, DELETE /api/[resource]/:id
   - After every create/update/delete, refetch the data list to show fresh state
7. DASHBOARD OVERVIEW PAGE: Include a stats/overview page showing:
   - Stat cards with total counts for each collection (e.g., "Total Products: 24") in white cards with subtle shadows
   - Recent items added in a clean table
   - Quick action buttons (Add Product, View Users, etc.)
8. ROUTING: Use react-router-dom with BrowserRouter. The main.jsx must wrap App in BrowserRouter.
   - / -> Dashboard overview
   - /products -> Products CRUD page
   - /users -> Users CRUD page (etc. for each model)
9. MANDATORY FILE STRUCTURE:
   - src/utils/api.js (axios instance with baseURL)
   - src/components/Sidebar.jsx (white sidebar with navigation)
   - src/components/DataTable.jsx (reusable white table component)
   - src/components/Modal.jsx (reusable modal for create/edit forms)
   - src/components/StatsCard.jsx (white stat cards with shadow)
   - src/components/ConfirmDialog.jsx (delete confirmation)
   - src/pages/Dashboard.jsx (overview with stats)
   - src/pages/[Resource]Page.jsx (CRUD page for each model)
10. DEFENSIVE CODING: Same rules as frontend — useState([]), Array.isArray() checks, loading/error states with spinners.
11. ICONS: Use ONLY the "react-icons" library for ALL icons (it is pre-installed). Import from react-icons/fi, react-icons/hi, react-icons/md, etc. Example: import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'. DO NOT use @heroicons/react, @mui/icons-material, or lucide-react — they are NOT available.
12. FOOTER: Must contain: \`<p>&copy; \${new Date().getFullYear()} Admin Panel — Powered by MYTH 2.0</p>\`
13. SCHEMA-AWARE FORMS: The create/edit forms MUST be smart and helpful:
    - Every form field MUST have a descriptive placeholder showing an EXAMPLE VALUE that matches the backend model.
    - For example, if the model has fields: name, price, description, category, imageUrl, the form should show:
      * Name: placeholder="e.g., Nike Air Max 90"
      * Price: placeholder="e.g., 129.99"
      * Description: placeholder="e.g., Classic running shoes with Air cushioning"
      * Category: If there are fixed categories, use a <select> dropdown listing ALL possible categories. If categories are free-form, show placeholder="e.g., Shoes, Clothing, Accessories"
      * Image URL: placeholder="e.g., https://picsum.photos/seed/product1/400/400"
    - Add a helper text below each field showing format requirements (e.g., "Must be a valid URL" for image URLs, "Numeric value" for prices).
    - For image URLs, add a note: "Tip: Use https://picsum.photos/seed/[name]/400/400 for test images"
14. FORM VALIDATION: Add client-side validation:
    - Required fields should show a red border and error message when empty
    - Price fields should validate as positive numbers
    - URL fields should validate as proper URLs (start with http:// or https://)
    - Show validation errors before submission
15. SAMPLE DATA DISPLAY: When the data table is empty, show a helpful message:
    - "No items found. Click '+ Add New' to create your first entry."
    - Below the message, show a small example card showing what a typical entry looks like with sample data
DO NOT generate any backend code. The backend already exists with all necessary CRUD endpoints.`;
    }

    const systemPrompt = `You are an expert MERN stack developer. You will generate complete, production-ready code.
${isEdit ? 'The user is requesting MODIFICATIONS to an existing codebase. Act as a surgical editor.' : 'You are creating a new application layer.'}
${layerInstruction}

CRITICAL ARCHITECTURE RULES FOR BACKEND:
1. BINDING: The server MUST listen on '0.0.0.0' and port 3001.
2. HEALTH CHECK: You MUST include a GET /health endpoint that returns { "status": "ok" }.
3. ROUTING: All API routes MUST be prefixed with "/api" (e.g., app.use('/api/todos', ...)).
4. NON-BLOCKING DB: DO NOT await the database connection before starting the server. Start the server immediately so the health check passes.
5. CORS: You MUST use this exact CORS configuration to prevent network errors (credentials: true requires reflecting the origin):
   app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
   app.options('*', cors());
6. LOGGING: You MUST include a request logger to help the user debug database calls:
   app.use((req, res, next) => {
     console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
     if (Object.keys(req.body).length) console.log('Body:', JSON.stringify(req.body, null, 2));
     next();
   });

CRITICAL COHERENCE RULES:
1. SCHEMA CONSISTENCY: The frontend AND admin MUST use the EXACT SAME field names as the backend Mongoose models. If the backend model has { name, price, description, category, image }, the frontend must access product.name, product.price, product.description, product.category, product.image — NOT product.title or product.img.
   - If a BACKEND MODEL SCHEMA is provided above, follow it EXACTLY.
   - NEVER rename or alias fields between layers.
   - Ensure the frontend sends JSON body fields that EXACTLY match the backend schema.
2. API BASE URL: The provided Backend API URL (context) ALREADY includes the "/api" prefix. 
   - DO NOT append "/api" again in your request paths.
   - Example: If the URL is "https://.../api", a call to fetch todos should be \`\${API_URL}/todos\`.
3. ERROR HANDLING: Always include try/catch blocks in frontend API calls and log the full error to the console.
4. NO STATIC DATA: The frontend and admin dashboard MUST fetch ALL their data from the backend API. Never hardcode sample data arrays in React components.

${isEdit ? `
EDIT MODE RULES — SURGICAL MODIFICATIONS:
You are modifying an EXISTING, WORKING codebase. Follow these rules STRICTLY:
1. ONLY output files that actually need changes. Do NOT re-output unchanged files.
2. Output the COMPLETE content of any file you DO change (not just the diff).
3. Maintain ALL existing architecture, imports, API URLs, and patterns.
4. If the user asks for a visual/UI change (theme, colors, layout, button style):
   - ONLY modify the relevant frontend files (CSS, component JSX).
   - Do NOT regenerate the backend, routes, or API logic.
5. If the user asks for a data/logic change (add a field, new endpoint):
   - Modify both backend model/route AND the frontend components that use them.
6. PRESERVE the existing file paths — do not rename or reorganize files unless explicitly asked.
7. Keep ALL existing functionality working. Do not remove features the user didn't ask to remove.
` : ''}

EXAMPLE COMPLIANT server.js:
  \`\`\`javascript
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
app.options('*', cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
  next();
});

// Mandatory Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Database connection (Non-blocking)
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

// Routes and Middleware...

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on 0.0.0.0:\${PORT}\`);
});
\`\`\`

OUTPUT FORMAT:
Use XML tags <frontend> or <backend> with <file path="...">...</file> for files.
`;

    const codebaseContext = isEdit && currentCodebase.length > 0
      ? `\nCURRENT CODEBASE:\n${currentCodebase.map((f: any) => `<file path="${f.path}">${f.content}</file>`).join('\n')}`
      : '';

    const userPrompt = `Application Goal: ${prompt}
Layer requested: ${layer}
Selected Style: ${style}
${apiContext ? (layer === 'backend' ? `MongoDB Connection String: ${apiContext}` : `Backend API URL: ${apiContext}`) : ''}
${codebaseContext}

Generate ${isEdit ? 'ONLY the modified' : 'complete'} files for the requested layer(s). ${isEdit ? 'Remember: output ONLY files that need changes, with their COMPLETE updated content.' : ''}`;

    // NORMAL AI SDK PATH
    const result = await streamText({
      model: selectedModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send thinking start
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', text: 'Planning your MERN application...' })}\n\n`));

          let fullText = '';

          for await (const chunk of result.textStream) {
            fullText += chunk;

            // Stream the raw text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'stream',
              text: chunk,
              raw: true
            })}\n\n`));
          }

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            generatedCode: fullText
          })}\n\n`));

          controller.close();
        } catch (error: any) {
          console.error('[Generate MERN Code] Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Generate MERN Code] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate code' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
