// src/contexts/NetworkContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useConfig } from './ConfigContext'; // Import useConfig
import { loadNetworksConfig } from '@/config/networks'; // Import the loading function
import { ethers } from 'ethers';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const { configData, isConfigured, isLoading: isConfigLoading } = useConfig(); // Use the config context

  // State holds the entire configuration loaded by loadNetworksConfig
  const [networkConfig, setNetworkConfig] = useState({
      networks: {},
      defaultNetworkKey: null,
      defaultNetwork: null,
      displayPrefs: {},
      projectName: "Loading..." // Initial placeholder
  });

  // State for the *currently selected* network key by the user/wallet
  const [currentNetworkKey, setCurrentNetworkKey] = useState(null);

  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false); // Tracks if NetworkContext has synced

  // Effect to load network config based on ConfigContext
  useEffect(() => {
    if (isConfigured && configData !== null && !isConfigLoading) {
      console.log("NetworkContext: Config data ready, generating network config...");
      const loadedConfig = loadNetworksConfig(configData);
      setNetworkConfig(loadedConfig);
      // Set initial selected key based on loaded default, *before* wallet sync
      setCurrentNetworkKey(loadedConfig.defaultNetworkKey);
       console.log("NetworkContext: Network config generated.", loadedConfig);
       // Don't set isInitialized here yet, wait for wallet sync effect
    } else if (!isConfigLoading && !isConfigured) {
        console.log("NetworkContext: App not configured, clearing network state.");
         setNetworkConfig({ networks: {}, defaultNetworkKey: null, defaultNetwork: null, displayPrefs: {}, projectName: "..." });
         setCurrentNetworkKey(null);
         setIsInitialized(false); // Ensure reset if config becomes invalid
    }
  }, [configData, isConfigured, isConfigLoading]);

  // Derive currentNetwork safely based on the selected key and loaded config
  const currentNetwork = currentNetworkKey ? networkConfig.networks[currentNetworkKey] : null;

  // --- Switch Network Logic ---
  const switchNetwork = useCallback(async (targetNetworkKey) => {
    // Use the loaded networks from state
    const targetNetwork = networkConfig.networks[targetNetworkKey];

    if (!targetNetwork) {
        console.error(`NetworkContext: Switch failed - Target network key "${targetNetworkKey}" not found in loaded config.`);
        setError(`Network "${targetNetworkKey}" is not available or configured correctly.`);
        return;
    }
    if (currentNetworkKey === targetNetworkKey) {
      console.log("NetworkContext: Switch skipped - Already on target network.", { targetNetworkKey, currentNetworkKey });
      return;
    }

     console.log(`NetworkContext: Attempting switch to ${targetNetwork.name} (${targetNetworkKey})`);
     setError(null);
     // Update internal state first - this makes the UI feel responsive
     setCurrentNetworkKey(targetNetworkKey);
     console.log(`NetworkContext: Internal state updated to ${targetNetworkKey}`);


    if (window.ethereum) {
        setIsSwitching(true);
        const switchParams = [{ chainId: targetNetwork.chainIdHex }];
        console.log(`NetworkContext: Requesting wallet switch. Method: wallet_switchEthereumChain, Params:`, JSON.parse(JSON.stringify(switchParams))); // Log clean params
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: switchParams,
            });
            console.log(`NetworkContext: Successfully requested wallet switch to ${targetNetwork.name}. Waiting for 'chainChanged' event for confirmation.`);
            // State already updated optimistically. Wallet event confirms later.
        } catch (switchError) {
            console.error('NetworkContext: Wallet switch error:', switchError.code, switchError.message, switchError);
            // Error Code 4902: Chain not added
            if (switchError.code === 4902) {
                console.log(`NetworkContext: Chain ${targetNetwork.name} not found, attempting to add...`);
                 const addParams = [{
                    chainId: targetNetwork.chainIdHex,
                    chainName: targetNetwork.name,
                    nativeCurrency: { name: targetNetwork.symbol, symbol: targetNetwork.symbol, decimals: 18 },
                    rpcUrls: [targetNetwork.rpcUrl], // Assured to be valid by loadNetworksConfig
                    blockExplorerUrls: targetNetwork.explorerUrl ? [targetNetwork.explorerUrl] : [],
                }];
                 console.log(`NetworkContext: Requesting add chain. Method: wallet_addEthereumChain, Params:`, JSON.parse(JSON.stringify(addParams))); // Log clean params
                 try {
                     await window.ethereum.request({
                         method: 'wallet_addEthereumChain',
                         params: addParams,
                     });
                     console.log(`NetworkContext: Successfully requested add chain ${targetNetwork.name}. Wallet should switch automatically.`);
                     // State already updated optimistically. Wallet event confirms later.
                 } catch (addError) {
                    console.error('NetworkContext: Failed to add network:', addError);
                    setError(`Failed to add ${targetNetwork.name}. Please add it manually via wallet settings.`);
                    // Note: State remains on the targetNetworkKey optimistically. Could revert here if desired.
                 }
            } else {
                // Other switch errors (user rejection, etc.)
                setError(`Failed to switch wallet: ${switchError.message || 'User rejected?'}`);
                 // Note: State remains on the targetNetworkKey optimistically. Could revert here if desired.
            }
        } finally {
            setIsSwitching(false); // Wallet interaction attempt finished
        }
    } else {
         console.log("NetworkContext: No wallet detected, only updated internal state.");
         // No wallet -> switching just changes the internal state/view
         setIsSwitching(false); // Ensure switching is false if no wallet
    }
  }, [currentNetworkKey, networkConfig.networks]); // Depend on current key and loaded networks

  // --- Effect to Sync with Wallet and Finalize Initialization ---
  useEffect(() => {
    // Ensure config is loaded AND networkConfig state has been set before syncing/initializing
    if (isConfigLoading || !isConfigured || !networkConfig.defaultNetworkKey) {
        setIsInitialized(false);
        // console.log("NetworkContext: Waiting for config/network data before initializing...");
        return;
    }

    let isMounted = true;
    console.log("NetworkContext: Running Wallet Sync/Initialization Effect...");
    const initializeAndSyncWallet = async () => {
        let detectedNetworkKey = networkConfig.defaultNetworkKey; // Start with default from loaded config

        if (window.ethereum && window.ethereum.isMetaMask) { // Check for wallet presence
             try {
                 // Use Ethers to get network info safely
                 const provider = new ethers.providers.Web3Provider(window.ethereum, "any"); // "any" allows detection without throwing on unsupported network
                 const network = await provider.getNetwork();
                 const currentChainId = network.chainId;
                 console.log(`NetworkContext: Wallet sync - Detected chain ID: ${currentChainId}`);

                 const matchingKey = Object.keys(networkConfig.networks).find(key => networkConfig.networks[key].chainId === currentChainId);
                 if (matchingKey) {
                     console.log(`NetworkContext: Wallet sync - Matched supported network: ${networkConfig.networks[matchingKey].name} (${matchingKey})`);
                     detectedNetworkKey = matchingKey;
                     // Clear error if user is now on a supported chain
                     setError(prevError => prevError?.includes("Unsupported network") ? null : prevError);
                 } else {
                     console.warn(`NetworkContext: Wallet sync - Connected to unsupported chain ID: ${currentChainId}. Context falling back to default: ${networkConfig.defaultNetworkKey}`);
                     // Set error only if it wasn't already set (avoids flicker)
                     setError(prevError => prevError ? prevError : `Wallet on unsupported network (ID: ${currentChainId}). View set to default.`);
                     // Keep detectedNetworkKey as the loaded default
                 }
             } catch (err) {
                 console.error("NetworkContext: Wallet sync - Error getting network:", err);
                 // Don't set isInitialized=false here, just report error
                 setError(prevError => prevError ? prevError : "Could not detect wallet network.");
                 // Keep detectedNetworkKey as the loaded default
             }
        } else {
             console.log("NetworkContext: Wallet sync - No Ethereum wallet (MetaMask) detected.");
             // Keep detectedNetworkKey as the loaded default
        }

        if (isMounted) {
             // Update the currently selected key based on detection, only if different
             if (currentNetworkKey !== detectedNetworkKey) {
                  console.log(`NetworkContext: Setting current network key based on detection: ${detectedNetworkKey}`);
                  setCurrentNetworkKey(detectedNetworkKey);
             }
             setIsInitialized(true); // Mark context as initialized NOW
             console.log(`NetworkContext: Initialization complete. Final selected key: ${currentNetworkKey || detectedNetworkKey}`);
        }
    };

    initializeAndSyncWallet();

    // Listener for chain changes from the wallet
    const handleChainChanged = (chainIdHex) => {
      if (!isMounted) return;
      const chainId = parseInt(chainIdHex, 16);
      console.log(`NetworkContext: 'chainChanged' event detected. New chainId: ${chainId} (${chainIdHex})`);
      const matchingKey = Object.keys(networkConfig.networks).find(key => networkConfig.networks[key].chainId === chainId);
      let keyToSet = networkConfig.defaultNetworkKey; // Fallback to loaded default

      if (matchingKey) {
        console.log(`NetworkContext: Wallet switched to supported network: ${networkConfig.networks[matchingKey].name}`);
        keyToSet = matchingKey;
        setError(null); // Clear error if user switches to supported chain
      } else {
        console.warn(`NetworkContext: Wallet switched to unsupported chain ID: ${chainId}. Context falling back to default: ${networkConfig.defaultNetworkKey}`);
        setError(`Switched to unsupported network (ID: ${chainId}). View reset to default.`);
      }
      // Update context state only if it differs from current state
      setCurrentNetworkKey(prevKey => {
           if (prevKey !== keyToSet) {
               console.log(`NetworkContext: Updating state from chainChanged event to: ${keyToSet}`);
               return keyToSet;
           }
           return prevKey; // No change needed
       });
    };

    // Setup listener only if wallet exists
    if (window.ethereum) {
        window.ethereum.on('chainChanged', handleChainChanged);
        console.log("NetworkContext: 'chainChanged' listener attached.");
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        console.log("NetworkContext: 'chainChanged' listener removed.");
      }
    };
    // Rerun this effect if the loaded network configuration changes
  }, [networkConfig.networks, networkConfig.defaultNetworkKey, isConfigured, isConfigLoading]);


  // --- Final Context Value ---
  const value = {
    networks: networkConfig.networks, // The dynamically loaded networks object
    currentNetwork: currentNetwork, // The network object for the currently selected key
    currentNetworkKey: currentNetworkKey, // The currently selected network key
    defaultNetworkKey: networkConfig.defaultNetworkKey, // The resolved default key
    displayPrefs: networkConfig.displayPrefs, // Pass display prefs through
    projectName: networkConfig.projectName, // Pass project name through
    switchNetwork, // Function to initiate switching
    isSwitching, // Boolean indicating if a switch is in progress
    isInitialized, // Boolean indicating if NetworkContext has synced with wallet/config
    error, // Any error messages related to network operations/syncing
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

// Custom hook to use the context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === null) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};