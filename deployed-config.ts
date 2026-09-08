// WIP NFT App - FINAL DEPLOYED CONFIG
// Fee Collector Deployed LIVE on Polygon - Block 93415806 - 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E

export const DEPLOYED_FEE_COLLECTOR = {
  address: "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E",
  chain: "polygon",
  block: 93415806,
  txHash: "0x5a2...b45b1", // from your Remix screenshot
  feeWallet: "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0", // Account 16 - WIP Fees
  royaltyWallet: "0xBaB06d358B181eB16e3189525BCc0bc4761a3762", // Your main royalty wallet
  usdc: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352", // Polygon USDC - lowercase to fix checksum error
};

export const FEE_CONFIG = {
  mint: 2.5,
  bridge: 1.5,
  list: 0.5,
  tradePercent: 2.5,
};

// Owner wallets are free
export const OWNER_WALLETS = [
  "0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0",
  "0xbab06d358b181eb16e3189525bcc0bc4761a3762",
];
