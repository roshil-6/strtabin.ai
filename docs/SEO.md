# Public search content

Edit `src/content/publicContent.ts` for feature descriptions, FAQ copy, public page titles and descriptions. The home and features pages use this shared content. Do not add features that are not available, guarantee full offline behavior, or claim capsules automatically attach files to external AI services.

`npm run build` generates readable public HTML at `dist/index.html` and `dist/features/index.html`, plus a noindex `dist/app.html` for private app routes. Vercel rewrites must stay aligned with these files. This is a static public-content fallback followed by the React app, not full React server rendering. No user data is included in generated pages.

Canonical URLs, social metadata, organization/software schema, robots and sitemap use https://www.stratabin.com. Only home and features are in the sitemap. Private routes receive noindex metadata; this is not an access-control mechanism. Authentication still protects private data. No fabricated reviews, ratings or FAQ rich-result promises are included.

Deploy to Vercel, verify both public URLs and a private URL, then submit https://www.stratabin.com/sitemap.xml in Google Search Console and request recrawling for home and features. Existing search snippets may take time to change. Domain redirects (non-www to www) should be configured consistently in Vercel Domains.

Validation: `npm run build`, then `node --test tests/seo.test.mjs`. The built-HTML check skips if no production build is present. Existing social image is retained; it contains no retired code-editor claim.
