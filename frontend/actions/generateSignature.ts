"use server";

import { ethers } from "ethers";

export async function generateSignature({
  userAddress,
  tokenAddress,
  chance,
  id,
}: {
  userAddress: string;
  tokenAddress: string;
  chance: number;
  id: number;
}) {
  try {
    // Load key from environment variable
    const generatorKey = process.env.SIGNER_GENERATOR_KEY;
    if (!generatorKey) {
      throw new Error("SIGNER_GENERATOR_KEY not set in environment");
    }

    // Validate inputs
    if (!ethers.isAddress(userAddress) || !ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid address format");
    }
    if (chance < 0 || !Number.isInteger(chance)) {
      throw new Error("Invalid chance value");
    }
    if (id <= 0 || !Number.isInteger(id)) {
      throw new Error("Invalid Pokémon ID");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const wallet = new ethers.Wallet(generatorKey);

    // Generate hash
    const hash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [userAddress, tokenAddress, chance, id, timestamp]
    );

    // Sign the hash
    const signature = await wallet.signMessage(ethers.getBytes(hash));

    console.log("Generated signature:", { hash, signature, timestamp });

    return { signature, timestamp };
  } catch (error) {
    console.error("Error generating signature:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate signature: ${errorMessage}`);
  }
}


export async function generateSignatureEvolve({
  userAddress,
  tokenAddress,
  id,
  newId,
}: {
  userAddress: string;
  tokenAddress: string;
  id: number;
  newId: number;
}) {
  try {
    const generatorKey = process.env.SIGNER_GENERATOR_KEY;
    if (!generatorKey) {
      throw new Error('SIGNER_GENERATOR_KEY not set in environment');
    }

    if (!ethers.isAddress(userAddress) || !ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid address format');
    }
    if (id <= 0 || !Number.isInteger(id)) {
      throw new Error('Invalid Pokémon ID');
    }
    if (newId <= 0 || !Number.isInteger(newId)) {
      throw new Error('Invalid evolved Pokémon ID');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const wallet = new ethers.Wallet(generatorKey);

    // Match smart contract's keccak256(abi.encodePacked(msg.sender, _tokenAddress, _currentId, _newId, _timestamp))
    const hash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256', 'uint256'],
      [userAddress, tokenAddress, id, newId, timestamp]
    );

    const signature = await wallet.signMessage(ethers.getBytes(hash));

    // console.log('Generated evolve signature:', { hash, signature, timestamp });

    return { signature, timestamp };
  } catch (error) {
    console.error('Error generating evolve signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate signature: ${errorMessage}`);
  }
}