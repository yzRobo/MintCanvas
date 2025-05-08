// src/hooks/useContract.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNetwork } from '@/contexts/NetworkContext';

/**
 * Custom hook to get an ethers.js Contract instance connected to the signer.
 * Assumes wallet connection checks are handled by the calling component or context.
 *
 * @param {Array | ethers.ContractInterface} contractAbi The ABI of the contract.
 * @returns {{
 *   contract: ethers.Contract | null;
 *   provider: ethers.providers.Web3Provider | null;
 *   signer: ethers.Signer | null;
 *   error: string | null;
 *   isLoading: boolean;
 * }}
 */
export const useContract = (contractAbi) => {
  const { currentNetwork, isInitialized: networkInitialized } = useNetwork();

  // State for the hook's return values
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Track initialization

  useEffect(() => {
    const setupContract = async () => {
      setIsLoading(true);
      // Reset state before attempting setup
      setContract(null);
      setProvider(null);
      setSigner(null);
      setError(null);

      // --- Prerequisite Checks ---
      if (!networkInitialized) {
        console.log("useContract: Network context not initialized yet.");
        // Don't set error, just wait for initialization
        setIsLoading(false); // Or keep true until initialized? Let's say false.
        return;
      }
      if (!currentNetwork?.contractAddress) {
        console.log(`useContract: No contract address configured for network: ${currentNetwork?.name}`);
        // Don't set error here, let calling component decide based on null contract
        setIsLoading(false);
        return;
      }
      if (!contractAbi || contractAbi.length === 0) {
           console.error("useContract: Contract ABI is missing or empty.");
           setError("Contract ABI is missing.");
           setIsLoading(false);
           return;
      }
      if (typeof window.ethereum === "undefined") {
        console.log("useContract: Wallet (window.ethereum) not detected.");
        // setError("Wallet not detected."); // Let calling component handle UI
        setIsLoading(false);
        return;
      }

      // --- Setup Contract Instance ---
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();

        // Verify connection by trying to get address (throws if disconnected)
        await web3Signer.getAddress();

        const instance = new ethers.Contract(
          currentNetwork.contractAddress,
          contractAbi,
          web3Signer // Connect contract instance to the signer
        );

        setProvider(web3Provider);
        setSigner(web3Signer);
        setContract(instance);
        console.log(`useContract: Initialized contract for ${currentNetwork.name} at ${currentNetwork.contractAddress}`);

      } catch (err) {
        // Handle errors during setup (e.g., user disconnected, RPC issues)
        console.error("useContract: Error setting up contract instance:", err);
        if (err.message?.includes("unknown account")) {
             setError("Wallet disconnected or locked. Please connect/unlock.");
        } else {
             setError(err.message || "Failed to initialize contract connection.");
        }
        // Ensure state is reset on error
        setContract(null);
        setProvider(null);
        setSigner(null);
      } finally {
         setIsLoading(false); // Setup attempt finished
      }
    };

    setupContract();

    // Re-run effect if network changes, ABI changes (unlikely), or initialization status changes
  }, [networkInitialized, currentNetwork, contractAbi]);

  // Return the contract instance and related info
  return { contract, provider, signer, error, isLoading };
};