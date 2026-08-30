import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { BulkNFTItem, NFTTrait } from '../types';
import { generateArtSVG, generateSeedAttributes } from './generativeArt';

// Normalization mappings for diverse CSV/Excel headers
const HEADER_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'title', 'nft_name', 'token_name', 'tokenname', 'item_name', 'nft title', 'token id name'],
  description: ['description', 'desc', 'lore', 'summary', 'about', 'details', 'bio', 'story'],
  image: ['image', 'image_url', 'imageurl', 'image uri', 'ipfs_image', 'media', 'art_url', 'artwork', 'preview', 'file', 'asset'],
  price: ['price', 'list_price', 'listprice', 'mint_price', 'eth_price', 'sol_price', 'matic_price', 'cost', 'listing price'],
  royaltyPercentage: ['royalty', 'royalty_percentage', 'royalty_fee', 'royalties', 'creator_royalty', 'royalty %', 'royaltypercent', 'fee'],
  category: ['category', 'genre', 'type', 'collection_type', 'tag'],
  unlockableContent: ['unlockable', 'unlockable_content', 'unlockablecontent', 'secret', 'lore_key', 'private_content', 'vault_pass'],
  editionTotal: ['edition_total', 'editiontotal', 'total_supply', 'max_editions', 'copies', 'supply'],
  editionNumber: ['edition_number', 'editionnumber', 'edition_no', 'token_number', 'index'],
};

/**
 * Normalizes a raw column header string to find matching standard property
 */
function matchStandardHeader(rawKey: string): string | null {
  const clean = rawKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [standardKey, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const syn of synonyms) {
      if (clean === syn.replace(/[^a-z0-9]/g, '')) {
        return standardKey;
      }
    }
  }
  return null;
}

/**
 * Extracts traits from individual row columns or formatted trait cells
 */
function extractTraitsFromRow(row: Record<string, any>): NFTTrait[] {
  const traits: NFTTrait[] = [];

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue;

    const trimmedKey = key.trim();
    const strVal = String(value).trim();

    // Check for Trait: / Attribute: / Prop: prefixes
    const traitPrefixMatch = trimmedKey.match(/^(?:trait|attribute|prop|trait_type|attr)[:\s_-]+(.+)$/i);
    if (traitPrefixMatch) {
      const traitType = traitPrefixMatch[1].trim();
      const num = Number(strVal);
      if (!isNaN(num) && strVal !== '' && !strVal.startsWith('0x') && (traitType.toLowerCase().includes('power') || traitType.toLowerCase().includes('level') || traitType.toLowerCase().includes('rating') || traitType.toLowerCase().includes('score') || traitType.toLowerCase().includes('speed') || traitType.toLowerCase().includes('stat'))) {
        traits.push({
          trait_type: traitType,
          value: num,
          display_type: 'number',
          rarityPercentage: Math.floor(4 + Math.random() * 25),
        });
      } else {
        traits.push({
          trait_type: traitType,
          value: strVal,
          rarityPercentage: Math.floor(4 + Math.random() * 25),
        });
      }
      continue;
    }

    // Check if column itself is 'traits' or 'attributes' containing JSON or key:value
    if (trimmedKey.toLowerCase() === 'traits' || trimmedKey.toLowerCase() === 'attributes') {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            if (t && t.trait_type && t.value !== undefined) {
              traits.push({
                trait_type: String(t.trait_type),
                value: t.value,
                display_type: t.display_type,
                rarityPercentage: t.rarityPercentage || Math.floor(5 + Math.random() * 20),
              });
            }
          });
          continue;
        }
      } catch (e) {
        // Semicolon/comma separated format: "Rarity: Mythic; Power: 95; Element: Quantum"
        const parts = strVal.split(/[;,|]/);
        for (const p of parts) {
          const colonIdx = p.indexOf(':');
          if (colonIdx > 0) {
            const tType = p.substring(0, colonIdx).trim();
            const tVal = p.substring(colonIdx + 1).trim();
            const num = Number(tVal);
            if (!isNaN(num) && tVal !== '') {
              traits.push({ trait_type: tType, value: num, display_type: 'number', rarityPercentage: Math.floor(5 + Math.random() * 20) });
            } else if (tType && tVal) {
              traits.push({ trait_type: tType, value: tVal, rarityPercentage: Math.floor(5 + Math.random() * 20) });
            }
          }
        }
      }
    }
  }

  return traits;
}

