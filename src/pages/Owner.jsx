// src/pages/Owner.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext, Navigate } from 'react-router-dom'; // Import useNavigate and Navigate
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ethers } from "ethers"; // Keep for utils
import ErrorMessage from "@/components/ErrorMessage";
import SuccessMessage from "@/components/SuccessMessage";
// Import ALL needed icons from lucide-react here
import { Loader2, CheckCircle, ExternalLink, ShieldAlert, ArrowRight } from "lucide-react";
import { useNetwork } from '@/contexts/NetworkContext';
import { useContract } from '@/hooks/useContract'; // Import the hook
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import Alert Dialog for Renounce
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading

// Combine ABIs needed for this page
const OWNER_PAGE_ABI = [
    'function setAllowedMinter(address) external',
    'function setBaseURI(string) external',
    'function transferOwnership(address) public',
    'function renounceOwnership() public',
    'function owner() view returns (address)', // Keep owner check if needed independently
];

// Action Status Enum
const OwnerActionStatus = {
    IDLE: 'idle',
    SUBMITTING: 'submitting',
    WAITING_CONFIRMATION: 'waiting_confirmation',
    SUCCESS: 'success',
    ERROR: 'error'
};

const Owner = () => {
  // --- Hooks Called at the TOP ---
  const navigate = useNavigate();
  // Get context from Layout FIRST
  const { isOwner: layoutIsOwner, checkingOwner: layoutCheckingOwner, isWalletConnected } = useOutletContext();
  const { currentNetwork, isInitialized: networkInitialized } = useNetwork();
  // Use the contract hook (depends on network context)
  const { contract, error: contractError, isLoading: contractLoading } = useContract(OWNER_PAGE_ABI);

  // --- State Variables ---
  const [newMinter, setNewMinter] = useState("");
  const [newBaseURI, setNewBaseURI] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [minterStatus, setMinterStatus] = useState(OwnerActionStatus.IDLE);
  const [uriStatus, setUriStatus] = useState(OwnerActionStatus.IDLE);
  const [transferStatus, setTransferStatus] = useState(OwnerActionStatus.IDLE);
  const [renounceStatus, setRenounceStatus] = useState(OwnerActionStatus.IDLE);
  const [error, setError] = useState(""); // For action-specific errors
  const [successInfo, setSuccessInfo] = useState(null); // For success messages

  // --- Helpers ---
  const resetMessages = () => { setError(""); setSuccessInfo(null); };
  // Resets individual action status. Consider if inputs should clear automatically.
  const resetActionState = (actionType) => {
      resetMessages(); // Clear global messages on any new action attempt
      if (actionType === 'minter') { setMinterStatus(OwnerActionStatus.IDLE); }
      else if (actionType === 'uri') { setUriStatus(OwnerActionStatus.IDLE); }
      else if (actionType === 'transfer') { setTransferStatus(OwnerActionStatus.IDLE); }
      else if (actionType === 'renounce') { setRenounceStatus(OwnerActionStatus.IDLE); }
      // Decide whether to clear inputs here or leave them
      // setNewMinter(""); setNewBaseURI(""); setNewOwner("");
  };
  const shortenAddress = (address) => { if (!address || address.length < 10) return address || ''; return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`; };


  // --- Generic Action Handler ---
  const handleAction = async (
      actionType, // String identifier ('Set Minter', 'Set Base URI', etc.)
      setStatus, // State setter for this action (e.g., setMinterStatus)
      validationFn, // Function to validate inputs for this action (returns true/false)
      contractFnName, // Name of the contract function to call
      args = [], // Arguments for the contract function
      successMessageFn // Optional function to generate success message: (args) => string
  ) => {
      // Reset global messages and the specific action's status to IDLE before starting
      resetMessages();
      setStatus(OwnerActionStatus.IDLE);

      // Validation
      if (validationFn && !validationFn()) {
          // Error message should be set within validationFn using setError
          setStatus(OwnerActionStatus.ERROR);
          return;
      }
      if (!contract) {
          setError("Contract not available. Check network/connection.");
          setStatus(OwnerActionStatus.ERROR); // Also set specific status to error
          return;
      }

      setStatus(OwnerActionStatus.SUBMITTING);
      let txHash = null;

      try {
          console.log(`Executing ${actionType}... Args:`, args);
          const tx = await contract[contractFnName](...args);
          txHash = tx.hash;
          setStatus(OwnerActionStatus.WAITING_CONFIRMATION);
          setSuccessInfo({ message: `${actionType} transaction sent...`, txHash });

          const receipt = await tx.wait();
          setStatus(OwnerActionStatus.SUCCESS);

          let finalMessage = `${actionType} successful!`;
          if (successMessageFn) {
              finalMessage = successMessageFn(args);
          }
          setSuccessInfo({ message: finalMessage, txHash: receipt.transactionHash });

          // Clear specific input on success
          if (actionType === 'Set Minter') setNewMinter("");
          else if (actionType === 'Set Base URI') setNewBaseURI("");
          else if (actionType === 'Transfer Ownership') setNewOwner("");
          // Renounce doesn't have an input to clear

      } catch (err) {
          console.error(`${actionType} Error:`, err);
          setStatus(OwnerActionStatus.ERROR);
          setSuccessInfo(null); // Clear optimistic message
          if (err.code === 4001 || err.message?.includes("User rejected")) { setError("Transaction rejected in wallet."); }
          else { setError(`${actionType} failed: ${err.reason || err.message || "Unknown error"}`); }
      }
  };

  // --- Specific Action Triggers ---
  const triggerSetMinter = () => handleAction(
      'Set Minter', setMinterStatus,
      () => { if (!ethers.utils.isAddress(newMinter)) { setError("Invalid new minter address format."); return false; } return true; },
      'setAllowedMinter', [newMinter],
      (args) => `New minter successfully set to ${shortenAddress(args[0])}!`
  );
  const triggerSetUri = () => handleAction(
    'Set Base URI',
    setUriStatus,
    () => {
        const trimmedUri = newBaseURI.trim();
        if (trimmedUri === '' || trimmedUri.startsWith('ipfs://') || trimmedUri.startsWith('https://')) {
            setError(''); // Clear previous error if now valid
            return true;
        } else {
            setError("Invalid Base URI format. Must be empty or start with ipfs:// or https://.");
            return false;
        }
    },
    'setBaseURI',
    [newBaseURI], // Send the current input value (which might be empty)
    (args) => args[0].trim() === '' ? 'Base URI successfully cleared!' : `Base URI successfully updated!`
    );
  const triggerTransfer = () => handleAction(
      'Transfer Ownership', setTransferStatus,
      () => { if (!ethers.utils.isAddress(newOwner)) { setError("Invalid new owner address format."); return false; } return true; },
      'transferOwnership', [newOwner],
      (args) => `Ownership transfer to ${shortenAddress(args[0])} initiated! New owner must accept.`
  );
   // Renounce needs the dialog confirmation first
   const triggerRenounce = () => executeRenounceOwnership(); // Called by Dialog Action
   const executeRenounceOwnership = () => handleAction(
       'Renounce Ownership', setRenounceStatus,
       null, // No input validation needed here
       'renounceOwnership', [],
       () => "Ownership successfully renounced."
   );


    // --- Button State Helper ---
    const getButtonState = (status) => {
        const isLoading = status === OwnerActionStatus.SUBMITTING || status === OwnerActionStatus.WAITING_CONFIRMATION;
        let text = "Submit"; // Default text
        let icon = null;
        let variant = "default"; // Default variant

        switch (status) {
            case OwnerActionStatus.SUBMITTING: text = "Submitting..."; icon = <Loader2 className="mr-2 h-4 w-4 animate-spin" />; break;
            case OwnerActionStatus.WAITING_CONFIRMATION: text = "Confirming..."; icon = <Loader2 className="mr-2 h-4 w-4 animate-spin" />; break;
            case OwnerActionStatus.SUCCESS: text = "Success!"; icon = <CheckCircle className="mr-2 h-4 w-4" />; variant = "ghost"; break; // Use ghost variant on success
            case OwnerActionStatus.ERROR: text = "Retry"; variant = "destructive"; break; // Use destructive variant on error
            // IDLE state handled by caller providing specific text (e.g., "Set Minter")
        }
        return { isLoading, text, icon, variant };
    };

  // --- Render Logic ---

  // 1. Handle Loading States (Order: Network Init > Contract Loading > Owner Check)
  if (!networkInitialized || contractLoading || layoutCheckingOwner) {
      return (
          <div className="space-y-6">
               <Skeleton className="h-8 w-1/3 mb-4" />
               <Skeleton className="h-24 w-full mb-6" /> {/* Placeholder for nav button */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-1/3" />
                            </CardContent>
                        </Card>
                   ))}
               </div>
           </div>
      );
  }

  // 2. Handle Disconnected Wallet
   if (!isWalletConnected) {
      return <div className="text-center p-6 border rounded bg-muted"><p className="text-lg font-semibold">Wallet Not Connected</p><p className="text-muted-foreground">Connect wallet for owner functions.</p></div>;
   }

  // 3. Deny Access if Not Owner
  if (!layoutIsOwner) {
     return <div className="text-center p-10 text-red-600 font-medium">Access Denied: You are not the contract owner on {currentNetwork?.name || 'this network'}.</div>;
  }

   // 4. Handle Contract Errors or Missing Address
  if (contractError) {
     return <div className="text-center p-10 text-red-600 font-medium">Contract Error: {contractError}. Check console/connection.</div>;
  }
   if (!contract) { // Contract instance is null from hook
       return <div className="text-center p-10 text-red-600 font-medium">Owner functions unavailable: Contract not found on {currentNetwork?.name || 'selected network'}.</div>;
   }

  // If all checks pass, render the owner functions UI
  const isAnyActionLoading = [minterStatus, uriStatus, transferStatus, renounceStatus].some(s => s === OwnerActionStatus.SUBMITTING || s === OwnerActionStatus.WAITING_CONFIRMATION);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Owner Functions ({currentNetwork.name})</h2>

      {/* Navigation Button to Create Metadata Page */}
      <div className="mb-4 p-4 border rounded-lg bg-secondary/30">
            <h3 className="font-semibold mb-1">NFT Creation Tool</h3>
            <p className="text-sm text-muted-foreground mb-2">
                Use this tool to prepare NFT metadata and upload assets to IPFS before minting.
            </p>
            <div className="flex space-x-4">
                <Button onClick={() => navigate('/create-metadata')}>
                Go to Metadata Creator <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => navigate('/create-metadata-large')} variant="outline">
                For Files Over 3MB <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>

      <hr className="my-4" />


      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Set Allowed Minter Card */}
        <Card className={minterStatus === OwnerActionStatus.SUCCESS ? 'border-green-500' : ''}>
             <CardHeader><CardTitle>Set Allowed Minter</CardTitle></CardHeader>
             <CardContent className="space-y-2">
                <Label htmlFor="newMinter">New Minter Address</Label>
                {/* Reset action status on input change */}
                <Input id="newMinter" placeholder="0x..." value={newMinter} onChange={(e) => { setNewMinter(e.target.value); resetActionState('minter'); }} disabled={isAnyActionLoading} />
                <Button onClick={triggerSetMinter} disabled={isAnyActionLoading || !newMinter || minterStatus === OwnerActionStatus.SUCCESS} variant={getButtonState(minterStatus).variant}>
                    {getButtonState(minterStatus).icon}
                    {minterStatus === OwnerActionStatus.IDLE ? "Set Minter" : getButtonState(minterStatus).text}
                </Button>
            </CardContent>
        </Card>

        {/* Set Base URI Card */}
        <Card className={uriStatus === OwnerActionStatus.SUCCESS ? 'border-green-500' : ''}>
              <CardHeader><CardTitle>Set Base URI</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                 <Label htmlFor="newBaseURI">New Base URI</Label>
                 <Input
                    id="newBaseURI"
                    placeholder="ipfs://... or https://... or leave empty to clear" // Update placeholder
                    value={newBaseURI}
                    onChange={(e) => { setNewBaseURI(e.target.value); resetActionState('uri'); }}
                    disabled={isAnyActionLoading}
                 />
                 <Button
                    onClick={triggerSetUri}
                    // CORRECTED: Removed '!newBaseURI' from disabled check
                    disabled={isAnyActionLoading || uriStatus === OwnerActionStatus.SUCCESS}
                    variant={getButtonState(uriStatus).variant}
                 >
                    {getButtonState(uriStatus).icon}
                    {/* Display appropriate text if input is empty */}
                    {uriStatus === OwnerActionStatus.IDLE
                        ? (newBaseURI.trim() === '' ? 'Clear Base URI' : 'Update Base URI')
                        : getButtonState(uriStatus).text}
                 </Button>
                 <p className="text-xs text-muted-foreground pt-1">Leave empty and submit to remove the base URI prefix.</p> {/* Added hint */}
             </CardContent>
        </Card>

        {/* Transfer Ownership Card */}
        <Card className={transferStatus === OwnerActionStatus.SUCCESS ? 'border-green-500' : ''}>
             <CardHeader><CardTitle>Transfer Ownership</CardTitle></CardHeader>
             <CardContent className="space-y-2">
                <Label htmlFor="newOwner">New Owner Address</Label>
                <Input id="newOwner" placeholder="0x..." value={newOwner} onChange={(e) => { setNewOwner(e.target.value); resetActionState('transfer'); }} disabled={isAnyActionLoading}/>
                <Button onClick={triggerTransfer} disabled={isAnyActionLoading || !newOwner || transferStatus === OwnerActionStatus.SUCCESS} variant={getButtonState(transferStatus).variant}>
                   {getButtonState(transferStatus).icon}
                   {transferStatus === OwnerActionStatus.IDLE ? "Transfer Ownership" : getButtonState(transferStatus).text}
                </Button>
                <p className="text-xs text-muted-foreground pt-1">Note: The new owner must accept the transfer.</p>
            </CardContent>
        </Card>

        {/* Renounce Ownership Card */}
        <Card className={renounceStatus === OwnerActionStatus.SUCCESS ? 'border-red-500' : ''}>
             <CardHeader><CardTitle>Renounce Ownership</CardTitle></CardHeader>
             <CardContent className="space-y-2">
                 <p className="text-sm text-destructive font-medium flex items-center"><ShieldAlert className="w-4 h-4 mr-1 inline-block"/> Warning: This action is irreversible.</p>
                 <AlertDialog>
                     <AlertDialogTrigger asChild>
                         {/* Reset status if user cancels/reopens dialog */}
                         <Button variant="destructive" disabled={isAnyActionLoading || renounceStatus === OwnerActionStatus.SUCCESS} onClick={() => { if(renounceStatus !== OwnerActionStatus.IDLE) resetActionState('renounce'); }}>
                            {getButtonState(renounceStatus).isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {renounceStatus === OwnerActionStatus.SUCCESS && <CheckCircle className="mr-2 h-4 w-4" />}
                            {renounceStatus === OwnerActionStatus.IDLE ? "Renounce Ownership" : getButtonState(renounceStatus).text}
                         </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                         <AlertDialogHeader> <AlertDialogTitle>Confirm Renounce Ownership</AlertDialogTitle> <AlertDialogDescription> Permanently relinquish ownership of this contract on the <span className="font-semibold">{currentNetwork.name}</span> network? This cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
                         <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={triggerRenounce} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> Yes, Renounce Ownership </AlertDialogAction> </AlertDialogFooter>
                     </AlertDialogContent>
                 </AlertDialog>
             </CardContent>
        </Card>
      </div>

      {/* Global Messages Area */}
      <div className="mt-4 min-h-[50px]">
            {error && (<ErrorMessage message={error} onClose={resetMessages} />)}
            {successInfo && (
                <SuccessMessage
                    message={successInfo.message}
                    txHash={successInfo.txHash}
                    explorerBaseUrl={currentNetwork?.explorerUrl}
                    onClose={resetMessages} // Use generic reset for now
                />
             )}
       </div>
    </div>
  );
};

export default Owner;