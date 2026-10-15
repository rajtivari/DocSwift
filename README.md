# DocSwift

A premium, responsive, open-source PDF toolkit built with React, Vite, Express and pdf-lib. No login system is included.

## Current tools
- **Merge PDF** — combine multiple PDFs in upload order.
- **Split PDF** — extract selected pages.
- **Rotate PDF** — rotate pages by 90°, 180° or 270°.
- **Reorder pages** — specify the complete page order.
- **JPG/PNG to PDF** — make one PDF page per image.
- **PDF details** — inspect page count, size, title and author.
- **Optimize PDF** — rewrite PDF structure. This does not guarantee a smaller file or recompress every embedded image.

## Stack
React 18 · Vite · Express · pdf-lib · Multer · Lucide

## Run locally
Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:5173`; the API runs on port 4000. The Vite dev server proxies `/api` to Express.

Production:

```bash
npm run build
npm start
```

## Deploy to Render
1. Create a Render **Web Service** from this repository.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Select Node 20+ and set `NODE_ENV=production`.
5. Deploy, then verify `/api/health` and test each tool with non-sensitive sample PDFs.
6. Update canonical, Open Graph, Twitter, sitemap and robots URLs from the placeholder `https://docswift.onrender.com` to the actual production domain.

## Launch checklist
- [x] Unique page title and meta description.
- [x] Open Graph/Twitter metadata and share artwork.
- [x] Favicon and accessible labels for interactive controls.
- [x] Internal navigation, FAQ and privacy notice.
- [x] Sitemap and robots.txt.
- [x] Custom 404 page file.
- [x] Contribution guide.
- [ ] Deploy and verify HTTPS end-to-end.
- [ ] Submit the final sitemap in Google Search Console after the domain is stable.
- [ ] Configure production rate limits, upload/time limits, monitoring and abuse protection.
- [ ] Replace draft privacy notice with accurate operator/provider details and retention practices.
- [ ] Add analytics only if needed, with applicable privacy disclosures and consent.
- [ ] Add a real contact/feedback workflow before forms. Do not invent testimonials.

## Privacy and security
Uploads are held in memory during processing and are not intentionally written to disk by this code. This does not prove that all infrastructure, logs, or hosting providers retain no data. Files are uploaded to the server; avoid sensitive documents until deployment practices are reviewed. This starter does not include Google Analytics, tracking cookies, contact forms, or testimonials, so a cookie banner, form spam protection, and thank-you page are not currently needed.

Before public launch, add rate limiting and request timeouts, consider content validation, monitor memory usage, test malformed/encrypted PDFs, and review your hosting provider's privacy and security practices. For larger traffic, move CPU-heavy jobs to a queue/worker.

## Limitations
PDF-to-Word, Word-to-PDF, OCR, signatures, visual PDF editing and true image recompression are not implemented. Some encrypted, malformed, or advanced PDFs may fail.

## License
MIT license intended. Add the `LICENSE` file before publishing a release. See `CONTRIBUTING.md` for contribution guidance.