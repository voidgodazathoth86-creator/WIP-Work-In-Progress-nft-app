// IPFS resolver with reliable public gateway fallbacks and instant branded vector fallbacks
import { getWipArtwork } from '../data/wipArtworks';

const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

/**
 * Resolves an ipfs:// URI or gateway URL to an HTTPS URL.
 * If uri is empty, returns a fallback branded SVG.
 */
export function resolveIpfsUrl(uri: string | undefined | null, fallbackKey?: string, isLogo = false): string {
  if (!uri) {
    return fallbackKey !== undefined ? getWipArtwork(fallbackKey, isLogo) : '';
  }

  // Already a full HTTP/HTTPS URL or Data URI
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    // If it's a generic Unsplash photo and we have a fallback key, prefer the authentic WIP vector artwork!
    if (uri.includes('images.unsplash.com') && fallbackKey !== undefined) {
      return getWipArtwork(fallbackKey, isLogo);
    }
    return uri;
  }

  // Handle ipfs:// prefix
  if (uri.startsWith('ipfs://')) {
    const path = uri.replace('ipfs://', '');
    return `${IPFS_GATEWAYS[0]}${path}`;
  }

  // Raw CIDv0 or CIDv1
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `${IPFS_GATEWAYS[0]}${uri}`;
  }

  return uri;
}

/**
 * Returns alternative gateway URLs to try in case of image onError in <img> tags.
 */
export function getAlternateGateways(uri: string): string[] {
  if (!uri) return [];
  let path = '';
  if (uri.startsWith('ipfs://')) {
    path = uri.replace('ipfs://', '');
  } else {
    for (const gw of IPFS_GATEWAYS) {
      if (uri.startsWith(gw)) {
        path = uri.slice(gw.length);
        break;
      }
    }
  }

  if (!path) return [];
  return IPFS_GATEWAYS.map(gw => `${gw}${path}`);
}
