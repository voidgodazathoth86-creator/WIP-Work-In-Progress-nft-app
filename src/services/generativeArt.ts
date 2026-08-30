// Procedural vector SVG generative art engine for instant NFT creation

export type GenerativeStyle = 'cyberpunk' | 'cosmic' | 'minimal' | 'glitch' | 'geometric';

export function generateArtSVG(seed: string, style: GenerativeStyle = 'cyberpunk'): string {
  // Simple seeded pseudo-random
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const random = () => {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };

  const palettes = {
    cyberpunk: ['#00F0FF', '#7000FF', '#FF0055', '#FFE600', '#050510'],
    cosmic: ['#6B11FF', '#B800FF', '#00D4FF', '#0F051D', '#E2D9FC'],
    minimal: ['#18181B', '#3F3F46', '#71717A', '#F4F4F5', '#E4E4E7'],
    glitch: ['#FF007A', '#00F5D4', '#7B2CBF', '#0D0221', '#F72585'],
    geometric: ['#3A86FF', '#8338EC', '#FF006E', '#FB5607', '#FFBE0B'],
  };

  const colors = palettes[style] || palettes.cyberpunk;
  const bg = colors[3] || '#0a0a14';
  const c1 = colors[0];
  const c2 = colors[1];
  const c3 = colors[2];
  const c4 = colors[4] || '#ffffff';

  const shapeCount = 6 + Math.floor(random() * 8);
  let elements = '';

  if (style === 'cyberpunk') {
    // Grid lines + glowing polygons + cyber runes
    elements += `
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.9" />
          <stop offset="100%" stop-color="${c2}" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${c3}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${c1}" stop-opacity="0.8" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="600" height="600" fill="#070712" />
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${c1}" stroke-width="0.5" stroke-opacity="0.15" />
      </pattern>
      <rect width="600" height="600" fill="url(#grid)" />
    `;

    // Hexagons & glowing rings
    const cx = 300;
    const cy = 300;
    elements += `
      <circle cx="${cx}" cy="${cy}" r="180" fill="none" stroke="url(#grad1)" stroke-width="2" stroke-dasharray="12, 8" opacity="0.6" />
      <circle cx="${cx}" cy="${cy}" r="130" fill="none" stroke="${c3}" stroke-width="3" opacity="0.8" />
      <polygon points="${cx},${cy-100} ${cx+86},${cy-50} ${cx+86},${cy+50} ${cx},${cy+100} ${cx-86},${cy+50} ${cx-86},${cy-50}" fill="url(#grad2)" filter="url(#glow)" opacity="0.85" />
      <polygon points="${cx},${cy-60} ${cx+52},${cy-30} ${cx+52},${cy+30} ${cx},${cy+60} ${cx-52},${cy+30} ${cx-52},${cy-30}" fill="#0a0a16" stroke="${c1}" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="24" fill="${c1}" filter="url(#glow)" />
    `;

    // Floating data chips
    for (let i = 0; i < shapeCount; i++) {
      const x = 50 + random() * 500;
      const y = 50 + random() * 500;
      const w = 30 + random() * 60;
      const h = 4 + random() * 12;
      elements += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${random() > 0.5 ? c1 : c3}" opacity="0.75" />`;
    }
  } else if (style === 'cosmic') {
    elements += `
      <defs>
        <radialGradient id="cosmicGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c2}" stop-opacity="1" />
          <stop offset="60%" stop-color="${c1}" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#05010d" stop-opacity="1" />
        </radialGradient>
        <filter id="nebulaBlur">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <rect width="600" height="600" fill="#04010a" />
      <circle cx="300" cy="300" r="220" fill="url(#cosmicGrad)" filter="url(#nebulaBlur)" opacity="0.8" />
      <circle cx="300" cy="300" r="140" fill="none" stroke="${c3}" stroke-width="1.5" stroke-dasharray="6,4" />
      <circle cx="300" cy="300" r="80" fill="#0a0218" stroke="${c1}" stroke-width="3" />
      <circle cx="300" cy="300" r="40" fill="${c3}" opacity="0.9" />
    `;
    // Stars
    for (let i = 0; i < 40; i++) {
      const sx = random() * 600;
      const sy = random() * 600;
      const sr = 1 + random() * 2.5;
      elements += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="${0.4 + random()*0.6}" />`;
    }
  } else {
    // Geometric / Abstract
    elements += `
      <defs>
        <linearGradient id="geomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="50%" stop-color="${c2}" />
          <stop offset="100%" stop-color="${c3}" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="#0f111a" />
    `;
    for (let i = 0; i < 12; i++) {
      const x = random() * 600;
      const y = random() * 600;
      const r = 40 + random() * 100;
      elements += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#geomGrad)" opacity="${0.25 + random()*0.4}" />`;
    }
    elements += `
      <polygon points="300,120 480,440 120,440" fill="none" stroke="${c1}" stroke-width="4" opacity="0.85" />
      <polygon points="300,480 120,160 480,160" fill="none" stroke="${c3}" stroke-width="2" opacity="0.75" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">${elements}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateSeedAttributes(name: string, category: string): { trait_type: string; value: string | number; rarityPercentage: number }[] {
  const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  const elementsList = ['Cybernetic', 'Quantum', 'Plasma', 'Aether', 'Chronos', 'Solar', 'Void'];
  const architectures = ['EVM-Core', 'Rollup-L2', 'ZK-Proof', 'Sol-BFT', 'Inter-Chain'];
  
  let code = 0;
  for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);

  const rarityIndex = code % rarities.length;
  const powerLevel = 50 + (code % 50);

  return [
    { trait_type: 'Rarity Tier', value: rarities[rarityIndex], rarityPercentage: [45, 25, 15, 10, 5][rarityIndex] },
    { trait_type: 'Element', value: elementsList[code % elementsList.length], rarityPercentage: 14 },
    { trait_type: 'Architecture', value: architectures[code % architectures.length], rarityPercentage: 20 },
    { trait_type: 'Power Level', value: powerLevel, rarityPercentage: 8 },
    { trait_type: 'Category', value: category.toUpperCase(), rarityPercentage: 30 },
  ];
}