/**
 * Validates a parsed NFT row and flags potential warnings/errors
 */
export function validateBulkNFTItem(item: Partial<BulkNFTItem>, rowIndex: number): {
  status: 'valid' | 'warning' | 'error';
  issues: string[];
} {
  const issues: string[] = [];

  if (!item.name || item.name.trim() === '') {
    issues.push('Missing NFT name');
  }

  if (!item.image || item.image.trim() === '') {
    issues.push('Missing image URL (will use procedural generative artwork)');
  }

  if (item.price !== undefined && item.price < 0) {
    issues.push('Price cannot be negative');
  }

  if (item.royaltyPercentage !== undefined && (item.royaltyPercentage < 0 || item.royaltyPercentage > 25)) {
    issues.push('Royalty must be between 0% and 25%');
  }

  if (item.traits && item.traits.length === 0) {
    issues.push('No traits found (procedural traits will be synthesized)');
  }

  let status: 'valid' | 'warning' | 'error' = 'valid';
  if (issues.some(i => i.includes('Missing NFT name') || i.includes('negative') || i.includes('Royalty must be'))) {
    status = 'error';
  } else if (issues.length > 0) {
    status = 'warning';
  }

  return { status, issues };
}

/**
 * Processes raw parsed rows into clean BulkNFTItem objects
 */
