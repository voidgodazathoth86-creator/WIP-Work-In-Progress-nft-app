export const WIP_COLLECTION = {
  id: 'col-wip-polygon',
  name: 'Work In Progress - WIP Collection',
  symbol: 'WIP',
  chainId: 137,
  chainName: "Polygon",
  contractAddress: "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9" as const,
  royaltyBps: 1000,
  royaltyReceiver: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762" as const,
  marketplaceFeeBps: 0,
  openseaUrl: "https://opensea.io/assets/matic/0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9"
};

export const WIP_LOGO_COLLECTION = {
  id: 'col-wip-logo-polygon',
  name: 'WIP Logo Collection',
  symbol: 'WIPLOGO',
  chainId: 137,
  chainName: "Polygon",
  contractAddress: "0x675fD85FbcB13CE8080DBba780424A9e571B7f46" as const,
  royaltyBps: 1000,
  royaltyReceiver: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762" as const,
  marketplaceFeeBps: 0,
  openseaUrl: "https://opensea.io/assets/matic/0x675fD85FbcB13CE8080DBba780424A9e571B7f46"
};

export const COLLECTION_FACTORY_1000 = {
  id: 'col-contract-1000',
  name: 'Collection Contract (1/1000)',
  symbol: 'CC1000',
  chainId: 137,
  chainName: "Polygon",
  contractAddress: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37" as const,
  factoryAddress: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37" as const,
  maxSupply: 1000,
  royaltyBps: 1000,
  royaltyReceiver: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762" as const,
  polygonScanUrl: "https://polygonscan.com/address/0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37"
};

export const ENFORCE_ROYALTIES = true;
export const ROYALTY_WALLET = "0xBaB06d358B181eB16e3189525BCc0bc4761a3762" as const;

// Authorized minters exclusively permitted to mint to Work In Progress - WIP & WIP Logo collections
export const WIP_AUTHORIZED_MINTERS = [
  "0xBaB06d358B181eB16e3189525BCc0bc4761a3762",
  "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
] as const;

/**
 * Checks if a given wallet address is authorized to mint to WIP or WIP Logo collections.
 */
export function isAuthorizedWipMinter(address: string | undefined | null): boolean {
  if (!address) return false;
  const normalized = address.trim().toLowerCase();
  return WIP_AUTHORIZED_MINTERS.some(m => m.toLowerCase() === normalized);
}

