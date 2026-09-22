/**
 * Converter catalog — metadata only (no engine code), so it's safe to import
 * from server components, the usage API, the sitemap and client components.
 * Adding a converter = one entry here + one runner in ./run.ts.
 */

export type CategoryKey = 'image' | 'pdf' | 'data' | 'media';

export const CATEGORIES: Record<
  CategoryKey,
  { key: CategoryKey; name: string; short: string; description: string }
> = {
  image: {
    key: 'image',
    name: 'Image converters',
    short: 'Image',
    description: 'Convert between PNG, JPG, WebP, HEIC, SVG, AVIF, BMP, GIF and ICO in seconds.',
  },
  pdf: {
    key: 'pdf',
    name: 'PDF tools',
    short: 'PDF',
    description: 'Turn images and text files into PDFs, PDFs into images or text, and merge or split documents.',
  },
  data: {
    key: 'data',
    name: 'Data & document converters',
    short: 'Data & docs',
    description: 'Convert CSV, JSON, YAML, XML, Excel, Markdown and HTML without uploading anything.',
  },
  media: {
    key: 'media',
    name: 'Audio & video converters',
    short: 'Audio & video',
    description: 'Extract MP3 audio, convert FLAC, OGG and WAV, make GIFs, and turn MOV, MKV, AVI or WebM into MP4 — all on your device.',
  },
};

export type FormatKey =
  | 'PNG' | 'JPG' | 'WEBP' | 'HEIC' | 'SVG' | 'AVIF' | 'ICO' | 'BMP' | 'IMAGES'
  | 'PDF' | 'TXT'
  | 'CSV' | 'JSON' | 'YAML' | 'XML' | 'XLSX' | 'MD' | 'HTML'
  | 'MP4' | 'MP3' | 'WAV' | 'M4A' | 'FLAC' | 'OGG' | 'GIF' | 'MOV' | 'WEBM' | 'MKV' | 'AVI' | 'VIDEO';

export const FORMATS: Record<FormatKey, { label: string; description: string }> = {
  PNG: {
    label: 'PNG',
    description:
      'PNG (Portable Network Graphics) is a lossless image format with transparency support. It is ideal for screenshots, logos and graphics with sharp edges, but files are larger than JPG for photos.',
  },
  JPG: {
    label: 'JPG',
    description:
      'JPG (JPEG) is the most widely supported photo format. Its lossy compression keeps files small, which makes it perfect for photos, email and the web — but it does not support transparency.',
  },
  WEBP: {
    label: 'WebP',
    description:
      'WebP is a modern image format from Google that produces files 25–35% smaller than JPG or PNG at similar quality, with support for transparency and animation.',
  },
  HEIC: {
    label: 'HEIC',
    description:
      'HEIC (High Efficiency Image Container) is the default photo format on iPhone and iPad. It stores photos in about half the space of JPG, but many Windows apps, websites and older devices cannot open it.',
  },
  SVG: {
    label: 'SVG',
    description:
      'SVG (Scalable Vector Graphics) is an XML-based vector format that stays sharp at any size. Many apps, social platforms and upload forms still require a raster image such as PNG instead.',
  },
  AVIF: {
    label: 'AVIF',
    description:
      'AVIF is a next-generation image format based on the AV1 codec. It compresses extremely well, but support in older software, editors and upload forms is still limited.',
  },
  ICO: {
    label: 'ICO',
    description:
      'ICO is the Windows icon format used for website favicons and desktop shortcuts. One ICO file can hold several sizes of the same icon.',
  },
  BMP: {
    label: 'BMP',
    description:
      'BMP (Bitmap) is an old, uncompressed Windows image format. Files are very large and many websites and apps won’t accept them.',
  },
  IMAGES: {
    label: 'Images',
    description: 'PNG, JPG and WebP images are supported as input.',
  },
  PDF: {
    label: 'PDF',
    description:
      'PDF (Portable Document Format) preserves a document’s layout on every device and operating system, which makes it the standard for sharing, printing and archiving.',
  },
  TXT: {
    label: 'Text',
    description:
      'Plain text contains only characters with no formatting. It opens anywhere and is easy to search, edit, or paste into other tools.',
  },
  CSV: {
    label: 'CSV',
    description:
      'CSV (Comma-Separated Values) stores tables as plain text, one row per line. It is the universal exchange format for spreadsheets, databases and analytics tools.',
  },
  JSON: {
    label: 'JSON',
    description:
      'JSON (JavaScript Object Notation) is a lightweight structured data format used by virtually every web API and modern application.',
  },
  YAML: {
    label: 'YAML',
    description:
      'YAML is a human-friendly data format popular for configuration — Kubernetes manifests, Docker Compose, GitHub Actions and more.',
  },
  XML: {
    label: 'XML',
    description:
      'XML (Extensible Markup Language) is a structured markup format used by feeds, office documents, enterprise integrations and many legacy APIs.',
  },
  XLSX: {
    label: 'Excel',
    description:
      'XLSX is the Microsoft Excel workbook format. It supports multiple sheets and formatting, and opens in Excel, Google Sheets, Numbers and LibreOffice.',
  },
  MD: {
    label: 'Markdown',
    description:
      'Markdown is a lightweight markup language for formatted text written with plain characters — used in READMEs, documentation, notes apps and static sites.',
  },
  HTML: {
    label: 'HTML',
    description:
      'HTML is the markup language of web pages. Converting to or from HTML lets you publish content online or bring web content into other tools.',
  },
  MP4: {
    label: 'MP4',
    description:
      'MP4 is the most widely supported video format, used by phones, cameras, YouTube and every social platform.',
  },
  MP3: {
    label: 'MP3',
    description:
      'MP3 is the universal compressed audio format. It plays on every device, car stereo and music app with small file sizes.',
  },
  WAV: {
    label: 'WAV',
    description:
      'WAV is an uncompressed audio format with perfect quality and very large files, common in recording and audio editing.',
  },
  M4A: {
    label: 'M4A',
    description:
      'M4A is AAC audio in an MPEG-4 container, used by Apple Music, iTunes, Voice Memos and many phone recorders.',
  },
  FLAC: {
    label: 'FLAC',
    description:
      'FLAC (Free Lossless Audio Codec) compresses audio without losing any quality. It is popular with audiophiles and music archives, but many phones, car stereos and players don’t support it.',
  },
  OGG: {
    label: 'OGG',
    description:
      'OGG is an open audio container, usually holding Vorbis or Opus audio. It is used by games, Android, Discord and WhatsApp voice notes, but Apple devices and many players can’t open it.',
  },
  GIF: {
    label: 'GIF',
    description:
      'GIF is an animated image format that loops silently and plays everywhere — chat apps, email, documentation and social media.',
  },
  MOV: {
    label: 'MOV',
    description:
      'MOV is Apple’s QuickTime video format, used by iPhone cameras and Mac screen recordings. Many Windows apps and websites prefer MP4.',
  },
  WEBM: {
    label: 'WebM',
    description:
      'WebM is an open web video format used by browsers and screen recorders. Many editors, phones and social platforms expect MP4 instead.',
  },
  MKV: {
    label: 'MKV',
    description:
      'MKV (Matroska) is a flexible video container that can hold many audio and subtitle tracks. It is common for downloads and recordings, but iPhones, editors and most websites expect MP4.',
  },
  AVI: {
    label: 'AVI',
    description:
      'AVI is an old Microsoft video format still produced by some cameras, dashcams and legacy software. Files are large and modern devices and websites often can’t play them.',
  },
  VIDEO: {
    label: 'Video',
    description: 'MP4, MOV and WebM videos are supported as input.',
  },
};

