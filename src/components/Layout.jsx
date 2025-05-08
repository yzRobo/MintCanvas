// src/components/Layout.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useOutletContext as useLayoutOutletContext } from "react-router-dom"; // Renamed hook import
import { Button } from "@/components/ui/button";
import { WalletIcon, PlusCircleIcon, ShieldIcon, ImageIcon, Loader2, LinkIcon as CreateNftIcon } from "lucide-react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ethers } from "ethers";
import { useNetwork } from '@/contexts/NetworkContext'; // Use this hook for network data
import { useConfig } from '@/contexts/ConfigContext'; // Import useConfig to get project name
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const OWNER_CHECK_ABI = ['function owner() view returns (address)'];

const Layout = () => {
  const navigate = useNavigate();
  const { configData } = useConfig(); // Get config data for project name

  // Use the network context hook
  const {
      currentNetwork,
      networks, // Use this from context
      switchNetwork,
      isSwitching,
      isInitialized: networkInitialized,
      error: networkError
  } = useNetwork();

  // Use the outlet context hook (renamed import to avoid naming conflict)
  // Note: isOwner and checkingOwner passed down from App.jsx aren't used here,
  // we derive them locally based on wallet connection and contract calls.
  // We ONLY need isWalletConnected from the Outlet if App.jsx doesn't handle it,
  // but let's manage it locally for better encapsulation.
  const [isWalletConnected, setIsWalletConnected] = useState(false); // Manage locally
  const [layoutIsOwner, setLayoutIsOwner] = useState(false); // Local state for owner status
  const [checkingOwner, setCheckingOwner] = useState(true); // Local state for check

  // Project Name from loaded config or fallback
  const projectName = configData?.projectName || "NFT Project";

  // --- Owner Check Logic ---
  const checkOwnership = useCallback(async () => {
    // Needs wallet connected, network initialized, and a valid contract address
    if (!isWalletConnected || !networkInitialized || !currentNetwork?.contractAddress || currentNetwork.contractAddress.toLowerCase() === 'unused') {
        setLayoutIsOwner(false);
        setCheckingOwner(false);
        return;
    }

    setCheckingOwner(true);
    let ownerStatus = false;
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const currentAddress = await signer.getAddress(); // Check if wallet is accessible
        const contract = new ethers.Contract(currentNetwork.contractAddress, OWNER_CHECK_ABI, provider);
        const ownerAddress = await contract.owner();
        ownerStatus = ownerAddress.toLowerCase() === currentAddress.toLowerCase();
        console.log(`Layout Owner Check: Connected=${currentAddress}, Owner=${ownerAddress}, Match=${ownerStatus}`);
      } catch (error) {
        console.error(`Layout: Ownership check error on ${currentNetwork.name}:`, error.code, error.message);
        // Handle specific errors like wallet locked/disconnected during check
        if (error.code === 'UNSUPPORTED_OPERATION' || error.message?.includes('unknown account')) {
           console.log("Layout: Wallet likely disconnected/locked during owner check.");
           // Optionally set isWalletConnected to false here if needed elsewhere?
        }
        ownerStatus = false;
      }
    } else {
        console.log("Layout: Window.ethereum not found for owner check.");
        ownerStatus = false;
    }
    setLayoutIsOwner(ownerStatus);
    setCheckingOwner(false);
  }, [networkInitialized, isWalletConnected, currentNetwork]); // Dependencies


  // --- Wallet Connection Listener ---
  useEffect(() => {
    let isMounted = true;
    const handleAccountsChanged = (accounts) => {
      const wasConnected = isWalletConnected;
      const nowConnected = !!(accounts && accounts.length > 0);
      if (isMounted) {
        console.log(`Layout: accountsChanged event. WasConnected: ${wasConnected}, NowConnected: ${nowConnected}`);
        setIsWalletConnected(nowConnected);
        // If disconnected, reset owner status immediately
        if (wasConnected && !nowConnected) {
           console.log("Layout: Wallet disconnected, resetting owner status.");
           setLayoutIsOwner(false);
           setCheckingOwner(true); // Will re-evaluate when connected again
        }
        // If it just connected, trigger an owner check
        // if (!wasConnected && nowConnected && networkInitialized) {
        //    checkOwnership(); // checkOwnership dependency effect handles this better
        // }
      }
    };

    // Initial check
    if (window.ethereum?.selectedAddress && isMounted) {
        console.log("Layout: Initial wallet connection detected.");
        setIsWalletConnected(true);
    } else if(isMounted) {
        setIsWalletConnected(false);
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      isMounted = false;
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
    // Rerun ONLY if the initial state could somehow change, which is unlikely.
    // The handleAccountsChanged callback handles subsequent changes.
  }, []); // Run once on mount


  // --- Trigger Owner Check when Dependencies Change ---
  useEffect(() => {
    // Only run the check if we have the necessary info and wallet connection status is known
    if (networkInitialized && isWalletConnected) {
        console.log("Layout: Triggering owner check due to state change.");
        checkOwnership();
    } else {
        // If not connected or network not ready, ensure owner status is false and checking is done (or waiting)
        setLayoutIsOwner(false);
        setCheckingOwner(!networkInitialized); // If network isn't init, we are technically still 'checking' prerequisites
        console.log(`Layout: Skipping owner check. NetworkInit: ${networkInitialized}, WalletConnected: ${isWalletConnected}`);
    }
  }, [isWalletConnected, networkInitialized, currentNetwork?.contractAddress, checkOwnership]); // Re-check if connection, network, or contract changes


  // --- Redirect Non-Owners from Owner-Only Networks ---
   useEffect(() => {
    // Ensure networks object is loaded and not empty, and checks are complete
    if (!checkingOwner && networkInitialized && currentNetwork && networks && Object.keys(networks).length > 0) {
      if (currentNetwork.ownerOnly && !layoutIsOwner) { // Use layoutIsOwner state
         const firstPublicNetworkKey = Object.keys(networks).find(key => !networks[key].ownerOnly);
         const defaultKeyToSwitch = firstPublicNetworkKey || Object.keys(networks)[0]; // Fallback to first available

        if (defaultKeyToSwitch && currentNetwork.key !== defaultKeyToSwitch) {
            console.log(`Layout: Non-owner on owner-only network (${currentNetwork.key}). Switching to public/default (${defaultKeyToSwitch}).`);
            switchNetwork(defaultKeyToSwitch); // Call context switch function
        } else if (!defaultKeyToSwitch) {
            console.error("Layout: Config Error: No public/default networks found in the loaded config to switch to.");
        }
      }
    }
  }, [checkingOwner, layoutIsOwner, currentNetwork, networkInitialized, switchNetwork, networks]); // Add networks, layoutIsOwner


  // --- Calculate Available Networks for Switcher ---
  const availableNetworksForSwitcher = useMemo(() => {
    // Ensure networks object from context is available and we are initialized
    if (checkingOwner || !networkInitialized || !networks) {
        console.log("AvailableNetworks: Waiting for init/owner check/networks");
        return [];
     }

    // Filter the networks object from the useNetwork hook
    const filtered = Object.values(networks).filter(net => {
        // Condition 1: Check owner permission if applicable
        const ownerAllowed = !net.ownerOnly || layoutIsOwner;
        // Condition 2: Check if a contract is actually configured for this network
        const contractConfigured = net.isContractConfigured; // Use the flag added in loadNetworksConfig

        // Keep the network only if both conditions are met
        return ownerAllowed && contractConfigured;
    });

    console.log("AvailableNetworks: Filtered list:", filtered.map(n => n.key));
    return filtered;
    // dependencies
  }, [layoutIsOwner, checkingOwner, networkInitialized, networks]);


  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b sticky top-0 bg-background z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          {/* Use projectName from config */}
          <h1 className="text-xl md:text-2xl font-bold cursor-pointer whitespace-nowrap" onClick={() => navigate("/")}>{projectName}</h1>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Network Switcher - Uses context values */}
            {networkInitialized ? (
               <Select
                  value={currentNetwork?.key || ''}
                  onValueChange={switchNetwork}
                  disabled={isSwitching || availableNetworksForSwitcher.length <= 1}
                >
                   <SelectTrigger className="w-[130px] md:w-[150px] h-9 text-xs md:text-sm" disabled={isSwitching}>
                       <SelectValue placeholder="Select Network" />
                   </SelectTrigger>
                   <SelectContent>
                       {availableNetworksForSwitcher.length > 0 ? (
                           availableNetworksForSwitcher.map((network) => (
                               <SelectItem key={network.key} value={network.key}>{network.name}</SelectItem>
                           ))
                       ) : ( // Handle case where no networks are available *at all*
                           <SelectItem value="no-networks" disabled>No networks</SelectItem>
                       )}
                   </SelectContent>
               </Select>
             ) : ( <Skeleton className="h-9 w-[130px] md:w-[150px]" /> )}
            <ConnectWallet
                isConnected={isWalletConnected} // Pass local state down
                setIsConnected={setIsWalletConnected} // Allow ConnectWallet to update local state
            />
          </div>
        </div>
         {networkError && ( <div className="bg-red-500/10 text-red-700 text-xs text-center py-1 px-4 border-t border-b border-red-500/20">Network Error: {networkError}</div> )}
      </header>

      <nav className="border-b sticky top-[73px] bg-background z-10"> {/* Adjusted top value */}
        <div className="container mx-auto px-4 py-2 flex space-x-1 sm:space-x-4 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><WalletIcon className="mr-1 h-4 w-4" /> Home</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/gallery")}><ImageIcon className="mr-1 h-4 w-4" /> Gallery</Button>
          {/* Disable based on currentNetwork from context */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/mint")} disabled={!currentNetwork?.contractAddress || currentNetwork.contractAddress.toLowerCase() === 'unused'}>
              <PlusCircleIcon className="mr-1 h-4 w-4" /> Mint
          </Button>

          {/* Owner Controls */}
          {checkingOwner ? (
             <Button variant="ghost" size="sm" disabled className="text-muted-foreground"><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking...</Button>
             // Use layoutIsOwner and currentNetwork from context
           ) : layoutIsOwner && currentNetwork?.contractAddress && currentNetwork.contractAddress.toLowerCase() !== 'unused' ? (
            <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/owner")}><ShieldIcon className="mr-1 h-4 w-4" /> Owner Panel</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/create-metadata')}>
                    <CreateNftIcon className="mr-1 h-4 w-4" /> Create NFT Metadata
                </Button>
            </>
          ) : null}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Pass down the derived owner status and checking status */}
        <Outlet context={{ isOwner: layoutIsOwner, checkingOwner, isWalletConnected }} />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          {/* Use projectName from config */}
          © {new Date().getFullYear()} {projectName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;