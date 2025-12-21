/**
 * Auto-generated TypeScript interfaces for Base L2 Bridge contracts
 * Generated: 2025-12-21T15:20:52.183Z
 */

import { ethers } from 'ethers';


// Contract addresses by network
export const BRIDGE_CONTRACTS = {
  ethereum: {

  },
  base: {

  },
} as const;

// Helper to create contract instance
export function getBridgeContract(
  contractName: string,
  provider: ethers.Provider
): ethers.Contract {
  const contractData = {};
  
  const data = contractData[contractName as keyof typeof contractData];
  if (!data) {
    throw new Error(`Unknown contract: ${contractName}`);
  }
  
  // @ts-ignore
  const abi = eval(`${contractName}ABI`);
  return new ethers.Contract(data.address, abi, provider);
}