export type ConverterOption =
  | {
      key: string;
      label: string;
      type: 'range';
      min: number;
      max: number;
      step: number;
      default: number;
      display: 'percent' | 'number';
    }
  | {
      key: string;
      label: string;
      type: 'select';
      choices: readonly { value: string; label: string }[];
      default: string;
    };

/**
 * batch   — every input file is converted independently
 * combine — all inputs become one output (merge, images → one PDF)
 * single  — exactly one input file per run
 */
export type ConverterMode = 'batch' | 'combine' | 'single';

export type Converter = {
  slug: string;
  category: CategoryKey;
  from: FormatKey;
  to: FormatKey;
  title: string;
  /** Meta description and card text (≤ 160 chars). */
  summary: string;
  /** Unique intro paragraph for the landing page. */
  about: string;
  accept: string;
  mode: ConverterMode;
  tier: 'free' | 'pro';
  options?: readonly ConverterOption[];
  popular?: boolean;
};

// ── Shared option definitions ────────────────────────────────────────────────

const quality = (defaultValue = 0.92): ConverterOption => ({
  key: 'quality',
  label: 'Quality',
  type: 'range',
  min: 0.5,
  max: 1,
  step: 0.01,
  default: defaultValue,
  display: 'percent',
});

const pdfResolution: ConverterOption = {
  key: 'scale',
  label: 'Resolution',
  type: 'select',
  choices: [
    { value: '1', label: 'Standard (72 DPI)' },
    { value: '2', label: 'High (144 DPI)' },
    { value: '3', label: 'Print (216 DPI)' },
  ],
  default: '2',
};

const pageSize: ConverterOption = {
  key: 'pageSize',
  label: 'Page size',
  type: 'select',
  choices: [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'US Letter' },
    { value: 'fit', label: 'Same as image' },
  ],
  default: 'a4',
};

const pageMargin: ConverterOption = {
  key: 'margin',
  label: 'Margin',
  type: 'select',
  choices: [
    { value: 'none', label: 'No margin' },
    { value: 'small', label: 'Small' },
    { value: 'large', label: 'Large' },
  ],
  default: 'small',
};

const mp3Bitrate: ConverterOption = {
  key: 'bitrate',
  label: 'Audio quality',
  type: 'select',
  choices: [
    { value: '128', label: '128 kbps (smaller)' },
    { value: '192', label: '192 kbps (recommended)' },
    { value: '256', label: '256 kbps' },
    { value: '320', label: '320 kbps (best)' },
  ],
  default: '192',
};

const videoQuality: ConverterOption = {
  key: 'crf',
  label: 'Quality',
  type: 'select',
  choices: [
    { value: '20', label: 'High (larger file)' },
    { value: '23', label: 'Balanced' },
    { value: '28', label: 'Small file' },
  ],
  default: '23',
};

const IMAGE_ACCEPT = {
  png: '.png,image/png',
  jpg: '.jpg,.jpeg,.jfif,image/jpeg',
  webp: '.webp,image/webp',
  heic: '.heic,.heif,image/heic,image/heif',
  svg: '.svg,image/svg+xml',
  avif: '.avif,image/avif',
  bmp: '.bmp,.dib,image/bmp,image/x-ms-bmp',
  gif: '.gif,image/gif',
};

