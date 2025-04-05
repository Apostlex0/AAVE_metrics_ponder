import { onchainTable, primaryKey } from "ponder";

// We'll store a row for each block we track, for each MToken
export const marketParameters = onchainTable(
  "market_parameters",
  (t) => ({
    mTokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),

    // The parameters we want to store
    price: t.bigint(),  // e.g. from oracle
    totalBorrows: t.bigint(),
    utilization: t.real(),
    collateralFactor: t.bigint(),
    reserves: t.bigint(),
    reserveFactor: t.bigint(),
    supplyCap: t.bigint(),
    borrowCap: t.bigint(),
    liquidationIncentive: t.bigint(),
    borrowEnabled: t.boolean().default(false), // Track if borrowing is enabled for this market

    blockTimestamp: t.bigint(),
  }),
  (table) => ({
    // We'll use a composite PK
    pk: primaryKey({ columns: [table.mTokenAddress, table.blockNumber] }),
  })
);

// Store current user positions in each market
export const userPositions = onchainTable(
  "user_positions",
  (t) => ({
    id: t.text().notNull(), // composite user address + market address
    userAddress: t.hex().notNull(),
    mTokenAddress: t.hex().notNull(),
    
    // User's position in the market
    borrowBalance: t.bigint().default(0n),
    supplyBalance: t.bigint().default(0n),
    
    // When was this position last updated
    lastUpdatedBlock: t.bigint().notNull(),
    lastUpdatedTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    userIndex: {
      columns: [table.userAddress]
    },
    marketIndex: {
      columns: [table.mTokenAddress]
    }
  })
);

// Store user transaction history
export const userTransactions = onchainTable(
  "user_transactions",
  (t) => ({
    id: t.text().notNull(), // txHash + logIndex
    userAddress: t.hex().notNull(),
    mTokenAddress: t.hex().notNull(),
    
    // Transaction details
    transactionType: t.text().notNull(), // BORROW, REPAY, SUPPLY, WITHDRAW, LIQUIDATE, LIQUIDATED
    amount: t.bigint().notNull(),
    tokenAmount: t.bigint(), // For mint/redeem/liquidation where token amounts matter
    relatedAddress: t.hex(), // For repayBorrowBehalf, liquidations, etc.
    
    // Block information
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    userIndex: {
      columns: [table.userAddress]
    },
    marketIndex: {
      columns: [table.mTokenAddress]
    },
    typeIndex: {
      columns: [table.transactionType]
    },
    blockIndex: {
      columns: [table.blockNumber]
    }
  })
);
