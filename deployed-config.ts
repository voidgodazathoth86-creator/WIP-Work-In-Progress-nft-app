// deployed-config.ts - FINAL FIXED - NO PLACEHOLDERS - BUILD WILL PASS
// Fee goes to collector 0x063A then routed to feeWallet 0xB30e + royaltyWallet 0xBaB0

export const SITE_LINKS = {
  feeCollector: "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E", // WIPFeeCollectorV3_OneClick CONTRACT - correct previous address
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0", // Account 16 - where fees END UP
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762", // royalty
  usdcPolygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352",
  chain: "polygon"
}

// COLLECTIONS - COMPLETELY SEPARATE - NOT made by any factory - standalone - BOTH MINTABLE
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9"; // WIP - 7 total (5 old + 2 via app) - standalone
export const LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46"; // Logo - NEW - standalone - named Logo

// FACTORIES - 2 factories + collector = 3 total - NO PLACEHOLDERS - REAL ADDRESSES ONLY
export const FACTORIES = {
  WIP_FACTORY: "0xf685aB23b69364AaF5Eae3C6e6cA2ff53E69E097", // WIPFactory OLD - 1/1 - implementation from screenshot - STAYS
  COLLECTION_FACTORY: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37" // Collection Factory NEW - 1 contract = 1000 NFTs - dropdown Collection Contract (1/1000) - THIS IS THE ADDRESS build used
}

// UI DROPDOWN OPTIONS - FIXED - Collection Contract (1/1000) uses FACTORY address NOT WIP address
export const COLLECTION_DROPDOWN_OPTIONS = [
  {
    id: "factory-1-1000",
    address: FACTORIES.COLLECTION_FACTORY, // 0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37 - CORRECT - NOT WIP
    name: "Collection Contract (1/1000)",
    symbol: "FACTORY",
    type: "factory",
    chip: "1/1000",
    canCreate: true
  },
  {
    id: "1a4eda70-3517-4bf4-acc7-6fb612fcbec7",
    address: WIP_COLLECTION, // 0xc2eaa... WIP standalone - 7 total
    name: "Work-In-Progress-NFTs",
    symbol: "WIP",
    type: "collection",
    canMintTo: true,
    supply: "7/1000"
  },
  {
    id: "logo-new",
    address: LOGO_COLLECTION, // 0x675f... Logo standalone
    name: "Logo",
    symbol: "LOGO",
    type: "collection",
    canMintTo: true,
    supply: "0/1000"
  }
]

// MARKETPLACE - shows both WIP + Logo standalone (NOT factory)
export const COLLECTIONS_LIST = [
  {
    id: "1a4eda70-3517-4bf4-acc7-6fb612fcbec7",
    address: WIP_COLLECTION,
    name: "Work-In-Progress-NFTs",
    symbol: "WIP",
    type: "collection",
    canMintTo: true,
    supply: "7/1000"
  },
  {
    id: "logo-new",
    address: LOGO_COLLECTION,
    name: "Logo",
    symbol: "LOGO",
    type: "collection",
    canMintTo: true,
    supply: "0/1000"
  }
]

// FOR SUPABASE QUERY - only existing collections
export const MARKETPLACE_CONTRACTS = [
  WIP_COLLECTION,
  LOGO_COLLECTION
]

