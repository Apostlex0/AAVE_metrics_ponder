import { ponder } from "ponder:registry";
import { marketParameters } from "ponder:schema";
import { createPublicClient, http, defineChain } from "viem";
import { UiPoolDataProviderV3Abi } from "../abis/UiPoolDataProviderV3";

// Constants for contract addresses
const UI_POOL_DATA_PROVIDER_ADDRESS = "0x68100bD5345eA474D93577127C11F39FF8463e93";
const POOL_ADDRESSES_PROVIDER = "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D";

// Define Base chain for direct client
const baseChain = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.PONDER_RPC_URL_8453 || "https://mainnet.base.org"],
    },
    public: {
      http: ["https://mainnet.base.org"],
    },
  },
});

// Create a direct viem client for testing if needed
const directClient = createPublicClient({
  chain: baseChain,
  transport: http(process.env.PONDER_RPC_URL_8453 || "https://mainnet.base.org"),
});

// Helper function to format percentages from basis points (1 basis point = 0.01%)
function formatBasisPoints(basisPoints: bigint): string {
  return (Number(basisPoints) / 100).toFixed(2);
}

// Helper to convert ray units (10^27) to percentage
function rayToPercent(ray: bigint): string {
  return (Number(ray) / 1e25).toFixed(2); // Convert ray to percentage
}

// Helper to convert price to USD with the right decimals
function formatPriceToUSD(price: bigint): string {
  return (Number(price) / 1e8).toFixed(2); // Aave prices are in USD with 8 decimals
}

// Helper to format token amounts based on their decimals
function formatTokenAmount(amount: bigint, decimals: number): string {
  return (Number(amount) / 10 ** decimals).toFixed(decimals > 6 ? 4 : decimals);
}

// Helper to get token amount in dollars
function getTokenAmountInUSD(amount: bigint, price: bigint, decimals: number): string {
  const priceInUsd = Number(price) / 1e8; // Convert price to USD (8 decimals)
  const tokenAmount = Number(amount) / 10 ** decimals; // Convert token amount to normal units
  return (tokenAmount * priceInUsd).toFixed(2);
}

// Helper to get cap amount in dollars (multiply by 10^6 then by price)
function getCapAmountInUSD(capAmount: bigint, price: bigint, decimals: number): string {
  const priceInUsd = Number(price) / 1e8; // Convert price to USD (8 decimals)
  const multipliedCap = capAmount * 1000000n; // Multiply by 10^6 as requested
  const capTokenAmount = Number(multipliedCap) / 10 ** decimals; // Convert token amount to normal units
  return (capTokenAmount * priceInUsd).toFixed(2);
}

// Helper function to sleep for a specified number of milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function with retry logic for contract calls
async function fetchReservesDataWithRetry(context: any, maxRetries = 3, initialDelay = 2000) {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      return await context.client.readContract({
        abi: UiPoolDataProviderV3Abi,
        address: UI_POOL_DATA_PROVIDER_ADDRESS,
        functionName: "getReservesData",
        args: [POOL_ADDRESSES_PROVIDER],
      });
    } catch (error) {
      console.error(`Error fetching reserves data (attempt ${retries + 1}/${maxRetries}):`, error);
      
      // Check if we've reached max retries
      if (retries === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      await sleep(delay);
      delay *= 2;
      retries++;
      console.log(`Retrying... (${retries}/${maxRetries})`);
    }
  }
  
  throw new Error("Max retries reached");
}

