/**
 * TypeScript types for Firecrawl scraped data
 * Based on the structure returned from web and news searches
 */

/**
 * Metadata associated with scraped web pages and news articles
 * Contains various tags, social media metadata, and scraping information
 */
export interface Metadata {
  // Open Graph metadata
  "og:type"?: string;
  "og:title"?: string;
  "og:description"?: string;
  "og:url"?: string;
  "og:image"?: string | string[];
  "og:image:width"?: string;
  "og:image:height"?: string;
  "og:image:type"?: string;
  "og:locale"?: string;
  "og:site_name"?: string;

  // Twitter metadata
  "twitter:card"?: string;
  "twitter:title"?: string;
  "twitter:description"?: string;
  "twitter:image"?: string | string[];
  "twitter:site"?: string;
  "twitter:creator"?: string;
  "twitter:label1"?: string;
  "twitter:data1"?: string;
  "twitter:label2"?: string;
  "twitter:data2"?: string;
  "twitter:url"?: string;
  "twitter:tile:image"?: string;
  "twitter:tile:image:alt"?: string;

  // Article metadata
  "article:published_time"?: string;
  "article:modified_time"?: string;
  "article:publisher"?: string;
  "article:author"?: string;
  "article:tag"?: string | string[];
  "article:content_tier"?: string;
  "article:opinion"?: string;

  // Page metadata
  title?: string;
  description?: string;
  author?: string;
  viewport?: string | string[];
  language?: string;
  favicon?: string;
  generator?: string | string[];
  robots?: string | string[];
  referrer?: string;

  // Alternative naming conventions
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string | string[];
  ogLocale?: string;
  ogSiteName?: string;

  // Time-related metadata
  publishedTime?: string;
  modifiedTime?: string;

  // Technical metadata
  "format-detection"?: string;
  "color-scheme"?: string;
  HandheldFriendly?: string;
  "msapplication-TileImage"?: string;
  renderer?: string | string[];
  "force-rendering"?: string | string[];
  "next-head-count"?: string | string[];

  // Android app linking
  "al:android:url"?: string;
  "al:android:package"?: string;

  // SEO and verification
  "google-site-verification"?: string;

  // Parsely metadata (analytics)
  "parsely-title"?: string;
  "parsely-link"?: string;
  "parsely-section"?: string;
  "parsely-post-id"?: string;
  "parsely-pub-date"?: string;
  "parsely-image-url"?: string;

  // Sailthru metadata (email marketing)
  "sailthru.title"?: string;
  "sailthru.author"?: string;

  // Lotame (audience data)
  "lotame-bbg-category"?: string;

  // Facebook metadata
  "fb:status"?: string;

  // ISO date
  "iso-8601-publish-date"?: string;

  // Firecrawl-specific scraping metadata
  scrapeId?: string;
  sourceURL?: string;
  url?: string;
  statusCode?: number;
  contentType?: string;
  proxyUsed?: string;
  cacheState?: string;
  cachedAt?: string;

  // Framer-specific (for sites built with Framer)
  "framer-search-index"?: string;
  "framer-search-index-fallback"?: string;
  "framer-html-plugin"?: string;

  // Other framework-specific
  "tec-api-version"?: string;
  "tec-api-origin"?: string;
}

/**
 * A single key point extracted from article content
 * Can represent different types of information depending on the source
 */
export interface KeyPoint {
  // Common fields
  title?: string;
  content?: string;

  // Alternative naming for tools/products
  name?: string;
  type?: string;
  description?: string;

  // For more detailed content
  details?: string;
}

/**
 * AI-generated summary and key points from scraped content
 */
export interface JsonSummary {
  summary: string;
  keyPoints: KeyPoint[];
}

/**
 * A single web search result from Firecrawl
 */
export interface WebResult {
  url: string;
  title: string;
  description: string;
  position: number;
  metadata?: Metadata;
  json?: JsonSummary;
}

/**
 * A single news article result from Firecrawl
 */
export interface NewsResult {
  title: string;
  url: string;
  snippet: string;
  date: string;
  imageUrl?: string;
  position: number;
  description?: string;
  metadata?: Metadata;
  json?: JsonSummary;
}

/**
 * Root interface for all scraped data stored in topic.scrapedData
 * This is the top-level structure returned from Firecrawl searches
 */
export interface ScrapedData {
  web: WebResult[];
  news: NewsResult[];
}
