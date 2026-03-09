import { NextRequest, NextResponse } from 'next/server';
import { requireCredits, CREDIT_COSTS } from '@/lib/credits';

// Function to sanitize smart quotes and other problematic characters
function sanitizeQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u00AB\u00BB]/g, '"')
    .replace(/[\u2039\u203A]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ');
}

interface ContextualImage {
  url: string;
  alt: string;
  context: string;       // surrounding text / section heading
  sectionHint: string;   // best guess: "hero", "product", "logo", "promo", "icon", etc.
}

/**
 * Extract images from HTML with their surrounding context.
 * Instead of a flat URL list, we return objects that tell the AI
 * "this image was found near text X with alt Y".
 */
function extractImagesWithContext(rawHtml: string, pageUrl: string): ContextualImage[] {
  const baseUrl = new URL(pageUrl);
  const results: ContextualImage[] = [];
  const seenUrls = new Set<string>();

  // Helper to resolve a URL
  function resolve(src: string): string | null {
    try {
      if (src.startsWith('data:') || src.length < 5) return null;
      if (src.startsWith('//')) return 'https:' + src;
      if (src.startsWith('/')) return baseUrl.origin + src;
      if (src.startsWith('http')) return src;
      return new URL(src, pageUrl).href;
    } catch { return null; }
  }

  // Helper: grab up to N chars of visible text around a position in HTML
  function getSurroundingText(html: string, pos: number, radius: number = 500): string {
    const start = Math.max(0, pos - radius);
    const end = Math.min(html.length, pos + radius);
    const snippet = html.slice(start, end);
    // Strip tags to get visible text
    return snippet
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  }

  // Helper: infer section hint from URL path + alt + context
  function inferSectionHint(url: string, alt: string, context: string): string {
    const combined = (url + ' ' + alt + ' ' + context).toLowerCase();

    // Logo detection
    if (/logo|favicon|brand|icon.*logo/i.test(combined)) return 'logo';
    // Navigation / tiny icons
    if (/icon|chevron|arrow|caret|close|menu|hamburger|search/i.test(alt.toLowerCase())
      && !/(phone|mac|ipad|watch|airpod)/i.test(alt.toLowerCase())) return 'icon';
    // Product images - check URL path for known product names
    const productKeywords = [
      'iphone', 'ipad', 'macbook', 'mac-pro', 'imac', 'mac-mini', 'mac-studio',
      'airpod', 'apple-watch', 'watch', 'homepod', 'apple-tv', 'vision-pro',
      'pencil', 'keyboard', 'trackpad', 'magic-mouse', 'airtag', 'beats'
    ];
    for (const kw of productKeywords) {
      if (combined.includes(kw)) return `product:${kw}`;
    }
    // Hero / banner
    if (/hero|banner|promo|billboard|showcase|landing/i.test(combined)) return 'hero';
    // Gallery / lifestyle
    if (/gallery|lifestyle|film|show|tv|series|movie/i.test(combined)) return 'promo/entertainment';
    return 'general';
  }

  // ──────────── 1. <img> tags ────────────
  const imgTagRegex = /<img\s[^>]*?(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgTagRegex.exec(rawHtml)) !== null) {
    const resolved = resolve(match[1]);
    if (!resolved || seenUrls.has(resolved)) continue;

    // Skip tiny tracker pixels & SVG data
    if (/1x1|pixel|spacer|blank\./i.test(resolved)) continue;

    // Also try to grab data-src if src was a placeholder
    const dataSrcMatch = match[0].match(/data-src=["']([^"']+)["']/i);
    const actualUrl = dataSrcMatch ? (resolve(dataSrcMatch[1]) || resolved) : resolved;
    if (seenUrls.has(actualUrl)) continue;
    seenUrls.add(actualUrl);

    // Extract alt text
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1].trim() : '';

    const context = getSurroundingText(rawHtml, match.index);
    const sectionHint = inferSectionHint(actualUrl, alt, context);

    // Skip icons/tiny decorative images unless they're logos
    if (sectionHint === 'icon') continue;

    results.push({ url: actualUrl, alt, context, sectionHint });
  }

  // ──────────── 2. <source srcset> ────────────
  const sourceRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
  while ((match = sourceRegex.exec(rawHtml)) !== null) {
    // Take the highest-resolution image from srcset
    const candidates = match[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    const bestSrc = candidates[candidates.length - 1]; // last is usually highest res
    const resolved = resolve(bestSrc);
    if (!resolved || seenUrls.has(resolved)) continue;
    if (/1x1|pixel|spacer/i.test(resolved)) continue;
    seenUrls.add(resolved);

    const context = getSurroundingText(rawHtml, match.index);
    const sectionHint = inferSectionHint(resolved, '', context);
    if (sectionHint === 'icon') continue;

    results.push({ url: resolved, alt: '', context, sectionHint });
  }

  // ──────────── 3. og:image / twitter:image ────────────
  const ogRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogRegex.exec(rawHtml)) !== null) {
    const resolved = resolve(match[1]);
    if (!resolved || seenUrls.has(resolved)) continue;
    seenUrls.add(resolved);
    results.push({ url: resolved, alt: 'Open Graph image', context: 'Page social preview image', sectionHint: 'hero' });
  }

  // ──────────── 4. CSS background-image ────────────
  const bgRegex = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(rawHtml)) !== null) {
    const resolved = resolve(match[1]);
    if (!resolved || seenUrls.has(resolved)) continue;
    seenUrls.add(resolved);
    const context = getSurroundingText(rawHtml, match.index);
    const sectionHint = inferSectionHint(resolved, '', context);
    if (sectionHint === 'icon') continue;
    results.push({ url: resolved, alt: '', context, sectionHint });
  }

  return results;
}

