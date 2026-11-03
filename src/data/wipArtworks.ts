// High-fidelity bespoke SVG artworks for Work In Progress - WIP & WIP Logo Collections
// Guarantees 100% uptime, zero CORS timeout, and crisp rendering matching token traits

export function createWipSvgArtwork(tokenId: string, name: string, subtitle: string, primaryColor: string, secondaryColor: string, accentColor: string, pattern: 'line' | 'matrix' | 'centurion' | 'quantum' | 'laser' | 'flux' | 'logo'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="50%" stop-color="#12121a"/>
      <stop offset="100%" stop-color="#07070b"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${secondaryColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="techGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${secondaryColor}" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Deep Canvas Background -->
  <rect width="800" height="800" fill="url(#bgGrad)"/>
  <rect width="800" height="800" fill="url(#techGrid)"/>
  <circle cx="400" cy="400" r="340" fill="url(#centerGlow)"/>

  <!-- Architectural Frame & HUD Marks -->
  <rect x="30" y="30" width="740" height="740" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1.5" rx="16"/>
  <rect x="40" y="40" width="720" height="720" fill="none" stroke="${secondaryColor}" stroke-opacity="0.15" stroke-dasharray="4 8" rx="12"/>

  <!-- Corner Alignment Brackets -->
  <path d="M 45 75 L 45 45 L 75 45" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M 755 75 L 755 45 L 725 45" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M 45 725 L 45 755 L 75 755" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M 755 725 L 755 755 L 725 755" fill="none" stroke="${primaryColor}" stroke-width="3"/>

  <!-- Top Metadata Bar -->
  <text x="60" y="70" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="12" fill="${accentColor}" font-weight="700" letter-spacing="2">POLYGON MAINNET • ERC-721</text>
  <text x="740" y="70" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="12" fill="${primaryColor}" font-weight="700" letter-spacing="2">${tokenId}</text>

  <!-- Central Thematic Artwork -->
  ${pattern === 'line' ? `
    <!-- WIP #000: The 1st Line -->
    <circle cx="400" cy="400" r="220" fill="none" stroke="${secondaryColor}" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="3 6"/>
    <circle cx="400" cy="400" r="160" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1"/>
    <!-- The Genesis Line cutting across dimensions -->
    <path d="M 120 400 L 680 400" stroke="${primaryColor}" stroke-width="4" filter="url(#neonGlow)"/>
    <path d="M 120 400 L 680 400" stroke="#ffffff" stroke-width="1.5"/>
    <!-- Drafting Orthogonal Nodes -->
    <line x1="400" y1="200" x2="400" y2="600" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="2 4"/>
    <circle cx="400" cy="400" r="12" fill="${primaryColor}" filter="url(#neonGlow)"/>
    <circle cx="400" cy="400" r="5" fill="#ffffff"/>
    <circle cx="260" cy="400" r="6" fill="${secondaryColor}"/>
    <circle cx="540" cy="400" r="6" fill="${accentColor}"/>
    <path d="M 320 320 L 480 480" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="1.5"/>
    <path d="M 480 320 L 320 480" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.5"/>
  ` : pattern === 'matrix' ? `
    <!-- WIP #001: Genesis Iteration / Chroma Matrix -->
    <g transform="translate(400, 400)">
      <polygon points="0,-180 156,-90 156,90 0,180 -156,90 -156,-90" fill="none" stroke="${primaryColor}" stroke-width="2.5" filter="url(#neonGlow)"/>
      <polygon points="0,-130 112,-65 112,65 0,130 -112,65 -112,-65" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6 4"/>
      <polygon points="0,-80 69,-40 69,40 0,80 -69,40 -69,-40" fill="${primaryColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2"/>
      <circle cx="0" cy="0" r="10" fill="#ffffff" filter="url(#neonGlow)"/>
      <!-- Dynamic lattice lines -->
      <line x1="-156" y1="-90" x2="156" y2="90" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.6"/>
      <line x1="-156" y1="90" x2="156" y2="-90" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.6"/>
      <line x1="0" y1="-180" x2="0" y2="180" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.7"/>
    </g>
  ` : pattern === 'centurion' ? `
    <!-- WIP #002: Centurion Shift -->
    <g transform="translate(400, 400)">
      <!-- Golden Centurion Rings -->
      <circle cx="0" cy="0" r="210" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-opacity="0.3"/>
      <circle cx="0" cy="0" r="170" fill="none" stroke="${secondaryColor}" stroke-width="3" filter="url(#neonGlow)" stroke-dasharray="30 15 10 15"/>
      <circle cx="0" cy="0" r="120" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
      <!-- Roman Numeric Geometric Insignia -->
      <path d="M -80 -80 L 80 80 M 80 -80 L -80 80" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round" filter="url(#neonGlow)"/>
      <path d="M -90 0 L 90 0 M 0 -90 L 0 90" stroke="#ffffff" stroke-width="2" stroke-opacity="0.8"/>
      <polygon points="0,-60 60,0 0,60 -60,0" fill="${primaryColor}" fill-opacity="0.2" stroke="${primaryColor}" stroke-width="2"/>
    </g>
  ` : pattern === 'quantum' ? `
    <!-- WIP #003: Quantum Vellum -->
    <g transform="translate(400, 400)">
      <!-- Spectral interference rings -->
      <ellipse cx="0" cy="0" rx="220" ry="80" fill="none" stroke="${primaryColor}" stroke-width="2" transform="rotate(30)" filter="url(#neonGlow)"/>
      <ellipse cx="0" cy="0" rx="220" ry="80" fill="none" stroke="${secondaryColor}" stroke-width="2" transform="rotate(-30)" filter="url(#neonGlow)"/>
      <ellipse cx="0" cy="0" rx="220" ry="80" fill="none" stroke="${accentColor}" stroke-width="1.5" transform="rotate(90)"/>
      <circle cx="0" cy="0" r="50" fill="${primaryColor}" fill-opacity="0.3"/>
      <circle cx="0" cy="0" r="20" fill="#ffffff" filter="url(#neonGlow)"/>
    </g>
  ` : pattern === 'laser' ? `
    <!-- WIP #004: Eye Laser -->
    <g transform="translate(400, 400)">
      <!-- Reticle target rings -->
      <circle cx="0" cy="0" r="200" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="10 10"/>
      <circle cx="0" cy="0" r="140" fill="none" stroke="${secondaryColor}" stroke-width="3" filter="url(#neonGlow)"/>
      <circle cx="0" cy="0" r="70" fill="none" stroke="${accentColor}" stroke-width="2"/>
      <!-- Concentrated Laser Beams -->
      <line x1="-300" y1="0" x2="300" y2="0" stroke="${primaryColor}" stroke-width="4" filter="url(#neonGlow)"/>
      <line x1="0" y1="-300" x2="0" y2="300" stroke="${primaryColor}" stroke-width="4" filter="url(#neonGlow)"/>
      <line x1="-200" y1="-200" x2="200" y2="200" stroke="#ff0055" stroke-width="3" filter="url(#neonGlow)"/>
      <circle cx="0" cy="0" r="14" fill="#ffffff" filter="url(#neonGlow)"/>
    </g>
  ` : pattern === 'flux' ? `
    <!-- WIP #005: Chroma Matrix / Prismatic Flux -->
    <g transform="translate(400, 400)">
      <rect x="-130" y="-130" width="260" height="260" fill="none" stroke="${primaryColor}" stroke-width="3" rx="30" transform="rotate(45)" filter="url(#neonGlow)"/>
      <rect x="-100" y="-100" width="200" height="200" fill="none" stroke="${secondaryColor}" stroke-width="2" rx="20" transform="rotate(25)"/>
      <rect x="-70" y="-70" width="140" height="140" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="2" rx="10" transform="rotate(5)"/>
      <circle cx="0" cy="0" r="12" fill="#ffffff" filter="url(#neonGlow)"/>
    </g>
  ` : `
    <!-- WIP LOGO Collection: Monogram Crest -->
    <g transform="translate(400, 390)">
      <polygon points="0,-190 170,-80 170,100 0,190 -170,100 -170,-80" fill="none" stroke="${primaryColor}" stroke-width="3.5" filter="url(#neonGlow)"/>
      <circle cx="0" cy="0" r="130" fill="${primaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="4 6"/>
      <!-- Monogram 'W I P' Block Geometry -->
      <path d="M -100 -50 L -75 50 L -50 -20 L -25 50 L 0 -50" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#neonGlow)"/>
      <path d="M 25 -50 L 25 50 M 45 -50 L 75 -50 C 95 -50 95 -15 75 -15 L 45 -15 M 45 -50 L 45 50" fill="none" stroke="${primaryColor}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#neonGlow)"/>
    </g>
  `}

  <!-- Bottom Title Block / Provenance Badge -->
  <g transform="translate(60, 670)">
    <rect x="0" y="0" width="680" height="75" fill="#0c0d14" fill-opacity="0.9" rx="12" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="24" y="32" font-family="'Inter', -apple-system, sans-serif" font-size="20" font-weight="900" fill="url(#textGrad)">${name}</text>
    <text x="24" y="56" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="600" fill="#94a3b8">${subtitle} • 10% ROYALTY ENFORCED</text>
    <text x="656" y="44" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="${primaryColor}">0xc2eaa6...5ef9</text>
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Ready-to-use bespoke artworks for WIP #000 - #006 and Logo editions
export const WIP_ARTWORKS: Record<string, string> = {
  // WIP #000
  '0': createWipSvgArtwork(
    'WIP #000',
    'WIP #000 - The 1st Line',
    'Alpha Genesis Draft • Polygon Block 93415806',
    '#00f0ff',
    '#7928ca',
    '#ff007a',
    'line'
  ),
  '#000': createWipSvgArtwork(
    'WIP #000',
    'WIP #000 - The 1st Line',
    'Alpha Genesis Draft • Polygon Block 93415806',
    '#00f0ff',
    '#7928ca',
    '#ff007a',
    'line'
  ),

  // WIP #001
  '1': createWipSvgArtwork(
    'WIP #001',
    'WIP #001 - Genesis Iteration',
    'Chroma Matrix Lattice • Silicon Void',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    'matrix'
  ),
  '#001': createWipSvgArtwork(
    'WIP #001',
    'WIP #001 - Genesis Iteration',
    'Chroma Matrix Lattice • Silicon Void',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    'matrix'
  ),

  // WIP #002
  '2': createWipSvgArtwork(
    'WIP #002',
    'WIP #002 - Centurion Shift',
    'Centurion Shift • Obsidian & Gold Weave',
    '#f59e0b',
    '#d97706',
    '#fbbf24',
    'centurion'
  ),
  '#002': createWipSvgArtwork(
    'WIP #002',
    'WIP #002 - Centurion Shift',
    'Centurion Shift • Obsidian & Gold Weave',
    '#f59e0b',
    '#d97706',
    '#fbbf24',
    'centurion'
  ),

  // WIP #003
  '3': createWipSvgArtwork(
    'WIP #003',
    'WIP #003 - Quantum Vellum',
    'Spectral Violet & Gold • Dimensional Glass',
    '#8b5cf6',
    '#ec4899',
    '#c084fc',
    'quantum'
  ),
  '#003': createWipSvgArtwork(
    'WIP #003',
    'WIP #003 - Quantum Vellum',
    'Spectral Violet & Gold • Dimensional Glass',
    '#8b5cf6',
    '#ec4899',
    '#c084fc',
    'quantum'
  ),

  // WIP #004
  '4': createWipSvgArtwork(
    'WIP #004',
    'WIP #004 - Eye Laser',
    'Cyber Laser Reticle • Cyber Mesh Canvas',
    '#ef4444',
    '#f43f5e',
    '#06b6d4',
    'laser'
  ),
  '#004': createWipSvgArtwork(
    'WIP #004',
    'WIP #004 - Eye Laser',
    'Cyber Laser Reticle • Cyber Mesh Canvas',
    '#ef4444',
    '#f43f5e',
    '#06b6d4',
    'laser'
  ),

  // WIP #005
  '5': createWipSvgArtwork(
    'WIP #005',
    'WIP #005 - Chroma Matrix',
    'Prismatic Kinetic Flux • Carbon Polymer',
    '#06b6d4',
    '#8b5cf6',
    '#f43f5e',
    'flux'
  ),
  '#005': createWipSvgArtwork(
    'WIP #005',
    'WIP #005 - Chroma Matrix',
    'Prismatic Kinetic Flux • Carbon Polymer',
    '#06b6d4',
    '#8b5cf6',
    '#f43f5e',
    'flux'
  ),

  // WIP #006
  '6': createWipSvgArtwork(
    'WIP #006',
    'WIP #006 - Neural Inception',
    'Prism Horizon • Refractive Quartz',
    '#3b82f6',
    '#6366f1',
    '#00f0ff',
    'matrix'
  ),
  '#006': createWipSvgArtwork(
    'WIP #006',
    'WIP #006 - Neural Inception',
    'Prism Horizon • Refractive Quartz',
    '#3b82f6',
    '#6366f1',
    '#00f0ff',
    'matrix'
  ),

  // WIP Logo #0
  'logo-0': createWipSvgArtwork(
    'LOGO #0',
    'WIP Logo #0 - Genesis Monogram',
    'Genesis Emblem Crest • Diamond Grade',
    '#3b82f6',
    '#8b5cf6',
    '#00f0ff',
    'logo'
  ),

  // WIP Logo #1
  'logo-1': createWipSvgArtwork(
    'LOGO #1',
    'WIP Logo #1 - Cyber Neon Monogram',
    'Neon Pulse Crest • Platinum Grade',
    '#00f0ff',
    '#ec4899',
    '#38bdf8',
    'logo'
  ),

  // WIP Logo #2
  'logo-2': createWipSvgArtwork(
    'LOGO #2',
    'WIP Logo #2 - Imperial Gold Emblem',
    'Imperial Gold Sovereign • Aura Crown',
    '#f59e0b',
    '#eab308',
    '#fbbf24',
    'logo'
  ),
};

export function getWipArtwork(tokenIdOrKey: string | number, isLogo = false): string {
  const clean = String(tokenIdOrKey).trim().replace(/^#/, '');
  const key = isLogo ? `logo-${clean}` : clean;
  if (WIP_ARTWORKS[key]) return WIP_ARTWORKS[key];
  if (WIP_ARTWORKS[`#${clean.padStart(3, '0')}`]) return WIP_ARTWORKS[`#${clean.padStart(3, '0')}`];
  if (WIP_ARTWORKS[clean]) return WIP_ARTWORKS[clean];

  return createWipSvgArtwork(
    `#${clean}`,
    `Work In Progress - WIP #${clean}`,
    'Polygon Mainnet Verified Contract',
    '#00f0ff',
    '#7928ca',
    '#ff007a',
    'matrix'
  );
}
