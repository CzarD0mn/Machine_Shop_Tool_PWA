import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp vector SVG icon for The Machinist Helper
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2E7D32"/>
      <stop offset="100%" stop-color="#1B5E20"/>
    </linearGradient>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#E8F5E9"/>
      <stop offset="100%" stop-color="#C8E6C9"/>
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0F3312" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Rounded App Tile Background -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>

  <!-- Subtle Precision Grid Pattern -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#43A047" stroke-width="2" stroke-dasharray="4 8" opacity="0.35"/>
  <circle cx="256" cy="256" r="145" fill="none" stroke="#43A047" stroke-width="2" stroke-dasharray="6 6" opacity="0.4"/>

  <!-- Outer Machinist Gear Teeth (6-flute / 6-lug index) -->
  <g filter="url(#dropShadow)" fill="url(#metalGrad)" stroke="#1B5E20" stroke-width="6" stroke-linejoin="round">
    <!-- Center Cutter Body -->
    <circle cx="256" cy="256" r="110"/>
    
    <!-- Cutting Teeth / Flutes -->
    <path d="M236 100 L276 100 L270 156 L242 156 Z" />
    <path d="M236 412 L276 412 L270 356 L242 356 Z" />
    <path d="M100 236 L100 276 L156 270 L156 242 Z" />
    <path d="M412 236 L412 276 L356 270 L356 242 Z" />

    <g transform="rotate(45 256 256)">
      <path d="M236 106 L276 106 L270 158 L242 158 Z" />
      <path d="M236 406 L276 406 L270 354 L242 354 Z" />
      <path d="M106 236 L106 276 L158 270 L158 242 Z" />
      <path d="M406 236 L406 276 L354 270 L354 242 Z" />
    </g>
  </g>

  <!-- High-contrast Cutter Flutes Helix / Milling Symbol -->
  <!-- Inner bore with keyed shaft -->
  <circle cx="256" cy="256" r="58" fill="#1B5E20"/>
  <rect x="250" y="194" width="12" height="24" rx="3" fill="#1B5E20"/>
  <circle cx="256" cy="256" r="38" fill="#2E7D32"/>
  <circle cx="256" cy="256" r="16" fill="#A5D6A7"/>

  <!-- Precision Caliper / Angle Tick Marks -->
  <g stroke="#E8F5E9" stroke-width="3" stroke-linecap="round" opacity="0.9">
    <line x1="256" y1="64" x2="256" y2="82" />
    <line x1="256" y1="430" x2="256" y2="448" />
    <line x1="64" y1="256" x2="82" y2="256" />
    <line x1="430" y1="256" x2="448" y2="256" />
  </g>
</svg>`;

// Maskable icon with 15% safe-zone margin (inner content within 80% circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2E7D32"/>
      <stop offset="100%" stop-color="#1B5E20"/>
    </linearGradient>
    <linearGradient id="metalGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#E8F5E9"/>
      <stop offset="100%" stop-color="#C8E6C9"/>
    </linearGradient>
    <filter id="dropShadowMask" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0F3312" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Full bleed solid background for Android adaptive shapes -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>

  <!-- Scaled safe-zone group (centered, 80% scale so no edges get cropped) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="256" r="190" fill="none" stroke="#43A047" stroke-width="3" stroke-dasharray="6 8" opacity="0.4"/>
    <g filter="url(#dropShadowMask)" fill="url(#metalGradMask)" stroke="#1B5E20" stroke-width="6" stroke-linejoin="round">
      <circle cx="256" cy="256" r="110"/>
      <path d="M236 100 L276 100 L270 156 L242 156 Z" />
      <path d="M236 412 L276 412 L270 356 L242 356 Z" />
      <path d="M100 236 L100 276 L156 270 L156 242 Z" />
      <path d="M412 236 L412 276 L356 270 L356 242 Z" />
      <g transform="rotate(45 256 256)">
        <path d="M236 106 L276 106 L270 158 L242 158 Z" />
        <path d="M236 406 L276 406 L270 354 L242 354 Z" />
        <path d="M106 236 L106 276 L158 270 L158 242 Z" />
        <path d="M406 236 L406 276 L354 270 L354 242 Z" />
      </g>
    </g>

    <circle cx="256" cy="256" r="58" fill="#1B5E20"/>
    <rect x="250" y="194" width="12" height="24" rx="3" fill="#1B5E20"/>
    <circle cx="256" cy="256" r="38" fill="#2E7D32"/>
    <circle cx="256" cy="256" r="16" fill="#A5D6A7"/>

    <g stroke="#E8F5E9" stroke-width="3" stroke-linecap="round" opacity="0.9">
      <line x1="256" y1="64" x2="256" y2="82" />
      <line x1="256" y1="430" x2="256" y2="448" />
      <line x1="64" y1="256" x2="82" y2="256" />
      <line x1="430" y1="256" x2="448" y2="256" />
    </g>
  </g>
</svg>`;

async function run() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  // 192x192 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 512x512 Maskable PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 180x180 Apple Touch Icon PNG
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 64x64 Favicon
  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All PWA and app icons generated successfully!');
}

run().catch(console.error);
