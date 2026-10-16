# DocSwift

A polished, responsive PDF and image toolkit built with React, Vite, pdf-lib, PDF.js and Tesseract.js. The frontend processes documents in the browser; no account is required to use the free tools.

## Available tools

### Organize PDFs
- **Merge PDF** — combine PDFs in the order selected.
- **Split PDF** — extract pages or page ranges.
- **Reorder pages** — specify a complete page order.
- **Rotate PDF** — rotate pages by 90°, 180° or 270°.
- **Delete PDF pages** — remove page numbers or ranges while keeping at least one page.
- **Add blank page** — append a blank page matching the document's first page size.
- **Crop PDF** — adjust the visible crop box by a percentage.
- **Page numbers** — add page numbers to each page.
- **Watermark PDF** — stamp custom text on every page.

### Convert and extract
- **Images to PDF** — combine JPG/PNG images into a PDF.
- **PDF to JPG / PNG** — export one selected page as an image.
- **Extract PDF text** — export selectable text to TXT.
- **PDF to Word** — place selectable PDF text into an editable DOCX.
- **PDF to Markdown / HTML** — export selectable text into those formats.
- **OCR PDF** — recognize text from scanned pages and download it as TXT.

### Optimize and inspect
- **Compress PDF** — lossless rewrite or image-based compression at different quality levels.
- **Image compressor** — compress a JPG, PNG or WebP image.
- **PDF details** — inspect page count, file size, title and author.
- **Edit PDF metadata** — set title, author and subject.

## Important compression details

Lossless PDF rewriting preserves page content but may not reduce the file size. Image-based compression renders pages as images and rebuilds the PDF; it may reduce size, but selectable text, links, forms, accessibility information and other interactive content can be lost. If the generated file is not smaller, DocSwift downloads the original instead. Keep an original copy of important documents.

Image compression outputs a compressed image; PNG transparency is flattened to white when converting to JPEG.

## Stack

React 18 · Vite · PDF.js · pdf-lib · Tesseract.js · docx · Express · Multer · Lucide React

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:5173`; the optional Express API runs on port 4000.

Production:

```bash
npm run build
npm start
```

## Deploy the API to Render

1. Create a Render **Web Service** from this repository.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Select Node 20+ and set `NODE_ENV=production`.
5. Verify `/api/health` and test each tool with non-sensitive sample PDFs.

The current frontend tool flows run in the browser; the Express API also includes PDF endpoints and a Razorpay test-mode billing flow. Do not treat browser-local plan flags as secure production authorization.

## Privacy and security

Selected files are processed in the browser by the current tool interface and are not intentionally uploaded by those tool flows. This statement does not cover hosting logs, browser extensions, or third-party infrastructure outside the frontend's control. Avoid uploading sensitive documents to any online service unless its privacy practices meet your needs.

Before public launch, review hosting settings, set appropriate file and request limits, add rate limiting and monitoring to API routes, and test malformed, encrypted and unusually large PDFs. Do not commit API keys or payment secrets. Live payments should remain disabled until accounts, database-backed entitlements, verified webhooks, refunds and server-enforced authorization are implemented.

## Known limitations

- PDF-to-Word, Markdown and HTML exports preserve selectable text, not the original page layout.
- OCR exports recognized text to TXT; it does not currently create a searchable OCR PDF.
- Image-based PDF compression rasterizes pages and may remove interactive features.
- Encrypted, malformed or advanced PDFs may fail.

## License

MIT. See [LICENSE](LICENSE). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