// Market Parameters tracking on each 10 blocks
ponder.on("AaveMetricsCheck:block", async ({ event, context }) => {
  try {
    const { db } = context;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    
    console.log(`\n========== AAVE V3 METRICS (Block ${blockNumber}) ==========`);

    // Call getReservesData with retry mechanism
    const [reservesData, baseCurrencyInfo] = await fetchReservesDataWithRetry(context);

    // Log base currency info
    console.log(`\n--- Base Currency Info ---`);
    console.log(`Market Reference Currency Price: $${(Number(baseCurrencyInfo.marketReferenceCurrencyPriceInUsd) / 1e8).toFixed(2)} USD`);
    console.log(`Network Base Token Price: $${(Number(baseCurrencyInfo.networkBaseTokenPriceInUsd) / 1e8).toFixed(2)} USD`);
    
    // Process each reserve
    for (const reserve of reservesData) {
      const tokenSymbol = reserve.symbol;
      const tokenDecimals = Number(reserve.decimals);
      
      // Calculate utilization
      let utilization = 0;
      const totalSupply = reserve.availableLiquidity + reserve.totalScaledVariableDebt;
      if (totalSupply > 0n) {
        utilization = Number(reserve.totalScaledVariableDebt * 10000n / totalSupply) / 100;
      }
      
      // Calculate USD values
      const availableLiquidityUSD = getTokenAmountInUSD(reserve.availableLiquidity, reserve.priceInMarketReferenceCurrency, tokenDecimals);
      const totalVariableDebtUSD = getTokenAmountInUSD(reserve.totalScaledVariableDebt, reserve.priceInMarketReferenceCurrency, tokenDecimals);
      const supplyCapUSD = getCapAmountInUSD(reserve.supplyCap, reserve.priceInMarketReferenceCurrency, tokenDecimals);
      const borrowCapUSD = getCapAmountInUSD(reserve.borrowCap, reserve.priceInMarketReferenceCurrency, tokenDecimals);
      
      console.log(`\n--- ${tokenSymbol} METRICS ---`);
      console.log(`Address: ${reserve.underlyingAsset}`);
      console.log(`Price: $${formatPriceToUSD(reserve.priceInMarketReferenceCurrency)}`);
      console.log(`Available Liquidity: ${formatTokenAmount(reserve.availableLiquidity, tokenDecimals)} ${tokenSymbol} ($${availableLiquidityUSD})`);
      console.log(`Total Variable Debt: ${formatTokenAmount(reserve.totalScaledVariableDebt, tokenDecimals)} ${tokenSymbol} ($${totalVariableDebtUSD})`);
      console.log(`Utilization: ${utilization.toFixed(2)}%`);
      console.log(`Supply APY: ${rayToPercent(reserve.liquidityRate)}%`);
      console.log(`Borrow APY: ${rayToPercent(reserve.variableBorrowRate)}%`);
      console.log(`Reserve Factor: ${formatBasisPoints(reserve.reserveFactor)}%`);
      console.log(`LTV: ${formatBasisPoints(reserve.baseLTVasCollateral)}%`);
      console.log(`Liquidation Threshold: ${formatBasisPoints(reserve.reserveLiquidationThreshold)}%`);
      console.log(`Liquidation Bonus: ${formatBasisPoints(reserve.reserveLiquidationBonus)}%`);
      console.log(`Borrowing Enabled: ${reserve.borrowingEnabled}`);
      console.log(`Supply Cap: ${formatTokenAmount(reserve.supplyCap, tokenDecimals)} ${tokenSymbol} ($${supplyCapUSD})`);
      console.log(`Borrow Cap: ${formatTokenAmount(reserve.borrowCap, tokenDecimals)} ${tokenSymbol} ($${borrowCapUSD})`);
      
      // Write to database
      try {
        await db.insert(marketParameters).values({
          mTokenAddress: reserve.underlyingAsset,
          blockNumber: BigInt(blockNumber),
          price: reserve.priceInMarketReferenceCurrency,
          totalBorrows: reserve.totalScaledVariableDebt,
          utilization,
          collateralFactor: reserve.baseLTVasCollateral,
          reserves: 0n, // Not directly available
          reserveFactor: reserve.reserveFactor,
          supplyCap: reserve.supplyCap,
          borrowCap: reserve.borrowCap,
          liquidationIncentive: reserve.reserveLiquidationBonus,
          borrowEnabled: reserve.borrowingEnabled,
          blockTimestamp: BigInt(blockTimestamp),
        });
      } catch (error) {
        console.error(`Error inserting market parameters for ${tokenSymbol}:`, error);
      }
    }
    
    console.log(`\n========== END OF METRICS (Block ${blockNumber}) ==========\n`);
  } catch (error) {
    console.error(`Error processing block ${event.block.number}:`, error);
  }
});