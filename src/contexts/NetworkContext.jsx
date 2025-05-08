// src/contexts/NetworkContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { networks as configNetworks, defaultNetworkKey as configDefaultKey } from '@/config/networks'; // Use imported config directly
import { ethers } from 'ethers';

const NetworkContext = createContext(null);

// Helper to find the first available public network key
const getFirstPublicNetworkKey = () => {
    return Object.keys(configNetworks).find(key => !configNetworks[key].ownerOnly) || configDefaultKey;
};


export const NetworkProvider = ({ children }) => {
  // Initialize state trying to use default, ensure it's valid
  const initialDefaultKey = configNetworks[configDefaultKey] ? configDefaultKey : getFirstPublicNetworkKey();
  const [currentNetworkKey, setCurrentNetworkKey] = useState(initialDefaultKey);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Derive currentNetwork safely, falling back to the initial default
  const currentNetwork = configNetworks[currentNetworkKey] || configNetworks[initialDefaultKey];

  // Function to attempt switching network in the wallet AND update context state
  const switchNetwork = useCallback(async (targetNetworkKey) => {
    const targetNetwork = configNetworks[targetNetworkKey];

    // Ensure target is valid and different from current
    if (!targetNetwork || currentNetworkKey === targetNetworkKey) {
      console.log("Context: Switch skipped - invalid target or already on target network.", { targetNetworkKey, currentNetworkKey });
      return;
    }

    console.log(`Context: Attempting switch to ${targetNetwork.name} (${targetNetworkKey})`);
    setError(null); // Clear previous errors on new attempt

    // --- Update Context State Regardless of Wallet ---
    // This ensures the UI reflects the target network even if no wallet action occurs.
    // Do this *before* potential async wallet operations.
    setCurrentNetworkKey(targetNetworkKey);
    console.log(`Context: Internal state updated to ${targetNetworkKey}`);


    // --- Attempt Wallet Switch ONLY if Wallet Exists ---
    if (window.ethereum) {
        setIsSwitching(true); // Only set switching state if we interact with wallet
        console.log(`Context: Requesting wallet switch to chainId ${targetNetwork.chainIdHex}`);
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetNetwork.chainIdHex }],
            });
            // Success: wallet confirms via 'chainChanged' event later, state already updated above.
            console.log(`Context: Successfully requested wallet switch to ${targetNetwork.name}.`);
        } catch (switchError) {
            console.error('Context: Wallet switch error:', switchError);
            // Error Code 4902: Chain not added
            if (switchError.code === 4902) {
                console.log(`Context: Chain ${targetNetwork.name} not found, attempting to add...`);
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: targetNetwork.chainIdHex,
                            chainName: targetNetwork.name,
                            nativeCurrency: { name: targetNetwork.symbol, symbol: targetNetwork.symbol, decimals: 18 },
                            rpcUrls: [targetNetwork.rpcUrl].filter(Boolean),
                            blockExplorerUrls: [targetNetwork.explorerUrl].filter(Boolean),
                        }],
                    });
                     // Wallet usually switches upon adding, 'chainChanged' handles confirmation.
                     console.log(`Context: Successfully requested add chain ${targetNetwork.name}.`);
                } catch (addError) {
                    console.error('Context: Failed to add network:', addError);
                    setError(`Failed to add ${targetNetwork.name}. Manually add or switch.`);
                    // NOTE: Even if add fails, context state *remains* on targetNetworkKey.
                    // This might be desired (show the intended network) or confusing.
                    // Alternative: Revert state? setCurrentNetworkKey(currentNetworkKey); // Revert on add failure? - Decided against for now.
                }
            } else {
                // Other switch errors (e.g., user rejection)
                setError(`Failed to switch wallet: ${switchError.message || 'User rejected?'}`);
                 // NOTE: Context state remains on targetNetworkKey even if user rejects.
                 // Alternative: Revert state? setCurrentNetworkKey(currentNetworkKey); // Revert on rejection? - Decided against for now.
            }
        } finally {
            setIsSwitching(false); // Wallet interaction finished
        }
    } else {
         console.log("Context: No wallet detected, only updating internal state.");
         // No wallet action needed, internal state is already updated.
    }
  }, [currentNetworkKey]); // Dependency: currentNetworkKey

  // Effect to sync state with wallet's current chain on load and changes
  useEffect(() => {
    let isMounted = true;
    const initializeNetwork = async () => {
        let detectedNetworkKey = initialDefaultKey; // Start with default
        if (window.ethereum) {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const network = await provider.getNetwork();
                const currentChainId = network.chainId;
                console.log(`Context: Initial wallet chain ID detected: ${currentChainId}`);
                const matchingKey = Object.keys(configNetworks).find(key => configNetworks[key].chainId === currentChainId);
                if (matchingKey) {
                    console.log(`Context: Wallet connected to supported network: ${configNetworks[matchingKey].name}`);
                    detectedNetworkKey = matchingKey;
                } else {
                    console.warn(`Context: Wallet connected to unsupported chain ID: ${currentChainId}. Using default: ${initialDefaultKey}`);
                    setError(`Wallet on unsupported network (ID: ${currentChainId}). Switched view to default.`);
                    // Keep detectedNetworkKey as initialDefaultKey
                }
            } catch (err) {
                 console.error("Context: Error getting initial network:", err);
                 setError("Could not detect wallet network.");
                 // Keep detectedNetworkKey as initialDefaultKey
            }
        } else {
            console.log("Context: No wallet detected, using default network.");
            // Keep detectedNetworkKey as initialDefaultKey
        }

        if (isMounted) {
             // *** Crucial: Only set state if it's different from initial ***
             // This prevents unnecessary updates if default is correct
             if (currentNetworkKey !== detectedNetworkKey) {
                 setCurrentNetworkKey(detectedNetworkKey);
             }
             setIsInitialized(true); // Mark as initialized AFTER setting the key
             console.log(`Context: Initialization complete. Final network key: ${detectedNetworkKey}`);
        }
    };

    initializeNetwork();

    // Listener for chain changes from the wallet
    const handleChainChanged = (chainIdHex) => {
      if (!isMounted) return; // Avoid state updates if unmounted
      const chainId = parseInt(chainIdHex, 16);
      console.log(`Context: Wallet chain changed event. New chainId: ${chainId} (${chainIdHex})`);
      const matchingKey = Object.keys(configNetworks).find(key => configNetworks[key].chainId === chainId);
      let keyToSet = initialDefaultKey; // Default to fallback
      if (matchingKey) {
        console.log(`Context: Wallet switched to supported network: ${configNetworks[matchingKey].name}`);
        keyToSet = matchingKey;
        setError(null); // Clear error if user switches to supported chain
      } else {
        console.warn(`Context: Wallet switched to unsupported chain ID: ${chainId}. Setting context to default.`);
        setError(`Switched to unsupported network (ID: ${chainId}). View reset to default.`);
        // keyToSet remains initialDefaultKey
      }
       // Update context state only if it differs from current state
       setCurrentNetworkKey(prevKey => {
           if (prevKey !== keyToSet) {
               return keyToSet;
           }
           return prevKey; // No change needed
       });
    };

    if (window.ethereum) { window.ethereum.on('chainChanged', handleChainChanged); }

    // Cleanup listener
    return () => {
      isMounted = false;
      if (window.ethereum?.removeListener) { window.ethereum.removeListener('chainChanged', handleChainChanged); }
    };
    // Run only once on mount, relies on callback updates for subsequent changes
  }, [initialDefaultKey]); // Depend on initialDefaultKey derived from config

  const value = {
    networks: configNetworks, // Provide the full config
    currentNetwork: currentNetwork, // Derived state, guaranteed to be a valid network object
    currentNetworkKey: currentNetworkKey, // The current key state
    switchNetwork,
    isSwitching,
    isInitialized,
    error,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

// Custom hook to use the context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === null) { throw new Error('useNetwork must be used within a NetworkProvider'); }
  return context;
};