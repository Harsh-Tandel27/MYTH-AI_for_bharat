/* Default editable data templates for each section type */

export interface SectionData {
    [key: string]: any;
}

export const DEFAULT_SECTION_DATA: Record<string, SectionData> = {
    navbar: {
        brand: "YourBrand",
        links: "auto", // "auto" = derived from sections on canvas
        ctaText: "Get Started",
        bgColor: "#0c0c0c",
    },
    hero: {
        badge: "✨ Welcome to the future",
        heading: "Build Something",
        headingHighlight: "Amazing",
        description: "Create stunning websites with our powerful platform. No coding required.",
        primaryBtn: "Get Started Free",
        secondaryBtn: "Learn More →",
    },
    features: {
        title: "Powerful Features",
        subtitle: "Everything you need to succeed",
        items: [
            { icon: "⚡", label: "Lightning Fast", desc: "High performance solution" },
            { icon: "🔒", label: "Secure", desc: "Enterprise-grade security" },
            { icon: "📈", label: "Scalable", desc: "Grows with your business" },
        ],
    },
    testimonials: {
        title: "What People Say",
        subtitle: "Trusted by thousands",
        items: [
            { name: "Sarah J.", role: "CEO", text: "Absolutely incredible product. Changed our workflow completely." },
            { name: "Mike T.", role: "Developer", text: "Best tool I've used. Super intuitive and powerful interface." },
        ],
    },
    pricing: {
        title: "Simple Pricing",
        subtitle: "Choose your plan",
        plans: [
            { name: "Starter", price: "$9", period: "/month", features: ["5 Projects", "1 GB Storage", "Basic Support"], popular: false },
            { name: "Pro", price: "$29", period: "/month", features: ["Unlimited Projects", "10 GB Storage", "Priority Support"], popular: true },
            { name: "Enterprise", price: "$99", period: "/month", features: ["Everything", "Unlimited Storage", "24/7 Support"], popular: false },
        ],
    },
    cta: {
        title: "Ready to Get Started?",
        description: "Join thousands of users building amazing websites today.",
        btnText: "Start Building — It's Free",
    },
    faq: {
        title: "FAQ",
        subtitle: "Common questions answered",
        items: [
            { q: "How does it work?", a: "Simply drag and drop sections to build your website visually." },
            { q: "Is there a free plan?", a: "Yes — start free and upgrade whenever you need more features." },
            { q: "Can I use my own domain?", a: "Absolutely, custom domains are fully supported on all plans." },
        ],
    },
    gallery: {
        title: "Gallery",
        subtitle: "Showcase your work",
        gradients: ["from-blue-500 to-purple-600", "from-green-500 to-teal-600", "from-orange-500 to-red-600", "from-pink-500 to-rose-600", "from-indigo-500 to-blue-600", "from-yellow-500 to-amber-600"],
    },
    contact: {
        title: "Get in Touch",
        subtitle: "We'd love to hear from you",
        fields: ["Your Name", "Email Address"],
        messageLabel: "Your Message",
        btnText: "Send Message",
    },
    footer: {
        brand: "YourBrand",
        tagline: "Building the future of web.",
        columns: [
            { title: "Product", links: ["Features", "Pricing", "API"] },
            { title: "Company", links: ["About", "Blog", "Careers"] },
            { title: "Legal", links: ["Privacy", "Terms", "Cookie"] },
        ],
        copyright: "© 2026 YourBrand. All rights reserved.",
    },
    chatbot: {
        systemPrompt: "You are a helpful website assistant. Answer questions about this website and help visitors.",
        apiKey: "",
        position: "bottom-right",
        botName: "AI Assistant",
        welcomeMessage: "Hi! How can I help you today?",
        accentColor: "#3b82f6",
    },
    custom: {
        title: "Custom Section",
        body: "Add your custom content here. Click to edit this text.",
        bgColor: "",
    },
    "ai-generated": {
        title: "AI Generated Section",
        htmlContent: "",
        prompt: "",
    },
    products: {
        title: "Our Products",
        subtitle: "Discover our best sellers",
        items: [
            { name: "Premium Headphones", price: "$129.99", desc: "Wireless ANC headphones with 40-hour battery", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", badge: "Best Seller" },
            { name: "Smart Watch Pro", price: "$299.99", desc: "Health tracking, GPS, and 5-day battery life", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", badge: "New" },
            { name: "Laptop Stand", price: "$79.99", desc: "Ergonomic aluminum stand for all laptops", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop", badge: "" },
            { name: "Wireless Charger", price: "$49.99", desc: "Fast 15W Qi charging pad with LED indicator", image: "https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=400&h=400&fit=crop", badge: "Sale" },
        ],
        btnText: "Shop Now",
    },
    team: {
        title: "Meet Our Team",
        subtitle: "The people behind the product",
        items: [
            { name: "Alex Johnson", role: "CEO & Founder", bio: "10+ years in tech leadership", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop" },
            { name: "Sarah Chen", role: "CTO", bio: "Former Google engineer", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop" },
            { name: "Mike Roberts", role: "Lead Designer", bio: "Award-winning UI/UX designer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop" },
        ],
    },
    stats: {
        title: "Our Impact",
        subtitle: "Numbers that speak for themselves",
        items: [
            { value: "10K+", label: "Happy Customers", icon: "👥" },
            { value: "99.9%", label: "Uptime", icon: "⚡" },
            { value: "50M+", label: "Requests Served", icon: "🚀" },
            { value: "24/7", label: "Support", icon: "🛡️" },
        ],
    },
    blog: {
        title: "Latest from the Blog",
        subtitle: "Insights, tips, and updates",
        items: [
            { title: "Getting Started with AI", excerpt: "Learn how artificial intelligence is transforming modern businesses and how to leverage it.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&h=300&fit=crop", date: "Feb 20, 2026", tag: "AI" },
            { title: "Design System Best Practices", excerpt: "Build consistent, scalable interfaces with a well-structured design system.", image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=500&h=300&fit=crop", date: "Feb 18, 2026", tag: "Design" },
            { title: "Scaling Your Startup", excerpt: "From MVP to millions of users — practical strategies for growth.", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=300&fit=crop", date: "Feb 15, 2026", tag: "Business" },
        ],
        btnText: "View All Posts",
    },
    services: {
        title: "Our Services",
        subtitle: "End-to-end solutions for your business",
        items: [
            { icon: "🎨", title: "UI/UX Design", desc: "Beautiful, intuitive interfaces that delight users and drive engagement.", btnText: "Learn More" },
            { icon: "💻", title: "Web Development", desc: "Full-stack web applications built with modern technologies and best practices.", btnText: "Learn More" },
            { icon: "📱", title: "Mobile Apps", desc: "Native and cross-platform mobile applications for iOS and Android.", btnText: "Learn More" },
            { icon: "☁️", title: "Cloud Solutions", desc: "Scalable cloud infrastructure and DevOps consulting services.", btnText: "Learn More" },
        ],
    },
    "data-ai": {
        title: "Live Product Feed",
        subtitle: "Data powered by Google Sheets",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1EHXO8_CMcrqq8XjUqErRPBfMEaMMRGq-IkDa2COlrlM/edit?usp=sharing",
        colProduct: "PRODUCT",
        colPrice: "PRICE",
        colDesc: "DESC",
        colImage: "IMAGEURL",
        currency: "₹",
        btnText: "Add to Cart",
        previewData: null,  // cached fetched data for editor preview
        design: null,       // AI-generated design: { containerStyle, cardHtml, columns }
    },
};

// Labels & colors for ALL section types including new ones
export const SECTION_TYPE_META: Record<string, { label: string; color: string; description: string }> = {
    navbar: { label: "Navbar", color: "#3b82f6", description: "Navigation bar with logo & links" },
    hero: { label: "Hero", color: "#8b5cf6", description: "Full-width hero with CTA" },
    features: { label: "Features", color: "#06b6d4", description: "Feature cards grid section" },
    testimonials: { label: "Testimonials", color: "#f59e0b", description: "Customer testimonial cards" },
    pricing: { label: "Pricing", color: "#10b981", description: "Pricing plans comparison" },
    products: { label: "Products", color: "#f97316", description: "Product cards with images & prices" },
    team: { label: "Team", color: "#06b6d4", description: "Team member cards with photos" },
    stats: { label: "Stats", color: "#eab308", description: "Metric counters & numbers" },
    blog: { label: "Blog", color: "#a855f7", description: "Blog post cards with images" },
    services: { label: "Services", color: "#14b8a6", description: "Service offerings grid" },
    "data-ai": { label: "Data AI", color: "#f59e0b", description: "Live data from Google Sheets" },
    cta: { label: "Call to Action", color: "#ef4444", description: "Conversion-focused CTA banner" },
    faq: { label: "FAQ", color: "#ec4899", description: "Frequently asked questions" },
    gallery: { label: "Gallery", color: "#14b8a6", description: "Image showcase grid" },
    contact: { label: "Contact", color: "#6366f1", description: "Contact form section" },
    footer: { label: "Footer", color: "#64748b", description: "Site footer with links & info" },
    chatbot: { label: "AI Chatbot", color: "#8b5cf6", description: "Floating Gemini chatbot widget" },
    custom: { label: "Custom", color: "#a855f7", description: "Custom content section" },
    "ai-generated": { label: "AI Section", color: "#f43f5e", description: "AI-generated custom section" },
};