const scaleOption: ConverterOption = {
  key: 'scale',
  label: 'Scale',
  type: 'select',
  choices: [
    { value: '1', label: '1x' },
    { value: '2', label: '2x' },
    { value: '4', label: '4x' },
  ],
  default: '2',
};

// ── Catalog ──────────────────────────────────────────────────────────────────

export const CONVERTERS: readonly Converter[] = [
  // Image
  {
    slug: 'png-to-jpg',
    category: 'image',
    from: 'PNG',
    to: 'JPG',
    title: 'PNG to JPG Converter',
    summary: 'Convert PNG images to JPG online for free. Shrink file sizes for email and the web — files never leave your device.',
    about:
      'Screenshots and exported graphics are often saved as PNG, which can be several times larger than a JPG of the same picture. Convert them to JPG to send by email, upload to websites with size limits, or save storage. Transparent areas are filled with white.',
    accept: IMAGE_ACCEPT.png,
    mode: 'batch',
    tier: 'free',
    options: [quality()],
    popular: true,
  },
  {
    slug: 'jpg-to-png',
    category: 'image',
    from: 'JPG',
    to: 'PNG',
    title: 'JPG to PNG Converter',
    summary: 'Convert JPG photos to lossless PNG online. Free, fast, and private — conversion happens in your browser.',
    about:
      'PNG is lossless, so converting a JPG to PNG stops further quality loss when you edit and re-save an image. It is also the format many design tools, slide decks and print shops ask for.',
    accept: IMAGE_ACCEPT.jpg,
    mode: 'batch',
    tier: 'free',
    popular: true,
  },
  {
    slug: 'webp-to-jpg',
    category: 'image',
    from: 'WEBP',
    to: 'JPG',
    title: 'WebP to JPG Converter',
    summary: 'Convert WebP images to JPG so they open in any app. Free batch conversion that runs entirely in your browser.',
    about:
      'Images saved from websites often download as WebP, which older photo viewers, Office apps and some upload forms reject. Convert them to JPG for universal compatibility.',
    accept: IMAGE_ACCEPT.webp,
    mode: 'batch',
    tier: 'free',
    options: [quality()],
    popular: true,
  },
  {
    slug: 'webp-to-png',
    category: 'image',
    from: 'WEBP',
    to: 'PNG',
    title: 'WebP to PNG Converter',
    summary: 'Convert WebP to PNG online while keeping transparency. Free, private, no uploads.',
    about:
      'Need a WebP image in an editor that does not support it? PNG keeps full quality and transparency, so logos, stickers and cut-outs look exactly the same after conversion.',
    accept: IMAGE_ACCEPT.webp,
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'jpg-to-webp',
    category: 'image',
    from: 'JPG',
    to: 'WEBP',
    title: 'JPG to WebP Converter',
    summary: 'Convert JPG to WebP to make images load faster on your website. Free batch converter, no uploads.',
    about:
      'WebP images are typically 25–35% smaller than JPG at the same visual quality. Converting your site’s photos to WebP improves page speed and Core Web Vitals scores.',
    accept: IMAGE_ACCEPT.jpg,
    mode: 'batch',
    tier: 'free',
    options: [quality(0.85)],
  },
  {
    slug: 'png-to-webp',
    category: 'image',
    from: 'PNG',
    to: 'WEBP',
    title: 'PNG to WebP Converter',
    summary: 'Convert PNG to WebP with transparency for smaller, faster web images. Free and private.',
    about:
      'WebP supports transparency like PNG but at a fraction of the size, making it the best choice for web graphics, product cut-outs and UI assets.',
    accept: IMAGE_ACCEPT.png,
    mode: 'batch',
    tier: 'free',
    options: [quality(0.85)],
  },
  {
    slug: 'heic-to-jpg',
    category: 'image',
    from: 'HEIC',
    to: 'JPG',
    title: 'HEIC to JPG Converter',
    summary: 'Convert iPhone HEIC photos to JPG online for free. Batch convert privately — your photos are never uploaded.',
    about:
      'iPhones save photos as HEIC, which Windows, many websites and Android apps cannot open. Convert them to JPG to share, print or upload anywhere. Personal photos stay on your device the whole time.',
    accept: IMAGE_ACCEPT.heic,
    mode: 'batch',
    tier: 'free',
    options: [quality()],
    popular: true,
  },
  {
    slug: 'heic-to-png',
    category: 'image',
    from: 'HEIC',
    to: 'PNG',
    title: 'HEIC to PNG Converter',
    summary: 'Convert HEIC photos from iPhone to lossless PNG. Free, private, and works on Windows, Mac and Android.',
    about:
      'Convert HEIC to PNG when you need the highest quality copy of an iPhone photo for editing, printing or design work.',
    accept: IMAGE_ACCEPT.heic,
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'svg-to-png',
    category: 'image',
    from: 'SVG',
    to: 'PNG',
    title: 'SVG to PNG Converter',
    summary: 'Convert SVG vector graphics to high-resolution PNG images. Choose 1x, 2x or 4x scale. Free and private.',
    about:
      'Social networks, email clients and many apps do not accept SVG files. Render your logo or icon to a crisp PNG at up to 4x resolution with a transparent background.',
    accept: IMAGE_ACCEPT.svg,
    mode: 'batch',
    tier: 'free',
    options: [scaleOption],
  },
  {
    slug: 'svg-to-jpg',
    category: 'image',
    from: 'SVG',
    to: 'JPG',
    title: 'SVG to JPG Converter',
    summary: 'Convert SVG vector graphics to high-resolution JPG images at 1x, 2x or 4x scale. Free, private, no uploads.',
    about:
      'Some upload forms, print services and older apps only accept JPG. Render your SVG logo, chart or illustration as a crisp JPG on a white background, at up to 4x resolution.',
    accept: IMAGE_ACCEPT.svg,
    mode: 'batch',
    tier: 'free',
    options: [scaleOption, quality()],
  },
  {
    slug: 'avif-to-jpg',
    category: 'image',
    from: 'AVIF',
    to: 'JPG',
    title: 'AVIF to JPG Converter',
    summary: 'Convert AVIF images to JPG so they open everywhere. Free batch conversion in your browser.',
    about:
      'AVIF images downloaded from modern websites often won’t open in photo editors or upload forms. Convert them to JPG for full compatibility.',
    accept: IMAGE_ACCEPT.avif,
    mode: 'batch',
    tier: 'free',
    options: [quality()],
  },
  {
    slug: 'avif-to-png',
    category: 'image',
    from: 'AVIF',
    to: 'PNG',
    title: 'AVIF to PNG Converter',
    summary: 'Convert AVIF images to lossless PNG with transparency preserved. Free batch conversion, no uploads.',
    about:
      'Convert AVIF graphics to PNG when you need a lossless copy for editing, or when transparency matters — logos, stickers and cut-outs keep their transparent background.',
    accept: IMAGE_ACCEPT.avif,
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'bmp-to-jpg',
    category: 'image',
    from: 'BMP',
    to: 'JPG',
    title: 'BMP to JPG Converter',
    summary: 'Convert large BMP bitmaps to compact JPG images. Often 10x smaller. Free, private batch converter.',
    about:
      'BMP files from old software, scanners and Windows Paint are uncompressed and huge. Convert them to JPG to email, upload or store them at a fraction of the size.',
    accept: IMAGE_ACCEPT.bmp,
    mode: 'batch',
    tier: 'free',
    options: [quality()],
  },
  {
    slug: 'gif-to-png',
    category: 'image',
    from: 'GIF',
    to: 'PNG',
    title: 'GIF to PNG Converter',
    summary: 'Convert GIF images to PNG with transparency kept. Animated GIFs export the first frame. Free and private.',
    about:
      'Turn GIF graphics into PNG for editing, design tools and documents. PNG supports millions of colors instead of GIF’s 256, and keeps transparent backgrounds intact.',
    accept: IMAGE_ACCEPT.gif,
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'png-to-ico',
    category: 'image',
    from: 'PNG',
    to: 'ICO',
    title: 'PNG to ICO Converter',
    summary: 'Create a multi-size favicon.ico from a PNG, JPG or WebP image. Includes 16 to 256 px sizes.',
    about:
      'Generate a favicon or Windows icon from any image. The ICO file contains 16, 24, 32, 48, 64, 128 and 256 px versions so it looks sharp in browser tabs, bookmarks and desktops.',
    accept: `${IMAGE_ACCEPT.png},${IMAGE_ACCEPT.jpg},${IMAGE_ACCEPT.webp}`,
    mode: 'batch',
    tier: 'free',
  },

  // PDF
  {
    slug: 'jpg-to-pdf',
    category: 'pdf',
    from: 'JPG',
    to: 'PDF',
    title: 'JPG to PDF Converter',
    summary: 'Combine JPG images into one PDF online. Choose A4, Letter or original size. Free, private, no watermark.',
    about:
      'Turn photos of receipts, scanned pages or artwork into a single PDF that’s easy to email, print or upload to forms. Images are added in the order you select them.',
    accept: IMAGE_ACCEPT.jpg,
    mode: 'combine',
    tier: 'free',
    options: [pageSize, pageMargin],
    popular: true,
  },
  {
    slug: 'png-to-pdf',
    category: 'pdf',
    from: 'PNG',
    to: 'PDF',
    title: 'PNG to PDF Converter',
    summary: 'Convert PNG images and screenshots into a single PDF document. Free, fast, no uploads, no watermark.',
    about:
      'Bundle screenshots, diagrams or exported slides into one shareable PDF, with each image on its own page.',
    accept: `${IMAGE_ACCEPT.png},${IMAGE_ACCEPT.webp}`,
    mode: 'combine',
    tier: 'free',
    options: [pageSize, pageMargin],
  },
  {
    slug: 'heic-to-pdf',
    category: 'pdf',
    from: 'HEIC',
    to: 'PDF',
    title: 'HEIC to PDF Converter',
    summary: 'Combine iPhone HEIC photos into one PDF. Choose A4, Letter or original size. Free, private, no uploads.',
    about:
      'Turn iPhone photos of documents, receipts and whiteboards straight into a PDF you can email or upload to forms — no need to convert to JPG first. Photos are decoded on your device and never uploaded.',
    accept: IMAGE_ACCEPT.heic,
    mode: 'combine',
    tier: 'free',
    options: [pageSize, pageMargin],
  },
  {
    slug: 'txt-to-pdf',
    category: 'pdf',
    from: 'TXT',
    to: 'PDF',
    title: 'TXT to PDF Converter',
    summary: 'Convert plain text files to clean, paginated PDFs with automatic line wrapping. Free and private.',
    about:
      'Turn notes, logs, code and plain-text documents into a PDF that prints and shares cleanly. Long lines wrap automatically and pages break for you. Supports Latin-alphabet text (English and Western European languages).',
    accept: '.txt,.text,.log,text/plain',
    mode: 'batch',
    tier: 'free',
    options: [
      {
        key: 'font',
        label: 'Font',
        type: 'select',
        choices: [
          { value: 'sans', label: 'Sans-serif' },
          { value: 'serif', label: 'Serif' },
          { value: 'mono', label: 'Monospace' },
        ],
        default: 'sans',
      },
      {
        key: 'fontSize',
        label: 'Font size',
        type: 'select',
        choices: [
          { value: '10', label: '10 pt' },
          { value: '11', label: '11 pt' },
          { value: '12', label: '12 pt' },
          { value: '14', label: '14 pt' },
        ],
        default: '11',
      },
      {
        key: 'pageSize',
        label: 'Page size',
        type: 'select',
        choices: [
          { value: 'a4', label: 'A4' },
          { value: 'letter', label: 'US Letter' },
        ],
        default: 'a4',
      },
    ],
  },
  {
    slug: 'pdf-to-jpg',
    category: 'pdf',
    from: 'PDF',
    to: 'JPG',
    title: 'PDF to JPG Converter',
    summary: 'Convert every page of a PDF to high-quality JPG images. Up to print resolution. Free and private.',
    about:
      'Extract PDF pages as images to post on social media, insert into presentations, or preview documents on devices without a PDF reader. Confidential documents never leave your computer.',
    accept: '.pdf,application/pdf',
    mode: 'batch',
    tier: 'free',
    options: [pdfResolution, quality()],
    popular: true,
  },
  {
    slug: 'pdf-to-png',
    category: 'pdf',
    from: 'PDF',
    to: 'PNG',
    title: 'PDF to PNG Converter',
    summary: 'Convert PDF pages to lossless PNG images at up to 216 DPI. Free, private PDF to image converter.',
    about:
      'PNG keeps text and line art perfectly sharp, making it the best image format for converting documents, diagrams and slides.',
    accept: '.pdf,application/pdf',
    mode: 'batch',
    tier: 'free',
    options: [pdfResolution],
  },
  {
    slug: 'pdf-to-text',
    category: 'pdf',
    from: 'PDF',
    to: 'TXT',
    title: 'PDF to Text Converter',
    summary: 'Extract text from PDF files to a plain .txt file. Free, instant and private — no upload required.',
    about:
      'Pull the text out of reports, papers and contracts to search, quote, translate or paste into other tools. Works with PDFs that contain selectable text (scanned documents need OCR).',
    accept: '.pdf,application/pdf',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'merge-pdf',
    category: 'pdf',
    from: 'PDF',
    to: 'PDF',
    title: 'Merge PDF',
    summary: 'Combine multiple PDF files into one document in the order you choose. Free, secure, no uploads.',
    about:
      'Join invoices, chapters, forms and scans into a single PDF. Your documents are merged locally in your browser, so sensitive files are never sent to a server.',
    accept: '.pdf,application/pdf',
    mode: 'combine',
    tier: 'free',
    popular: true,
  },
  {
    slug: 'split-pdf',
    category: 'pdf',
    from: 'PDF',
    to: 'PDF',
    title: 'Split PDF',
    summary: 'Split a PDF into separate files — one per page or every few pages. Download them all as a ZIP.',
    about:
      'Break a large PDF into individual pages or smaller chunks to send only what’s needed, fit upload limits, or reorganise a document.',
    accept: '.pdf,application/pdf',
    mode: 'single',
    tier: 'pro',
    options: [
      {
        key: 'pagesPerFile',
        label: 'Pages per file',
        type: 'select',
        choices: [
          { value: '1', label: 'Every page' },
          { value: '2', label: 'Every 2 pages' },
          { value: '5', label: 'Every 5 pages' },
          { value: '10', label: 'Every 10 pages' },
        ],
        default: '1',
      },
    ],
  },

  // Data & documents
  {
    slug: 'csv-to-json',
    category: 'data',
    from: 'CSV',
    to: 'JSON',
    title: 'CSV to JSON Converter',
    summary: 'Convert CSV files to JSON arrays with automatic number and boolean detection. Free and private.',
    about:
      'Turn spreadsheet exports into JSON for APIs, databases, fixtures and scripts. The first row becomes object keys, and numbers and true/false values are typed automatically.',
    accept: '.csv,.tsv,text/csv,text/tab-separated-values,text/plain',
    mode: 'batch',
    tier: 'free',
    options: [
      {
        key: 'header',
        label: 'First row',
        type: 'select',
        choices: [
          { value: 'yes', label: 'Is a header (objects)' },
          { value: 'no', label: 'Is data (arrays)' },
        ],
        default: 'yes',
      },
    ],
    popular: true,
  },
  {
    slug: 'json-to-csv',
    category: 'data',
    from: 'JSON',
    to: 'CSV',
    title: 'JSON to CSV Converter',
    summary: 'Convert JSON arrays to CSV for Excel and Google Sheets. Nested objects are flattened automatically.',
    about:
      'Open API responses and data exports in a spreadsheet. Nested fields become dot-separated columns like address.city, and every key found in any row becomes a column.',
    accept: '.json,application/json,text/plain',
    mode: 'batch',
    tier: 'free',
    popular: true,
  },
  {
    slug: 'json-to-yaml',
    category: 'data',
    from: 'JSON',
    to: 'YAML',
    title: 'JSON to YAML Converter',
    summary: 'Convert JSON to clean, readable YAML for config files. Free, instant, runs in your browser.',
    about:
      'Convert JSON into YAML for Kubernetes manifests, Docker Compose, CI pipelines and other configuration files that are easier to read and review as YAML.',
    accept: '.json,application/json,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'yaml-to-json',
    category: 'data',
    from: 'YAML',
    to: 'JSON',
    title: 'YAML to JSON Converter',
    summary: 'Convert YAML to formatted JSON, including multi-document files. Free and private YAML converter.',
    about:
      'Turn configuration files into JSON for APIs, validators and tooling. Files with multiple YAML documents become a JSON array.',
    accept: '.yaml,.yml,application/yaml,text/yaml,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'xml-to-json',
    category: 'data',
    from: 'XML',
    to: 'JSON',
    title: 'XML to JSON Converter',
    summary: 'Convert XML documents and feeds to JSON with attributes preserved. Free, fast, and private.',
    about:
      'Modernise XML feeds, SOAP responses and exports into JSON. Attributes are kept with an @_ prefix so no information is lost.',
    accept: '.xml,application/xml,text/xml,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'xml-to-csv',
    category: 'data',
    from: 'XML',
    to: 'CSV',
    title: 'XML to CSV Converter',
    summary: 'Convert XML files and feeds to CSV for Excel and Google Sheets. Repeating elements become rows. Free and private.',
    about:
      'Open product feeds, exports and API responses in a spreadsheet. The repeating element (like <item> or <record>) becomes one row each, nested fields become dot-separated columns, and attributes are kept with an @ prefix.',
    accept: '.xml,application/xml,text/xml,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'csv-to-xml',
    category: 'data',
    from: 'CSV',
    to: 'XML',
    title: 'CSV to XML Converter',
    summary: 'Convert CSV spreadsheets to well-formed XML with one element per row. Free, instant and private.',
    about:
      'Generate XML for imports, feeds and legacy integrations from spreadsheet data. Each row becomes a <row> element and each column header becomes a child element, with invalid names fixed automatically.',
    accept: '.csv,.tsv,text/csv,text/tab-separated-values,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'json-to-xml',
    category: 'data',
    from: 'JSON',
    to: 'XML',
    title: 'JSON to XML Converter',
    summary: 'Convert JSON to well-formed, indented XML. Keys prefixed with @_ become attributes. Free and private.',
    about:
      'Generate XML for legacy systems, feeds and integrations from JSON data. Invalid element names are fixed automatically so the output always parses.',
    accept: '.json,application/json,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'csv-to-excel',
    category: 'data',
    from: 'CSV',
    to: 'XLSX',
    title: 'CSV to Excel Converter',
    summary: 'Convert CSV files to Excel XLSX workbooks with typed numbers and a bold header row. Free and private.',
    about:
      'Opening CSVs directly in Excel can mangle leading zeros, dates and special characters. Convert to a proper XLSX workbook to share with colleagues who live in Excel.',
    accept: '.csv,.tsv,text/csv,text/tab-separated-values,text/plain',
    mode: 'batch',
    tier: 'free',
    popular: true,
  },
  {
    slug: 'json-to-excel',
    category: 'data',
    from: 'JSON',
    to: 'XLSX',
    title: 'JSON to Excel Converter',
    summary: 'Convert JSON data to an Excel spreadsheet. Nested objects become columns. Free, no uploads.',
    about:
      'Hand API data to non-technical teammates as a spreadsheet they can filter and chart, without writing a script.',
    accept: '.json,application/json,text/plain',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'excel-to-csv',
    category: 'data',
    from: 'XLSX',
    to: 'CSV',
    title: 'Excel to CSV Converter',
    summary: 'Convert Excel XLSX workbooks to CSV — one file per sheet. Free, private Excel converter.',
    about:
      'Export spreadsheets to CSV for imports into databases, CRMs, e-commerce platforms and analytics tools. Every sheet in the workbook becomes its own CSV file.',
    accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mode: 'batch',
    tier: 'free',
    popular: true,
  },
  {
    slug: 'excel-to-json',
    category: 'data',
    from: 'XLSX',
    to: 'JSON',
    title: 'Excel to JSON Converter',
    summary: 'Convert Excel spreadsheets to JSON using the first row as keys. Multi-sheet workbooks supported.',
    about:
      'Turn a spreadsheet maintained by your team into JSON for apps, websites and seed data — without copy-pasting.',
    accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mode: 'batch',
    tier: 'free',
  },
  {
    slug: 'markdown-to-html',
    category: 'data',
    from: 'MD',
    to: 'HTML',
    title: 'Markdown to HTML Converter',
    summary: 'Convert Markdown (GitHub-flavored) to clean HTML — a full styled page or an embeddable fragment.',
    about:
      'Publish READMEs, notes and docs on the web or paste them into a CMS. Supports tables, task lists, fenced code blocks and other GitHub-flavored Markdown.',
    accept: '.md,.markdown,text/markdown,text/plain',
    mode: 'batch',
    tier: 'free',
    options: [
      {
        key: 'output',
        label: 'Output',
        type: 'select',
        choices: [
          { value: 'document', label: 'Full HTML page' },
          { value: 'fragment', label: 'HTML fragment' },
        ],
        default: 'document',
      },
    ],
  },
  {
    slug: 'html-to-markdown',
    category: 'data',
    from: 'HTML',
    to: 'MD',
    title: 'HTML to Markdown Converter',
    summary: 'Convert HTML pages to clean Markdown. Scripts and styles are stripped. Free, private, instant.',
    about:
      'Move web content into Markdown-based tools like Notion, Obsidian, GitHub or a static site generator, with headings, links, lists and code blocks preserved.',
    accept: '.html,.htm,text/html',
    mode: 'batch',
    tier: 'free',
  },

  // Audio & video
  {
    slug: 'mp4-to-mp3',
    category: 'media',
    from: 'MP4',
    to: 'MP3',
    title: 'MP4 to MP3 Converter',
    summary: 'Extract MP3 audio from MP4 videos at up to 320 kbps. Private — videos are processed on your device.',
    about:
      'Save the audio track of a lecture, interview, podcast recording or music video as an MP3 you can play anywhere.',
    accept: '.mp4,.m4v,video/mp4',
    mode: 'batch',
    tier: 'pro',
    options: [mp3Bitrate],
    popular: true,
  },
  {
    slug: 'wav-to-mp3',
    category: 'media',
    from: 'WAV',
    to: 'MP3',
    title: 'WAV to MP3 Converter',
    summary: 'Compress WAV audio to MP3 and cut file size by up to 90%. Choose bitrate up to 320 kbps.',
    about:
      'WAV recordings are huge. Convert them to MP3 to share by email or chat, upload to podcast hosts, or save space — with quality you choose.',
    accept: '.wav,audio/wav,audio/x-wav,audio/wave',
    mode: 'batch',
    tier: 'pro',
    options: [mp3Bitrate],
  },
  {
    slug: 'm4a-to-mp3',
    category: 'media',
    from: 'M4A',
    to: 'MP3',
    title: 'M4A to MP3 Converter',
    summary: 'Convert M4A audio from iPhone Voice Memos and iTunes to MP3. Private, in-browser conversion.',
    about:
      'Voice memos and Apple Music downloads use M4A, which some players, car stereos and editing apps don’t support. Convert them to MP3 for universal playback.',
    accept: '.m4a,audio/mp4,audio/x-m4a,audio/m4a',
    mode: 'batch',
    tier: 'pro',
    options: [mp3Bitrate],
  },
  {
    slug: 'flac-to-mp3',
    category: 'media',
    from: 'FLAC',
    to: 'MP3',
    title: 'FLAC to MP3 Converter',
    summary: 'Convert lossless FLAC music to MP3 at up to 320 kbps. Play it on any device. Private, in-browser conversion.',
    about:
      'FLAC files are large and won’t play on many phones, car stereos and older players. Convert your music to MP3 to save space and play it anywhere, choosing the quality you want.',
    accept: '.flac,audio/flac,audio/x-flac',
    mode: 'batch',
    tier: 'pro',
    options: [mp3Bitrate],
  },
  {
    slug: 'ogg-to-mp3',
    category: 'media',
    from: 'OGG',
    to: 'MP3',
    title: 'OGG to MP3 Converter',
    summary: 'Convert OGG Vorbis and Opus audio — including voice notes — to MP3. Private, no uploads.',
    about:
      'Game sounds, Android recordings and voice notes from WhatsApp or Telegram are often OGG or Opus, which iPhones and many players can’t open. Convert them to MP3 for universal playback.',
    accept: '.ogg,.oga,.opus,audio/ogg,audio/opus,audio/vorbis',
    mode: 'batch',
    tier: 'pro',
    options: [mp3Bitrate],
  },
  {
    slug: 'mp3-to-wav',
    category: 'media',
    from: 'MP3',
    to: 'WAV',
    title: 'MP3 to WAV Converter',
    summary: 'Convert MP3 to uncompressed WAV for audio editors, DAWs and CD burning. Private, in-browser conversion.',
    about:
      'Many audio editors, samplers, phone systems and CD burning tools require WAV. Converting decodes the MP3 to uncompressed 16-bit PCM audio so it opens everywhere.',
    accept: '.mp3,audio/mpeg,audio/mp3',
    mode: 'batch',
    tier: 'pro',
  },
  {
    slug: 'video-to-gif',
    category: 'media',
    from: 'VIDEO',
    to: 'GIF',
    title: 'Video to GIF Converter',
    summary: 'Turn MP4, MOV or WebM clips into high-quality animated GIFs. Control frame rate, width and length.',
    about:
      'Make GIFs for bug reports, product demos, documentation and chat from screen recordings or video clips. An optimized color palette keeps GIFs sharp and small.',
    accept: '.mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm',
    mode: 'batch',
    tier: 'pro',
    options: [
      {
        key: 'fps',
        label: 'Frame rate',
        type: 'select',
        choices: [
          { value: '8', label: '8 fps (smallest)' },
          { value: '12', label: '12 fps' },
          { value: '15', label: '15 fps' },
          { value: '24', label: '24 fps (smoothest)' },
        ],
        default: '12',
      },
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        choices: [
          { value: '320', label: '320 px' },
          { value: '480', label: '480 px' },
          { value: '640', label: '640 px' },
          { value: '800', label: '800 px' },
        ],
        default: '480',
      },
      {
        key: 'duration',
        label: 'Max length',
        type: 'select',
        choices: [
          { value: '5', label: 'First 5 seconds' },
          { value: '10', label: 'First 10 seconds' },
          { value: '30', label: 'First 30 seconds' },
          { value: '60', label: 'First 60 seconds' },
        ],
        default: '10',
      },
    ],
    popular: true,
  },
  {
    slug: 'mov-to-mp4',
    category: 'media',
    from: 'MOV',
    to: 'MP4',
    title: 'MOV to MP4 Converter',
    summary: 'Convert iPhone and QuickTime MOV videos to MP4. Lossless fast mode when possible. Private and secure.',
    about:
      'Convert MOV files from iPhones and Mac screen recordings to MP4 so they play on Windows, Android and every website. If the video is already H.264, it’s repackaged instantly with no quality loss.',
    accept: '.mov,.qt,video/quicktime',
    mode: 'batch',
    tier: 'pro',
    options: [videoQuality],
  },
  {
    slug: 'webm-to-mp4',
    category: 'media',
    from: 'WEBM',
    to: 'MP4',
    title: 'WebM to MP4 Converter',
    summary: 'Convert WebM screen recordings and browser videos to widely compatible MP4 (H.264 + AAC).',
    about:
      'Screen recorders and browsers often save WebM, which iPhones, editors and social platforms struggle with. Convert to MP4 for playback and upload anywhere.',
    accept: '.webm,video/webm',
    mode: 'batch',
    tier: 'pro',
    options: [videoQuality],
  },
  {
    slug: 'mkv-to-mp4',
    category: 'media',
    from: 'MKV',
    to: 'MP4',
    title: 'MKV to MP4 Converter',
    summary: 'Convert MKV videos to MP4 for iPhone, editors and the web. Lossless fast mode when possible. Private.',
    about:
      'MKV files often won’t play on iPhones, in video editors or on websites. Convert them to MP4 — if the video is already H.264, it’s repackaged in seconds with no quality loss.',
    accept: '.mkv,video/x-matroska,video/matroska',
    mode: 'batch',
    tier: 'pro',
    options: [videoQuality],
  },
  {
    slug: 'avi-to-mp4',
    category: 'media',
    from: 'AVI',
    to: 'MP4',
    title: 'AVI to MP4 Converter',
    summary: 'Convert old AVI videos to modern MP4 (H.264 + AAC) that plays everywhere. Private, in-browser.',
    about:
      'AVI videos from older cameras, dashcams and legacy software are large and don’t play on phones or websites. Convert them to MP4 for smaller files and universal playback.',
    accept: '.avi,video/x-msvideo,video/avi,video/msvideo',
    mode: 'batch',
    tier: 'pro',
    options: [videoQuality],
  },
  {
    slug: 'gif-to-mp4',
    category: 'media',
    from: 'GIF',
    to: 'MP4',
    title: 'GIF to MP4 Converter',
    summary: 'Convert animated GIFs to MP4 video — often 90% smaller. Ready for Instagram, X and TikTok.',
    about:
      'Social platforms, slide decks and websites handle video far better than GIF. Converting to MP4 keeps the animation while cutting file size dramatically, so it loads faster and uploads anywhere.',
    accept: IMAGE_ACCEPT.gif,
    mode: 'batch',
    tier: 'pro',
    options: [videoQuality],
  },
];

