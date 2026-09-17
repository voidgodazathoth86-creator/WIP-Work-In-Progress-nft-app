// deployed-config.ts - FINAL - BOTH COLLECTIONS MINTABLE + BOTH FACTORIES

export const SITE_LINKS = {
  feeCollector: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0", // ALL FEES GO HERE
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0", // ALL FEES GO HERE
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762",
  usdcPolygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352",
  chain: "polygon"
}

// COLLECTIONS - 1 contract = many NFTs (mintable)
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9"; // WIP - 421/1000
export const LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46"; // Logo - NEW - named Logo

// OLD - keep for reference
export const OLD_LOGO_COLLECTION = "0xC2dE196A2A7AFa7197ff84D7Ef1C8BC7bd9ECcc6";

// FACTORIES - KEEP BOTH
export const FACTORIES = {
  SINGLE_1_1: "0xOLD_SINGLE_FACTORY_KEEP", // your existing factory that creates 0x885b... like 4906 - KEEP - replace with real address
  COLLECTION: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37" // NEW factory that creates collection contracts
}

// MARKETPLACE - shows both
export const COLLECTIONS_LIST = [
  {
    id: "1a4eda70-3517-4bf4-acc7-6fb612fcbec7",
    address: WIP_COLLECTION,
    name: "Work-In-Progress-NFTs",
    symbol: "WIP",
    type: "collection",
    canMintTo: true,
    supply: "421/1000"
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

// FOR SUPABASE QUERY
export const MARKETPLACE_CONTRACTS = [
  WIP_COLLECTION,
  LOGO_COLLECTION
]
