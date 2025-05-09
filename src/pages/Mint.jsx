// src/pages/Mint.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ethers } from "ethers";
import ErrorMessage from "@/components/ErrorMessage";
import SuccessMessage from "@/components/SuccessMessage";
import { Loader2, CheckCircle, ExternalLink, Info } from "lucide-react"; // Added Info icon
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNetwork } from '@/contexts/NetworkContext';
import { useContract } from '@/hooks/useContract';
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton

// ABI for Mint page functions
const MINT_ABI = [
  "function mint(address to, string memory uri) public",
  "function allowedMinter() public view returns (address)" // Already included
];

// Status Enum for clarity
const MintStatus = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  SIMULATING: 'simulating',
  WAITING_WALLET_CONFIRM: 'waiting_wallet_confirm',
  SENDING_TX: 'sending_tx',
  WAITING_CONFIRMATION: 'waiting_confirmation',
  SUCCESS: 'success',
  ERROR: 'error'
};

const Mint = () => {
  const navigate = useNavigate();
  const { currentNetwork, isInitialized: networkInitialized } = useNetwork();
  const { contract, error: contractError, isLoading: contractLoading } = useContract(MINT_ABI);

  // --- Component state ---
  const [recipient, setRecipient] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [status, setStatus] = useState(MintStatus.IDLE);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [showSuccessHighlight, setShowSuccessHighlight] = useState(false);
  const [currentAllowedMinter, setCurrentAllowedMinter] = useState(null); // State for allowed minter
  const [loadingMinter, setLoadingMinter] = useState(true); // State for loading minter address

  // --- Effect to read tokenURI from URL parameters ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uriFromUrl = params.get('tokenURI');
    if (uriFromUrl) {
      console.log("Mint page found tokenURI in URL:", uriFromUrl);
      setTokenURI(uriFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      console.log("Cleaned tokenURI from URL bar.");
    }
  }, []);

  // --- Effect to fetch the current allowedMinter ---
  useEffect(() => {
    const fetchAllowedMinter = async () => {
      // Don't fetch if contract is loading, has error, or not initialized
      if (contractLoading || contractError || !contract) {
        setCurrentAllowedMinter(null); // Clear if contract issues
        setLoadingMinter(false); // Stop loading indication even on error
        return;
      }
      setLoadingMinter(true);
      try {
        console.log("Mint Page: Fetching allowedMinter...");
        const minterAddress = await contract.allowedMinter();
        console.log("Mint Page: Fetched allowedMinter:", minterAddress);
        setCurrentAllowedMinter(minterAddress);
      } catch (err) {
        console.error("Mint Page: Error fetching allowedMinter:", err);
        setError("Could not fetch current minter address."); // Set component error
        setCurrentAllowedMinter(null);
      } finally {
        setLoadingMinter(false);
      }
    };

    fetchAllowedMinter();
  }, [contract, contractLoading, contractError]); // Re-run if contract instance changes

  // Helper: Reset component state
  const resetState = (clearInputs = false) => {
      setStatus(MintStatus.IDLE);
      setError("");
      setSuccessInfo(null);
      setTxHash("");
      setShowSuccessHighlight(false);
      if (clearInputs) {
          setRecipient("");
          // Keep tokenURI if pre-filled
          // setTokenURI("");
      }
  };

  // Main Mint Handler
  const handleMint = async () => {
    resetState();
    setStatus(MintStatus.VALIDATING);

    if (!networkInitialized || contractLoading) { setError("Network or Contract is initializing."); setStatus(MintStatus.ERROR); return; }
    if (contractError || !contract) { setError(`Contract Error: ${contractError || "Initialization failed."}.`); setStatus(MintStatus.ERROR); return; }
    if (!ethers.utils.isAddress(recipient)) { setError("Invalid recipient address format."); setStatus(MintStatus.ERROR); return; }
    const uriPattern = /^(ipfs:\/\/|https?:\/\/).+/i;
    if (!tokenURI.trim() || !uriPattern.test(tokenURI)) { setError("Invalid Token URI. Must start with ipfs:// or http(s)://."); setStatus(MintStatus.ERROR); return; }

    try {
      const signer = contract.signer;
      const connectedAddress = await signer.getAddress();

      // Check Minter Authorization (using fetched state for clarity, though contract call does the real check)
      setStatus(MintStatus.VALIDATING);
      console.log("Checking minter authorization...");
      // Fetch again just before mint for security, or rely on fetched state if recent enough
      const allowedMinter = await contract.allowedMinter(); // Re-fetch for certainty
      setCurrentAllowedMinter(allowedMinter); // Update state just in case
      if (allowedMinter.toLowerCase() !== connectedAddress.toLowerCase()) {
        throw new Error("Not authorized: Only the allowed minter can perform this action.");
      }
      console.log("Authorization check passed.");

      // Simulate Transaction
      setStatus(MintStatus.SIMULATING);
      console.log("Simulating mint transaction...");
      await contract.callStatic.mint(recipient, tokenURI);
      console.log("Simulation successful.");

      // Send Real Transaction
      setStatus(MintStatus.WAITING_WALLET_CONFIRM);
      console.log(`Requesting mint transaction for URI "${tokenURI}" to ${recipient}...`);
      const tx = await contract.mint(recipient, tokenURI);
      console.log("Transaction sent, hash:", tx.hash);
      setTxHash(tx.hash);
      setStatus(MintStatus.WAITING_CONFIRMATION);
      setSuccessInfo({ message: "Transaction sent! Waiting for confirmation..." });

      // Wait for Confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Success
      setStatus(MintStatus.SUCCESS);
      setSuccessInfo({ message: "NFT minted successfully!", showGalleryLink: true });
      // Fetch the new allowed minter again as it gets reset by the contract
       try {
           const newMinterAddress = await contract.allowedMinter();
           setCurrentAllowedMinter(newMinterAddress);
       } catch { /* ignore fetch error after successful mint */ }


    } catch (err) {
      console.error("Minting process error:", err);
      setStatus(MintStatus.ERROR);
      setSuccessInfo(null); // Clear optimistic message on error
      setTxHash(""); // Clear tx hash on error

      if (err.code === 4001 || err.message?.includes("User rejected")) { setError("Transaction rejected in wallet."); }
      else if (err.code === 'CALL_EXCEPTION') { setError(`Transaction simulation failed: ${err.reason || "Check inputs/contract state?"}`); }
      else if (err.message?.includes("Not authorized")) { setError(err.message); }
      else { setError(`Minting failed: ${err.reason || err.message || "Unknown error"}`); }
    }
  };

  // Success Highlight Effect
  useEffect(() => {
      if (status === MintStatus.SUCCESS) {
          setShowSuccessHighlight(true);
          const timer = setTimeout(() => setShowSuccessHighlight(false), 1500);
          return () => clearTimeout(timer);
      }
  }, [status]);

  // UI State Derivations
  const isLoading = ![MintStatus.IDLE, MintStatus.SUCCESS, MintStatus.ERROR].includes(status);
  const isFormDisabled = isLoading || status === MintStatus.SUCCESS;

  // Button Text Logic
  const getButtonText = () => {
      switch (status) {
          case MintStatus.VALIDATING: return "Validating...";
          case MintStatus.SIMULATING: return "Simulating...";
          case MintStatus.WAITING_WALLET_CONFIRM: return "Confirm in Wallet...";
          case MintStatus.WAITING_CONFIRMATION: return "Confirming Tx...";
          case MintStatus.SUCCESS: return "Mint Successful!";
          default: return "Mint NFT";
      }
  };

  const shortenAddress = (address) => {
      if (!address || address.length < 10) return address || 'N/A';
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  // --- Render Logic ---
  if (!networkInitialized || contractLoading) {
    return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <p className="mt-2 text-muted-foreground">Initializing Contract...</p></div>;
  }
  if (contractError) {
      return <div className="text-center p-10 text-red-600 font-medium">Contract Error: {contractError}. Check console or wallet connection.</div>;
  }
  if (!contract) {
       return <div className="text-center p-10 text-red-600 font-medium">Minting not available: Contract not found on {currentNetwork?.name || 'the selected network'}.</div>;
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-3xl font-bold text-center">Mint New NFT</h2>

      {/* Display Current Allowed Minter */}
      <div className="text-sm text-center text-muted-foreground p-2 border rounded bg-background">
        <Info size={14} className="inline mr-1 mb-0.5" />
        Current Allowed Minter:
        {loadingMinter ? (
          <Skeleton className="h-4 w-24 inline-block ml-1" />
        ) : currentAllowedMinter && currentAllowedMinter !== ethers.constants.AddressZero ? (
          <span className="font-mono ml-1" title={currentAllowedMinter}>{shortenAddress(currentAllowedMinter)}</span>
        ) : (
          <span className="ml-1 italic">None set (Owner must set one)</span>
        )}
      </div>


      <div className={cn(
          "p-6 border rounded-lg shadow-sm transition-all duration-500",
          showSuccessHighlight ? "border-green-500 bg-green-500/10 ring-2 ring-green-500 ring-offset-2" : "border-border"
      )}>
          <div className="space-y-4">
              {/* Recipient Input */}
              <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input id="recipient" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={isFormDisabled} aria-describedby="recipient-desc"/>
                  <p id="recipient-desc" className="text-xs text-muted-foreground">Wallet address to receive the NFT.</p>
              </div>

              {/* Token URI Input */}
              <div className="space-y-2">
                  <Label htmlFor="tokenURI">Token URI</Label>
                  <Input id="tokenURI" placeholder="ipfs://<CID> or https://... (or use link from Owner)" value={tokenURI} onChange={(e) => setTokenURI(e.target.value)} disabled={isFormDisabled} aria-describedby="tokenuri-desc"/>
                  <p id="tokenuri-desc" className="text-xs text-muted-foreground">Link to the NFT's metadata (pre-filled if using Owner's link).</p>
              </div>

              {/* Mint Button */}
              <Button onClick={handleMint} disabled={isFormDisabled || !recipient || !tokenURI} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {status === MintStatus.SUCCESS && <CheckCircle className="mr-2 h-4 w-4" />}
                  {getButtonText()}
              </Button>
          </div>
      </div>

      {/* Status Messages Area */}
      {error && (<ErrorMessage message={error} onClose={() => setError("")} />)}
      {successInfo && (
          <SuccessMessage
              message={successInfo.message}
              txHash={txHash}
              explorerBaseUrl={currentNetwork?.explorerUrl}
              onClose={resetState}
          >
              {successInfo.showGalleryLink && (
                    <Button variant="link" size="sm" onClick={() => navigate('/gallery')} className="mt-1 p-0 h-auto text-blue-600">
                       View Gallery
                    </Button>
              )}
          </SuccessMessage>
       )}
    </div>
  );
};

export default Mint;