/** Does this file match a converter's `accept` list (by extension or MIME type)? */
export function fileMatchesConverter(converter: Converter, file: { name: string; type: string }): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return converter.accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .some((token) =>
      token.startsWith('.')
        ? name.endsWith(token)
        : token.endsWith('/*')
          ? type.startsWith(token.slice(0, -1))
          : type !== '' && type === token,
    );
}

/** Every converter that can take this file, most popular first — powers the home-page dropzone. */
export function convertersForFile(file: { name: string; type: string }): Converter[] {
  return CONVERTERS.filter((converter) => fileMatchesConverter(converter, file)).sort(
    (a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)),
  );
}

/** Short label for a conversion target: "JPG", or "Merge" when the format doesn't change. */
export function targetLabel(converter: Converter): string {
  return converter.from === converter.to
    ? converter.title.replace(/ PDF$/, '')
    : FORMATS[converter.to].label;
}

const bySlug = new Map(CONVERTERS.map((converter) => [converter.slug, converter]));

export function getConverter(slug: string): Converter | undefined {
  return bySlug.get(slug);
}

export function convertersInCategory(category: CategoryKey): Converter[] {
  return CONVERTERS.filter((converter) => converter.category === category);
}

export const POPULAR_CONVERTERS = CONVERTERS.filter((converter) => converter.popular);

/** Same source or target format first, then the rest of the category. */
export function relatedConverters(converter: Converter, count = 6): Converter[] {
  const score = (other: Converter) =>
    (other.from === converter.from || other.to === converter.to ? 2 : 0) +
    (other.from === converter.to || other.to === converter.from ? 1 : 0) +
    (other.category === converter.category ? 1 : 0);
  return CONVERTERS.filter((other) => other.slug !== converter.slug && score(other) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, count);
}
