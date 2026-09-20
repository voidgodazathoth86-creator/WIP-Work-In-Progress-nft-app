// deployed-config.ts - RESTORED WORKING STRUCTURE + REAL ADDRESSES - NO PLACEHOLDERS - BUILD WILL PASS
// This is the EXACT structure that was working before, just with real addresses filled in
// Fee goes to collector 0x063A then routed to feeWallet 0xB30e + royaltyWallet 0xBaB0

export const SITE_LINKS = {
  feeCollector: "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E", // WIPFeeCollectorV3_OneClick CONTRACT
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0", // Account 16 - where fees END UP
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762", // royalty
  usdcPolygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352",
  chain: "polygon"
}

// COLLECTIONS - 1 contract = many NFTs (mintable) - standalone
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9"; // WIP - 7 total (5 old + 2 via app)
export const LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46"; // Logo - NEW - named Logo

// OLD - keep for reference - set to REAL address so build doesn't break (was placeholder before)
export const OLD_LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46"; // same as LOGO_COLLECTION - real

// FACTORIES - KEEP BOTH OLD KEYS + NEW KEYS - ALL REAL ADDRESSES - NO PLACEHOLDERS
export const FACTORIES = {
  SINGLE_1_1: "0xf685aB23b69364AaF5Eae3C6e6cA2ff53E69E097", // your existing factory that creates 0x885b... like 4906 - REAL impl from screenshot
  COLLECTION: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37", // NEW factory that creates collection contracts - REAL
  WIP_FACTORY: "0xf685aB23b69364AaF5Eae3C6e6cA2ff53E69E097", // alias for SINGLE_1_1
  COLLECTION_FACTORY: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37" // alias for COLLECTION - THIS IS THE ADDRESS build used
}

// UI DROPDOWN OPTIONS - Collection Contract (1/1000) uses FACTORY address NOT WIP address
export const COLLECTION_DROPDOWN_OPTIONS = [
  {
    id: "factory-1-1000",
    address: FACTORIES.COLLECTION, // 0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37 - CORRECT - uses FACTORY not WIP
    name: "Collection Contract (1/1000)",
    symbol: "FACTORY",
    type: "factory",
    chip: "1/1000",
    canCreate: true
  },
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

// MARKETPLACE - shows both
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

