// src/components/ConnectWallet.jsx
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react"; // Import useEffect
import { ethers } from "ethers";
import { Skeleton } from "@/components/ui/skeleton"; // Optional: for loading state

export const ConnectWallet = ({ isConnected, setIsConnected }) => {
  // Internal address state, managed by this component
  const [address, setAddress] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false); // Optional loading state

  // Effect to fetch address when connection status is true
  useEffect(() => {
    const fetchAddress = async () => {
      if (isConnected && window.ethereum) {
        setIsLoadingAddress(true); // Start loading
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const currentAddress = await signer.getAddress();
          setAddress(currentAddress);
        } catch (error) {
          console.error("Failed to get address:", error);
          // Optionally handle error, e.g., disconnect?
          // setIsConnected(false);
          setAddress(""); // Clear address on error
        } finally {
            setIsLoadingAddress(false); // Finish loading
        }
      } else {
        // Clear address if not connected
        setAddress("");
      }
    };

    fetchAddress();
  }, [isConnected]); // Re-run this effect whenever isConnected changes

  // Original connect function (for button click)
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      setIsLoadingAddress(true); // Show loading on connect click
      try {
        // Request accounts first
        await window.ethereum.request({ method: "eth_requestAccounts" });
        // Setting isConnected will trigger the useEffect above to fetch address
        setIsConnected(true);

      } catch (error) {
        console.error("Failed to connect wallet:", error);
        setIsConnected(false); // Ensure state is false on error
        setAddress("");
      } finally {
          // setIsLoadingAddress(false); // Let the useEffect handle final loading state
      }
    } else {
      console.log("Please install MetaMask!");
      // Maybe show a user-friendly message here
    }
  };

  const disconnectWallet = () => {
    // No specific web3 disconnect usually needed for injected providers,
    // just update the app's state.
    console.log("Disconnecting wallet (clearing state)");
    setAddress("");
    setIsConnected(false);
    // You might want to clear other related state in Layout/App if needed
  };

  // --- Render Logic ---
  if (isConnected) {
      if (isLoadingAddress) {
          // Optional: Show skeleton while address is loading
           return (
               <div className="flex items-center space-x-2">
                 <Skeleton className="h-5 w-24" />
                 <Button variant="outline" disabled>Loading...</Button>
               </div>
           );
      }
      if (address) {
          // Show formatted address and disconnect button
          return (
              <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded" title={address}>
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </span>
                  <Button onClick={disconnectWallet} variant="outline" size="sm">Disconnect</Button>
              </div>
          );
      } else {
          // Fallback if connected but address fetch failed or hasn't completed
           return (
               <div className="flex items-center space-x-2">
                 <span className="text-sm text-red-500">Error fetching address</span>
                 <Button onClick={disconnectWallet} variant="outline" size="sm">Disconnect</Button>
               </div>
           );
      }
  } else {
    // Show connect button
    return (
      <Button onClick={connectWallet}>Connect Wallet</Button>
    );
  }
};