/**
 * Build a human-readable, AI-friendly image catalog grouped by section.
 */
function buildImageCatalog(images: ContextualImage[]): string {
  if (images.length === 0) return '';

  // Group by sectionHint
  const groups: Record<string, ContextualImage[]> = {};
  for (const img of images) {
    const key = img.sectionHint;
    if (!groups[key]) groups[key] = [];
    groups[key].push(img);
  }

  let catalog = '\n\n=== IMAGE CATALOG (USE THESE EXACT URLs) ===\n';
  catalog += 'Below are images extracted from the original page, GROUPED BY SECTION.\n';
  catalog += 'Match each image to the CORRECT section in your React code.\n\n';

  for (const [section, imgs] of Object.entries(groups)) {
    catalog += `--- ${section.toUpperCase()} ---\n`;
    for (const img of imgs) {
      catalog += `  URL: ${img.url}\n`;
      if (img.alt) catalog += `  Alt: ${img.alt}\n`;
      if (img.context) catalog += `  Context: "${img.context.slice(0, 120)}"\n`;
      catalog += '\n';
    }
  }

  catalog += '=== END IMAGE CATALOG ===\n';
  return catalog;
}


export async function POST(request: NextRequest) {
  try {
    // Deduct credits before scraping
    const creditResult = await requireCredits(CREDIT_COSTS.URL_CLONE, 'URL Clone — Firecrawl website scrape');
    if (creditResult.ok === false) return creditResult.response;

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    console.log('[scrape-url-enhanced] Scraping with Firecrawl:', url);

    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    // Make request to Firecrawl API
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        waitFor: 3000,
        timeout: 30000,
        blockAds: true,
        maxAge: 3600000,
        actions: [
          {
            type: 'wait',
            milliseconds: 1500
          },
          {
            type: 'scroll',
            direction: 'down',
            amount: 5
          },
          {
            type: 'wait',
            milliseconds: 500
          }
        ]
      })
    });

    if (!firecrawlResponse.ok) {
      const error = await firecrawlResponse.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await firecrawlResponse.json();

    if (!data.success || !data.data) {
      throw new Error('Failed to scrape content');
    }

    const { markdown, html, metadata } = data.data;

    // Sanitize the markdown content
    const sanitizedMarkdown = sanitizeQuotes(markdown || '');

    // Extract structured data from the response
    const title = metadata?.title || '';
    const description = metadata?.description || '';

    // ── Extract images WITH context ──
    const contextualImages = extractImagesWithContext(html || '', url);
    const imageCatalog = buildImageCatalog(contextualImages);
    const flatImageUrls = contextualImages.map(img => img.url);

    console.log(`[scrape-url-enhanced] Extracted ${contextualImages.length} contextual images from HTML`);

    // Format content for AI
    const formattedContent = `
Title: ${sanitizeQuotes(title)}
Description: ${sanitizeQuotes(description)}
URL: ${url}
${imageCatalog}
Main Content:
${sanitizedMarkdown}
    `.trim();

    return NextResponse.json({
      success: true,
      url,
      content: formattedContent,
      images: flatImageUrls,
      contextualImages,
      structured: {
        title: sanitizeQuotes(title),
        description: sanitizeQuotes(description),
        content: sanitizedMarkdown,
        images: flatImageUrls,
        contextualImages,
        url
      },
      metadata: {
        scraper: 'firecrawl-enhanced',
        timestamp: new Date().toISOString(),
        contentLength: formattedContent.length,
        imageCount: contextualImages.length,
        cached: data.data.cached || false,
        ...metadata
      },
      message: 'URL scraped successfully with Firecrawl (with image context extraction)'
    });

  } catch (error) {
    console.error('[scrape-url-enhanced] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}