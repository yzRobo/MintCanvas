// src/components/Layout.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Ensure all used icons are imported:
import { WalletIcon, PlusCircleIcon, ShieldIcon, ImageIcon, Loader2, LinkIcon as CreateNftIcon } from "lucide-react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ethers } from "ethers";
import { useNetwork } from '@/contexts/NetworkContext';
import { networks as configNetworks, defaultNetworkKey } from '@/config/networks';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
// DropdownMenu components are no longer needed if we remove the dropdown
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

const OWNER_CHECK_ABI = ['function owner() view returns (address)'];

const Layout = () => {
  const navigate = useNavigate();
  const {
      currentNetwork, networks, switchNetwork, isSwitching,
      isInitialized: networkInitialized, error: networkError
  } = useNetwork();
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);

  const checkOwnership = useCallback(async () => {
    if (!networkInitialized || !isWalletConnected || !currentNetwork?.contractAddress || currentNetwork.contractAddress.toLowerCase() === 'unused') {
      setIsOwner(false); setCheckingOwner(false); return;
    }
    setCheckingOwner(true); let ownerStatus = false;
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        try { await signer.getAddress(); } catch (getAddressError) { console.log("Wallet disconnected/locked during owner check."); setIsOwner(false); setCheckingOwner(false); return; }
        const contract = new ethers.Contract(currentNetwork.contractAddress, OWNER_CHECK_ABI, provider);
        const ownerAddress = await contract.owner();
        const currentAddress = await signer.getAddress();
        ownerStatus = ownerAddress.toLowerCase() === currentAddress.toLowerCase();
      } catch (error) { console.error(`Ownership check error on ${currentNetwork.name}:`, error); ownerStatus = false; }
    }
    setIsOwner(ownerStatus); setCheckingOwner(false);
  }, [networkInitialized, isWalletConnected, currentNetwork]);

  useEffect(() => {
    let isMounted = true;
    const checkInitialConnection = () => { if (window.ethereum?.selectedAddress && isMounted) setIsWalletConnected(true); else if (isMounted) setIsWalletConnected(false); };
    checkInitialConnection();
    const handleAccountsChanged = (accounts) => { const wasConnected = isWalletConnected; const nowConnected = !!(accounts && accounts.length > 0); if (isMounted) { setIsWalletConnected(nowConnected); if (wasConnected && !nowConnected) { setIsOwner(false); setCheckingOwner(true); } } };
    if (window.ethereum) { window.ethereum.on('accountsChanged', handleAccountsChanged); }
    return () => { isMounted = false; if (window.ethereum?.removeListener) { window.ethereum.removeListener('accountsChanged', handleAccountsChanged); } };
  }, [isWalletConnected]);

  useEffect(() => {
    if (isWalletConnected && networkInitialized) { checkOwnership(); }
    else { setIsOwner(false); setCheckingOwner(!networkInitialized); }
  }, [isWalletConnected, networkInitialized, checkOwnership]);

  useEffect(() => {
    if (!checkingOwner && networkInitialized) {
      if (currentNetwork?.ownerOnly && !isOwner) {
         const firstPublicNetworkKey = Object.keys(configNetworks).find(key => !configNetworks[key].ownerOnly) || defaultNetworkKey;
        if (currentNetwork.key !== firstPublicNetworkKey && firstPublicNetworkKey) {
            console.log(`Non-owner on owner-only network (${currentNetwork.key}). Switching to default public (${firstPublicNetworkKey}).`);
            switchNetwork(firstPublicNetworkKey);
        } else if (!firstPublicNetworkKey) { console.error("Config Error: No public networks found."); }
      }
    }
  }, [checkingOwner, isOwner, currentNetwork, networkInitialized, switchNetwork, defaultNetworkKey]);

   const availableNetworksForSwitcher = useMemo(() => {
       if (checkingOwner) return [];
       return Object.values(configNetworks).filter(net => !net.ownerOnly || isOwner);
   }, [isOwner, checkingOwner, configNetworks]); // Added configNetworks as dependency

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b sticky top-0 bg-background z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          {/* TODO: Load project name from config */}
          <h1 className="text-xl md:text-2xl font-bold cursor-pointer whitespace-nowrap" onClick={() => navigate("/")}>NFT Project</h1>
          <div className="flex items-center gap-2 md:gap-4">
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
                       ) : (
                           currentNetwork ?
                             <SelectItem key={currentNetwork.key} value={currentNetwork.key} disabled>{currentNetwork.name}</SelectItem>
                           : <SelectItem value="no-networks" disabled>No networks available</SelectItem>
                       )}
                   </SelectContent>
               </Select>
             ) : ( <Skeleton className="h-9 w-[130px] md:w-[150px]" /> )}
            <ConnectWallet
                isConnected={isWalletConnected}
                setIsConnected={setIsWalletConnected}
            />
          </div>
        </div>
         {networkError && ( <div className="bg-red-500/10 text-red-700 text-xs text-center py-1 px-4 border-t border-b border-red-500/20">Network Error: {networkError}</div> )}
      </header>

      <nav className="border-b sticky top-[73px] bg-background z-10"> {/* Adjusted top value if header height changed */}
        <div className="container mx-auto px-4 py-2 flex space-x-1 sm:space-x-4 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><WalletIcon className="mr-1 h-4 w-4" /> Home</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/gallery")}><ImageIcon className="mr-1 h-4 w-4" /> Gallery</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/mint")} disabled={!currentNetwork?.contractAddress || currentNetwork.contractAddress.toLowerCase() === 'unused'}>
              <PlusCircleIcon className="mr-1 h-4 w-4" /> Mint
          </Button>
          
          {/* Owner Controls & Single Create Metadata Button */}
          {checkingOwner ? (
             <Button variant="ghost" size="sm" disabled className="text-muted-foreground"><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking...</Button>
           ) : isOwner && currentNetwork?.contractAddress && currentNetwork.contractAddress.toLowerCase() !== 'unused' ? (
            <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/owner")}><ShieldIcon className="mr-1 h-4 w-4" /> Owner Panel</Button>
                {/* Single Button for Create Metadata - No Dropdown */}
                <Button variant="ghost" size="sm" onClick={() => navigate('/create-metadata')}>
                    <CreateNftIcon className="mr-1 h-4 w-4" /> Create NFT Metadata
                </Button>
            </>
          ) : null}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <Outlet context={{ isOwner, checkingOwner, isWalletConnected }} />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          {/* TODO: Load project name from config */}
          © {new Date().getFullYear()} Your NFT Project. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;