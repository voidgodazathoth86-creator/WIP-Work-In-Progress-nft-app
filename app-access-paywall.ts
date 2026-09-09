// app-access-paywall.ts - Add this to your frontend to charge for app access
// Uses your LIVE fee collector 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E

import { DEPLOYED_FEE_COLLECTOR, OWNER_WALLETS } from './deployed-config';

export const APP_ACCESS_FEES = {
  one_time: { usdc: 5.00, label: "Single Access - $5", days: 1 },
  monthly: { usdc: 9.99, label: "Monthly - $9.99", days: 30 },
  lifetime: { usdc: 49.99, label: "Lifetime - $49.99", days: null }
};

// Check if wallet has access (call this on app load)
export async function hasAppAccess(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  // Owner wallets get free access
  if (OWNER_WALLETS.map(w => w.toLowerCase()).includes(wallet.toLowerCase())) {
    return true;
  }
  // Check DB via API
  const res = await fetch(`/api/app-access/${wallet}`);
  const data = await res.json();
  if (!data.subscription) return false;
  if (data.subscription.is_owner_free) return true;
  if (!data.subscription.expires_at) return true; // lifetime
  return new Date(data.subscription.expires_at) > new Date();
}

// Charge for access - calls your fee collector contract
export async function payForAppAccess(
  wallet: string, 
  plan: 'one_time' | 'monthly' | 'lifetime',
  signer: any // wagmi/viem signer
) {
  const fee = APP_ACCESS_FEES[plan];
  const usdcAddress = DEPLOYED_FEE_COLLECTOR.usdc; // 0x3c499c542cef5e3811e1192ce70d8cc03d5c3352 on Polygon
  const feeCollector = DEPLOYED_FEE_COLLECTOR.address;

  // 1. Approve USDC to fee collector (if needed)
  // 2. Call feeCollector.collectFee(wallet, amount, "app_access")
  // This is same pattern as your mint fee - reuses same contract, same feeWallet 0xB30e...

  // Example with viem/wagmi:
  // const txHash = await writeContract({
  //   address: feeCollector,
  //   abi: FeeCollectorABI,
  //   functionName: 'collectFee',
  //   args: [parseUnits(fee.usdc.toString(), 6), plan] // USDC 6 decimals
  // });

  // After tx, save to DB:
  // await fetch('/api/app-access', {
  //   method: 'POST',
  //   body: JSON.stringify({ wallet, plan, fee_usdc: fee.usdc, tx_hash: txHash })
  // });

  return { success: true, plan, fee };
}

// React component example:
/*
function AppPaywall({ wallet }) {
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    hasAppAccess(wallet).then(setHasAccess);
  }, [wallet]);

  if (hasAccess) return <YourApp />;
  
  return (
    <div className="paywall">
      <h2>WIP Cross-Chain NFT App - Premium Access</h2>
      <p>Your collections: 0xc2eaa6...f9ef9 & 0xC2dE19...Ecc6 live on Polygon</p>
      <button onClick={() => payForAppAccess(wallet, 'one_time')}>Pay $5 - 24h Access</button>
      <button onClick={() => payForAppAccess(wallet, 'monthly')}>Pay $9.99 - Monthly</button>
      <button onClick={() => payForAppAccess(wallet, 'lifetime')}>Pay $49.99 - Lifetime</button>
      <p>Owner wallets free: {OWNER_WALLETS[0].slice(0,10)}...</p>
    </div>
  );
}
*/
