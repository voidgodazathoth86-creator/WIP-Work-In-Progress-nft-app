// deployed-config.ts - FINAL - MANUAL ID - FULL DROP-IN
// Fee goes to collector 0x063A then routed to feeWallet 0xB30e + royaltyWallet 0xBaB0

export const DEPLOYED_FEE_COLLECTOR = {
  address: "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E",
  chain: "polygon",
  block: 93415806,
  txHash: "0x5a2...b45b1",
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762",
  usdc: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352",
};

export const OWNER_WALLETS = [
  "0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0",
  "0xbab06d358b181eb16e3189525bcc0bc4761a3762",
];

export const SITE_LINKS = {
  feeCollector: "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E",
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762",
  usdcPolygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352",
  chain: "polygon",
  website: { url: "", label: "Website", enabled: false },
  socials: {
    twitter: { url: "", label: "X / Twitter", enabled: false },
    instagram: { url: "", label: "Instagram", enabled: false },
    discord: { url: "", label: "Discord", enabled: false },
    tiktok: { url: "", label: "TikTok", enabled: false },
    youtube: { url: "", label: "YouTube", enabled: false },
  },
  blog: { url: "", label: "Blog", enabled: false },
  newsletter: { url: "", label: "Newsletter", enabled: false, embedEnabled: false },
};

export const ON_CHAIN_STATE = {
  WIP: { address: "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9", totalSupply: 5, nextId: 5, nextPadded: "05", name: "Work-In-Progress-NFTs", symbol: "WIP" },
  LOGO: { address: "0x675fD85FbcB13CE8080DBba780424A9e571B7f46", totalSupply: 0, nextId: 0, type: "token 1/1" }
};

export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9";
export const LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46";

export const FACTORIES = {
  WIP_FACTORY: "0xf685aB23b69364AaF5Eae3C6e6cA2ff53E69E097",
  COLLECTION_FACTORY: "0x663DDf8888B72eC54EE7bfbecC952Fc711BD2e37"
}

export const COLLECTION_DROPDOWN_OPTIONS = [
  {
    id: "factory-1-1000",
    address: FACTORIES.COLLECTION_FACTORY,
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
    supply: `${ON_CHAIN_STATE.WIP.totalSupply}/1000 — Next: #${ON_CHAIN_STATE.WIP.nextPadded} (Manual ID)`,
    nextId: ON_CHAIN_STATE.WIP.nextId,
    manualId: true
  },
  {
    id: "logo-new",
    address: LOGO_COLLECTION,
    name: "Logo",
    symbol: "LOGO",
    type: "token",
    canMintTo: true,
    supply: "0/1 — Token Contract 1/1",
    note: "For 1/1000 Logo collection, deploy new via Collection Factory"
  }
]

export const COLLECTIONS_LIST = [
  {
    id: "1a4eda70-3517-4bf4-acc7-6fb612fcbec7",
    address: WIP_COLLECTION,
    name: "Work-In-Progress-NFTs",
    symbol: "WIP",
    type: "collection",
    canMintTo: true,
    supply: `${ON_CHAIN_STATE.WIP.totalSupply}/1000`,
    nextId: ON_CHAIN_STATE.WIP.nextId
  },
  {
    id: "logo-new",
    address: LOGO_COLLECTION,
    name: "Logo",
    symbol: "LOGO",
    type: "token",
    canMintTo: true,
    supply: "0/1"
  }
]

export const MARKETPLACE_CONTRACTS = [WIP_COLLECTION, LOGO_COLLECTION]