export function processRawSpreadsheetData(rows: Record<string, any>[]): BulkNFTItem[] {
  return rows.map((row, idx) => {
    const rawProps: Record<string, any> = {};

    // Map recognized columns
    for (const [rawKey, val] of Object.entries(row)) {
      const standardKey = matchStandardHeader(rawKey);
      if (standardKey) {
        rawProps[standardKey] = val;
      }
    }

    // Extract traits
    const traits = extractTraitsFromRow(row);

    // Fallback name
    const name = (rawProps.name ? String(rawProps.name).trim() : '') || `Genesis Collective #${String(idx + 1).padStart(3, '0')}`;
    
    // Fallback description
    const description = (rawProps.description ? String(rawProps.description).trim() : '') || 
      `A verified digital collectible in the decentralized series, crafted with immutable metadata and creator royalties.`;

    // Fallback or specified image
    let image = rawProps.image ? String(rawProps.image).trim() : '';
    if (!image) {
      // Use procedural generative vector art as default
      const seed = `BatchItem-${name.replace(/\s+/g, '-')}-${idx}`;
      image = generateArtSVG(seed, 'cyberpunk');
    }

    // If traits are empty, generate procedural traits based on name
    const finalTraits = traits.length > 0 ? traits : (generateSeedAttributes(name, 'cyberpunk') as NFTTrait[]);

    // Price parsing
    let price: number | undefined = undefined;
    if (rawProps.price !== undefined && rawProps.price !== '') {
      const num = Number(rawProps.price);
      if (!isNaN(num)) price = num;
    }

    // Royalty parsing
    let royaltyPercentage: number | undefined = undefined;
    if (rawProps.royaltyPercentage !== undefined && rawProps.royaltyPercentage !== '') {
      const num = Number(rawProps.royaltyPercentage);
      if (!isNaN(num)) royaltyPercentage = num;
    }

    // Category parsing
    let category: any = 'art';
    if (rawProps.category) {
      const catLower = String(rawProps.category).toLowerCase().trim();
      if (['art', 'gaming', 'pfp', 'photography', 'music', 'metaverse', 'utility'].includes(catLower)) {
        category = catLower;
      }
    }

    const unlockableContent = rawProps.unlockableContent ? String(rawProps.unlockableContent).trim() : undefined;

    const itemPartial: Partial<BulkNFTItem> = {
      name,
      description,
      image,
      price,
      royaltyPercentage,
      category,
      unlockableContent,
      traits: finalTraits,
    };

    const validation = validateBulkNFTItem(itemPartial, idx + 1);

    return {
      id: `bulk-row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      rowIndex: idx + 1,
      name,
      description,
      image,
      price,
      royaltyPercentage,
      category,
      unlockableContent,
      traits: finalTraits,
      editionTotal: rawProps.editionTotal ? Number(rawProps.editionTotal) : 1,
      editionNumber: rawProps.editionNumber ? Number(rawProps.editionNumber) : idx + 1,
      selected: true,
      validationStatus: validation.status,
      validationIssues: validation.issues,
    };
  });
}

/**
 * Parses CSV/TSV text using PapaParse
 */
export function parseCSVText(csvText: string): BulkNFTItem[] {
  const result = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors && result.errors.length > 0) {
    console.warn('CSV parsing notices:', result.errors);
  }

  return processRawSpreadsheetData(result.data);
}

/**
 * Parses an uploaded File (CSV, XLSX, XLS, JSON)
 */
export async function parseSpreadsheetFile(file: File): Promise<BulkNFTItem[]> {
  const fileName = file.name.toLowerCase();

  // JSON File handling
  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const json = JSON.parse(text);
    const rows = Array.isArray(json) ? json : (json.items || json.nfts || [json]);
    return processRawSpreadsheetData(rows);
  }

  // Excel (.xlsx, .xls) handling
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    return processRawSpreadsheetData(rows);
  }

  // Default to CSV/TSV text parsing
  const text = await file.text();
  return parseCSVText(text);
}

/**
 * Pre-built Curated Sample Spreadsheets for instant testing
 */
export const SAMPLE_SPREADSHEETS = {
  cyberpunkPFP: {
    id: 'cyberpunkPFP',
    title: 'Cyberpunk Syndicate PFPs (10 NFTs)',
    badge: 'PFP / Avatar Collection',
    description: '10 futuristic avatar NFTs with custom factions, cybernetic augmentations, rarity tiers, and secret unlockable access codes.',
    csv: `Name,Description,Price,Royalty,Category,Trait: Faction,Trait: Cyberware,Trait: Rarity Tier,Trait: Power Level,Trait: Chroma Aura,Unlockable
Cyber Samurai #001,"Master of the neon katana and high-voltage kinetic shielding. Forged in Neo-Tokyo Sector 7.",0.08,7.5,pfp,Shadow Ronin,Neural Blade Mark IV,Mythic,98,Obsidian Neon,Vault Pass: KYOTO-NEON-001 | Discord Role: Clan Elder
Aegis Sentinel #002,"Heavy-armored bio-mechanical guardian engineered for decentralized network defense.",0.06,7.5,pfp,Iron Citadel,Titanium Exo-Frame,Legendary,92,Cyber Cyan,Vault Pass: AEGIS-SENT-002 | Access high-res 8K render
Glitch Hacker #003,"Ghost operative adept at zero-day smart contract exploitation and holographic camouflage.",0.05,5.0,pfp,Null Vector,Sub-Dermal Quantum Deck,Epic,88,Prismatic Glitch,Vault Pass: NULL-HACK-003 | Private API key
Chroma Valkyrie #004,"Aerial vanguard commanding supersonic propulsion arrays and plasma photon blasters.",0.07,7.5,pfp,Solaris Guild,Hyper-Drive Wings,Legendary,94,Solar Gold,Vault Pass: VALK-SOLAR-004 | VIP community pass
Neon Alchemist #005,"Synthetic bio-matter engineer synthesizing decentralized elixirs and ether catalysts.",0.04,5.0,pfp,Chroma Labs,Nanite Splicer,Rare,84,Emerald Plasma,Vault Pass: ALCH-NEON-005 | Early access drops
Void Phantom #006,"A specter from the zero-point dimension equipped with antimatter phase cloak.",0.09,10.0,pfp,Void Walkers,Dimensional Anchor,Mythic,99,Abyssal Violet,Vault Pass: VOID-PHANT-006 | Secret Telegram vault
Pulse Runner #007,"High-speed data courier navigating the decentralized fiber-optic hyperways.",0.03,5.0,pfp,Speed Demons,Kevlar Reflex Coils,Uncommon,78,Electric Indigo,Vault Pass: PULSE-RUN-007 | 3D avatar rig file
Mech Overlord #008,"Colossal apex automaton powered by twin nuclear tokamak micro-reactors.",0.12,8.0,pfp,Iron Citadel,Heavy Gauss Cannon,Mythic,97,Molten Crimson,Vault Pass: MECH-LORD-008 | Custom 3D VRM model
Cyber Siren #009,"Acoustic frequency manipulator capable of sonic hypnosis and data corruption.",0.05,7.5,pfp,Solaris Guild,Harmonic Vocal Matrix,Epic,89,Bioluminescent Aqua,Vault Pass: SIREN-CYB-009 | Lossless FLAC audio pack
Nexus Archon #010,"The sovereign intelligence overseeing the immutable decentralized consensus nexus.",0.15,10.0,pfp,Genesis Core,Quantum Singularity Core,Mythic,100,Transcendent White,Vault Pass: NEXUS-ARCHON-010 | Founder council seat`
  },

  generativeFineArt: {
    id: 'generativeFineArt',
    title: 'Generative Harmonics 1/1 (8 NFTs)',
    badge: 'Fine Art / Algorithmic',
    description: 'Algorithmic geometric compositions with mathematical complexity scores, color palettes, and curated museum descriptions.',
    csv: `Name,Description,Price,Royalty,Category,Trait: Algorithm,Trait: Symmetry Order,Trait: Palette Harmony,Trait: Complexity Score,Trait: Medium
Harmonic Resonance #01,"Complex Fourier series visualizer mapping sinusoidal acoustic interference patterns.",0.12,5.0,art,Fourier Transform,8-Fold Rotational,Cyan & Obsidian,94,Algorithmic Vector
Fibonacci Spiral #02,"A continuous golden-ratio tessellation expressing organic logarithmic growth.",0.15,5.0,art,Golden Spiral,Infinite Logarithmic,Solar Amber,96,Pure Mathematical GL
Quantum Superposition #03,"Probabilistic cloud density functions visualizing Schrödinger wave collapse states.",0.18,7.5,art,Wave Mechanics,Non-Euclidean,Cosmic Indigo,98,Quantum Simulation
Perlin Topography #04,"Multi-octave simplex noise gradients simulating extraterrestrial mountain ranges.",0.10,5.0,art,Perlin Simplex,Chaotic Continuous,Emerald Aurora,88,Procedural Terrain
Lorenz Attractor #05,"Deterministic chaos rendered through 100000 orbital differential iterations.",0.22,10.0,art,Strange Attractor,3D Dual Wing,Prismatic Ultraviolet,99,Chaos Dynamics
Voronoi Mosaic #06,"Centroidal Voronoi relaxation generating dynamic stained-glass polygon matrices.",0.09,5.0,art,Voronoi Tessellation,Hexagonal Relaxed,Ruby Gold,85,Geometric Mosaic
Mandelbrot Deep Dive #07,"Infinite fractal boundary exploring boundary coordinates at 10^14 magnification.",0.25,10.0,art,Fractal Geometry,Self-Similar Infinite,Bioluminescent Azure,100,Complex Plane Render
Cellular Automata #08,"Conway-inspired discrete dynamical lattice modeling self-replicating artificial life.",0.11,5.0,art,Turing Cellular,Grid 2D Periodic,Monochrome Neon,90,Discrete Grid Simulation`
  },

  gamingLoot: {
    id: 'gamingLoot',
    title: 'Mythic RPG Weapons & Relics (8 NFTs)',
    badge: 'Gaming / Metaverse',
    description: 'Equippable on-chain gaming items with damage stats, element ratings, durability, and in-game unlockables.',
    csv: `Name,Description,Price,Royalty,Category,Trait: Item Type,Trait: Elemental Affinity,Trait: Damage Rating,Trait: Durability,Trait: Tier,Unlockable
Dragonfire Broadsword,"Forged in elder wyrm breath. Deals +450 Fire damage and ignites targets for 6s.",0.07,5.0,gaming,Two-Handed Blade,Infernal Fire,450,100/100,Legendary,In-Game Claim Code: LOOT-DRAGON-01
Frostguard Tower Shield,"Imbued with ancient glacial runes. Grants 80% cold resistance and knockback immunity.",0.05,5.0,gaming,Heavy Shield,Glacial Frost,120,250/250,Epic,In-Game Claim Code: LOOT-SHIELD-02
Shadowstrike Dagger,"Dual poisoned stiletto designed for stealth backstabs with 3.5x critical multiplier.",0.04,5.0,gaming,Dagger,Void Poison,380,85/85,Rare,In-Game Claim Code: LOOT-DAGGER-03
Celestial Archangel Staff,"Focuses divine solar luminescence to heal allies and vaporize undead legions.",0.10,7.5,gaming,Magic Staff,Holy Radiance,520,150/150,Mythic,In-Game Claim Code: LOOT-STAFF-04
Thunderbolt Repeating Crossbow,"Rapid-fire arbalest firing energized lightning bolts at 300 rounds per minute.",0.06,5.0,gaming,Ranged Crossbow,Chain Lightning,410,120/120,Epic,In-Game Claim Code: LOOT-XBOW-05
Titanium Power Gauntlets,"Hydraulic powered fist weapons that shatter granite obstacles and enemy defenses.",0.05,5.0,gaming,Fist Weapon,Kinetic Force,360,200/200,Rare,In-Game Claim Code: LOOT-FIST-06
Phoenix Rebirth Ring,"Legendary talisman that auto-resurrects the bearer with full health once per dungeon.",0.14,10.0,gaming,Accessory Relic,Solar Rebirth,0,Infinite,Mythic,In-Game Claim Code: LOOT-RING-07
Voidwalker Cloak,"Grants the ability to phase through solid structures and evade enemy detection for 10s.",0.08,5.0,gaming,Armor Cloak,Dimensional Void,50,90/90,Legendary,In-Game Claim Code: LOOT-CLOAK-08`
  }
};

/**
 * Downloads a clean, well-commented CSV template
 */
export function downloadCSVTemplate() {
  const templateCsv = `Name,Description,Price,Royalty,Category,Trait: Rarity Tier,Trait: Archetype,Trait: Power Level,Trait: Element,Unlockable
Cyber Pioneer #001,"An exclusive decentralized avatar featuring cybernetic enhancements and high-frequency neon aesthetics.",0.05,7.5,art,Mythic,Vanguard,95,Plasma,Secret decryption key: VAULT-PASS-001
Cyber Pioneer #002,"A heavy defensive sentinel guarding the on-chain registry.",0.05,7.5,art,Legendary,Sentinel,88,Kinetic,Secret decryption key: VAULT-PASS-002
Cyber Pioneer #003,"An agile covert operative navigating dark fiber networks.",0.05,7.5,art,Epic,Ghost,92,Quantum,Secret decryption key: VAULT-PASS-003`;

  const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'nft_bulk_mint_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a sample JSON template matching standard ERC-721 / OpenSea batch format
 */
export function downloadJSONTemplate() {
  const templateJson = [
    {
      name: "Cyber Vanguard #001",
      description: "Genesis vanguard operative engineered for decentralized cyber warfare.",
      image: "ipfs://QmCyberVanguard001/art.png",
      price: 0.08,
      royaltyPercentage: 7.5,
      category: "pfp",
      unlockableContent: "Vault Pass: KYOTO-001 | Discord Clan Role: Vanguard Elder",
      attributes: [
        { trait_type: "Faction", value: "Shadow Ronin" },
        { trait_type: "Rarity Tier", value: "Mythic", rarityPercentage: 3 },
        { trait_type: "Augmentation", value: "Neural Katana Mk IV" },
        { trait_type: "Power Level", value: 99, display_type: "number" }
      ]
    },
    {
      name: "Cyber Vanguard #002",
      description: "Heavy bio-armored sentinel defending the decentralized nexus core.",
      image: "ipfs://QmCyberVanguard002/art.png",
      price: 0.06,
      royaltyPercentage: 7.5,
      category: "pfp",
      unlockableContent: "Vault Pass: AEGIS-002 | Access 8K Vector Render",
      attributes: [
        { trait_type: "Faction", value: "Iron Citadel" },
        { trait_type: "Rarity Tier", value: "Legendary", rarityPercentage: 8 },
        { trait_type: "Augmentation", value: "Titanium Kinetic Shield" },
        { trait_type: "Power Level", value: 92, display_type: "number" }
      ]
    },
    {
      name: "Cyber Vanguard #003",
      description: "Covert reconnaissance operative weaving quantum encryption streams.",
      image: "ipfs://QmCyberVanguard003/art.png",
      price: 0.05,
      royaltyPercentage: 7.5,
      category: "pfp",
      unlockableContent: "Vault Pass: STEALTH-003 | Private Audio Log",
      attributes: [
        { trait_type: "Faction", value: "Void Phantoms" },
        { trait_type: "Rarity Tier", value: "Epic", rarityPercentage: 18 },
        { trait_type: "Augmentation", value: "Chroma Cloak" },
        { trait_type: "Power Level", value: 87, display_type: "number" }
      ]
    }
  ];

  const jsonStr = JSON.stringify(templateJson, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'nft_bulk_mint_template.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports current active batch to JSON matching standard ERC-721 format
 */
export function exportBatchToJSON(items: BulkNFTItem[], filename: string = 'exported_nft_batch.json') {
  const exportData = items.map(item => ({
    name: item.name,
    description: item.description,
    image: item.image,
    price: item.price,
    royaltyPercentage: item.royaltyPercentage,
    category: item.category,
    unlockableContent: item.unlockableContent,
    editionNumber: item.editionNumber,
    editionTotal: item.editionTotal,
    attributes: item.traits.map(t => ({
      trait_type: t.trait_type,
      value: t.value,
      display_type: t.display_type,
      rarityPercentage: t.rarityPercentage
    }))
  }));

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates automated AI batch metadata for any theme and count
 */
export function generateAIBatchMetadata(params: {
  theme: string;
  count: number;
  style: 'cyberpunk' | 'cosmic' | 'geometric' | 'glitch' | 'minimal';
  category: 'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility';
  defaultPrice: number;
  defaultRoyalty: number;
}): BulkNFTItem[] {
  const { theme, count, style, category, defaultPrice, defaultRoyalty } = params;
  const cleanTheme = theme.trim() || 'Cosmic Genesis';

  const themePrefixes = [
    'Alpha', 'Prime', 'Apex', 'Nova', 'Cyber', 'Quantum', 'Elysian', 'Vortex',
    'Astral', 'Zenith', 'Phantom', 'Chronos', 'Hyperion', 'Eclipse', 'Nexus'
  ];

  const roles = [
    'Vanguard', 'Sentinel', 'Oracle', 'Ronin', 'Architect', 'Reaper',
    'Commander', 'Specter', 'Warden', 'Pathfinder', 'Harbinger', 'Alchemist'
  ];

  const items: BulkNFTItem[] = [];

  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    const prefix = themePrefixes[i % themePrefixes.length];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const tokenNum = String(idx).padStart(3, '0');
    const name = `${cleanTheme} ${prefix} ${role} #${tokenNum}`;

    const loreTemplates = [
      `A master-tier ${role.toLowerCase()} forged during the dawn of the ${cleanTheme} epoch. Possesses rare vibrational resonance and immutable on-chain heritage.`,
      `Engineered for supreme performance in the decentralized metaverse. Wields advanced cryptographic relics and legendary harmonic frequency.`,
      `An elite digital entity guarding the secret archives of ${cleanTheme}. Recognized across the multiverse for unmatched valor and tactical mastery.`,
      `Ancient bio-cybernetic consciousness revitalized through quantum consensus algorithms, featuring unique atmospheric distortion traits.`,
      `A radiant celestial artifact embodying the pure spirit of ${cleanTheme}, granting tokenized access to exclusive creator chambers.`
    ];

    const description = loreTemplates[i % loreTemplates.length];
    const seed = `${cleanTheme}-${prefix}-${role}-${idx}-${Date.now()}`;
    const image = generateArtSVG(seed, style);

    // Tier distribution: top 5% Mythic, next 15% Legendary, next 30% Epic, rest Rare/Uncommon
    let rarityTier = 'Uncommon';
    let rarityPercentage = 45;
    let powerLevel = Math.floor(70 + Math.random() * 15);

    if (idx === 1 || (count >= 10 && idx <= Math.ceil(count * 0.05))) {
      rarityTier = 'Mythic';
      rarityPercentage = 3;
      powerLevel = Math.floor(95 + Math.random() * 5);
    } else if (idx <= Math.ceil(count * 0.20)) {
      rarityTier = 'Legendary';
      rarityPercentage = 9;
      powerLevel = Math.floor(88 + Math.random() * 7);
    } else if (idx <= Math.ceil(count * 0.50)) {
      rarityTier = 'Epic';
      rarityPercentage = 22;
      powerLevel = Math.floor(80 + Math.random() * 8);
    } else {
      rarityTier = 'Rare';
      rarityPercentage = 35;
      powerLevel = Math.floor(75 + Math.random() * 6);
    }

    const factions = ['Neo-Genesis', 'Void Syndicate', 'Aether Guild', 'Solar Empire', 'Chroma Collective'];
    const elements = ['Quantum Plasma', 'Dark Matter', 'Hyper Light', 'Zero-Point', 'Bismuth Crystal'];
    const aurashapes = ['Prismatic Halo', 'Singularity Corona', 'Hexagonal Shield', 'Neon Pulse', 'Stardust Ring'];

    const traits: NFTTrait[] = [
      { trait_type: 'Rarity Tier', value: rarityTier, rarityPercentage },
      { trait_type: 'Faction', value: factions[i % factions.length], rarityPercentage: 20 },
      { trait_type: 'Core Element', value: elements[(i * 3) % elements.length], rarityPercentage: 20 },
      { trait_type: 'Aura Shape', value: aurashapes[(i * 2) % aurashapes.length], rarityPercentage: 20 },
      { trait_type: 'Power Rating', value: powerLevel, display_type: 'number', rarityPercentage: Math.floor(5 + Math.random() * 15) },
      { trait_type: 'Generation', value: 'Gen-1 Genesis', rarityPercentage: 10 }
    ];

    const unlockableContent = `Vault Pass: ${cleanTheme.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}-${tokenNum} | Private High-Res 8K Download & Metaverse Access Pass`;

    items.push({
      id: `ai-gen-bulk-${Date.now()}-${idx}`,
      rowIndex: idx,
      name,
      description,
      image,
      price: +(defaultPrice * (rarityTier === 'Mythic' ? 2.2 : (rarityTier === 'Legendary' ? 1.5 : 1.0))).toFixed(4),
      royaltyPercentage: defaultRoyalty,
      category,
      unlockableContent,
      traits,
      editionTotal: 1,
      editionNumber: idx,
      selected: true,
      validationStatus: 'valid',
      validationIssues: []
    });
  }

  return items;
}

/**
 * Exports current active batch to CSV
 */
export function exportBatchToCSV(items: BulkNFTItem[], filename: string = 'exported_nft_batch.csv') {
  // Collect all unique trait types across items
  const allTraitTypes = new Set<string>();
  items.forEach(item => {
    item.traits.forEach(t => allTraitTypes.add(t.trait_type));
  });

  const traitColumns = Array.from(allTraitTypes);

  // Build CSV rows
  const exportRows = items.map(item => {
    const rowObj: Record<string, any> = {
      Name: item.name,
      Description: item.description,
      Price: item.price !== undefined ? item.price : '',
      Royalty: item.royaltyPercentage !== undefined ? item.royaltyPercentage : '',
      Category: item.category || 'art',
      Image: item.image && !item.image.startsWith('data:') ? item.image : '',
      Unlockable: item.unlockableContent || '',
    };

    traitColumns.forEach(traitType => {
      const match = item.traits.find(t => t.trait_type === traitType);
      rowObj[`Trait: ${traitType}`] = match ? match.value : '';
    });

    return rowObj;
  });

  const csv = Papa.unparse(exportRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
