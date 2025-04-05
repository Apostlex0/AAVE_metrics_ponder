import { createConfig } from "ponder";
import { http } from "viem";

import { UiPoolDataProviderV3Abi } from "./abis/UiPoolDataProviderV3";

/**
 * Aave V3 on Base - Key contracts:
 *   - UiPoolDataProviderV3: Contract that provides data for all Aave reserves
 *   - PoolAddressesProvider: Used as parameter for getReservesData function
 */
const UI_POOL_DATA_PROVIDER_ADDRESS = "0x68100bD5345eA474D93577127C11F39FF8463e93";
const POOL_ADDRESSES_PROVIDER = "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D";

// Default starting block for Base
const DEFAULT_START_BLOCK = 28539000; // You can adjust this to your preferred starting point

export default createConfig({
  networks: {
    base: { 
      chainId: 8453, 
      transport: http(process.env.PONDER_RPC_URL_8453 || "https://mainnet.base.org"),
    },
  },
  contracts: {
    UiPoolDataProvider: {
      abi: UiPoolDataProviderV3Abi,
      network: "base",
      address: UI_POOL_DATA_PROVIDER_ADDRESS,
      startBlock: DEFAULT_START_BLOCK,
    },
  },
  blocks: {
    AaveMetricsCheck: {
      network: "base",
      startBlock: DEFAULT_START_BLOCK,
      interval: 10, // Run every 10 blocks
    },
  },
});
