# Aave V3 Base Metrics Tracker

This project uses [Ponder](https://ponder.sh/) to track key metrics for all Aave V3 assets on the Base blockchain.

## Overview

The project fetches data every 10 blocks from the Aave V3 UiPoolDataProviderV3 contract, which returns comprehensive metrics for all supported assets. The metrics include:

- Supply/Borrow APY
- Total liquidity and debt 
- Utilization rates
- Collateral factors and liquidation parameters
- Caps and limits
- Price data

All metrics are stored in a database and can be analyzed over time.

## Setup

1. Clone this repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file with your RPC URL (optional - uses public RPC if not provided):
```
PONDER_RPC_URL_8453=https://your-rpc-url.com
```

## Configuration

You can adjust the following in `ponder.config.ts`:

- `DEFAULT_START_BLOCK`: The block number to start indexing from
- `interval`: How often to fetch data (currently set to 10 blocks)

## Running the Project

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

## How it Works

1. The `AaveMetricsCheck:block` handler runs every 10 blocks
2. It calls the UiPoolDataProviderV3 contract's `getReservesData` function
3. For each asset, it logs detailed metrics and stores them in the database
4. A retry mechanism is implemented to handle API rate limits

## Database Schema

The project uses the following schema table:

- `marketParameters`: Stores key metrics for each asset, using the asset address and block number as the primary key

You can query this data to analyze trends over time, compare different assets, or monitor specific parameters.

## Customization

To modify what metrics are tracked or how they are formatted, edit the `src/index.ts` file.

## Resources

- [Aave V3 Base Documentation](https://docs.aave.com/developers/deployed-contracts/v3-mainnet/base)
- [Ponder Documentation](https://ponder.sh/docs) 