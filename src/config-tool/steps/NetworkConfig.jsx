// src/config-tool/steps/NetworkConfig.jsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, XCircle, InfoIcon, Terminal } from "lucide-react";
import { ethers } from 'ethers';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const PREDEFINED_NETWORK_KEYS = [
  'ETHEREUM', 'SEPOLIA', 'POLYGON', 'POLYGON_AMOY', 'BASE', 'BASE_SEPOLIA'
];

const isValidAddress = (address) => {
  if (!address || address.toLowerCase() === 'unused' || address.trim() === '') return true;
  return ethers.utils.isAddress(address);
};
const isValidHttpUrl = (url) => {
  if (!url || url.trim() === '') return true;
  try { const newUrl = new URL(url); return newUrl.protocol === 'http:' || newUrl.protocol === 'https:'; }
  catch (_) { return false; }
};
const isValidChainId = (chainId) => {
    if (chainId === null || chainId === undefined || String(chainId).trim() === '') return true;
    const num = Number(String(chainId).trim());
    return !isNaN(num) && Number.isInteger(num) && num > 0;
};

const NetworkConfig = ({ data, updateData }) => {
  const networksConfig = data?.networks || {};

  const allNetworkKeysToDisplay = React.useMemo(() => { /* ... same as before ... */
    const customKeys = Object.keys(networksConfig).filter(key => key.startsWith('custom_'));
    const displayKeysSet = new Set([...PREDEFINED_NETWORK_KEYS, ...customKeys]);
    return Array.from(displayKeysSet).sort((a, b) => {
        const aIsCustom = a.startsWith('custom_');
        const bIsCustom = b.startsWith('custom_');
        if (aIsCustom && !bIsCustom) return 1;
        if (!aIsCustom && bIsCustom) return -1;
        if (aIsCustom && bIsCustom) return a.localeCompare(b);
        return PREDEFINED_NETWORK_KEYS.indexOf(a) - PREDEFINED_NETWORK_KEYS.indexOf(b);
    });
  }, [networksConfig]);

  const handleInputChange = (networkKey, field, value) => {
    // FIX: Only trim if value is a string
    const actualValue = typeof value === 'string' ? (value.trim() === '' ? '' : value) : value;

    const newNetworksConfig = {
      ...networksConfig,
      [networkKey]: {
        ...(networksConfig[networkKey] || {}),
        [field]: actualValue, // Store the processed value
        isCustom: networkKey.startsWith('custom_'),
      },
    };
    updateData({ networks: newNetworksConfig });
  };

  const handleCheckboxChange = (networkKey, field, checked) => {
     // Booleans don't need trim, directly pass to handleInputChange
     handleInputChange(networkKey, field, !!checked);
  };

  const getDefaultNetworkInfo = (networkKey) => { /* ... same as before ... */
      const map = {
          ETHEREUM: { name: "Ethereum Mainnet", chainId: "1", symbol: "ETH", explorerUrl: "https://etherscan.io", rpcUrl: "https://mainnet.infura.io/v3/YOUR_KEY_OR_PUBLIC", ownerOnly: false },
          SEPOLIA: { name: "Sepolia Testnet", chainId: "11155111", symbol: "SepoliaETH", explorerUrl: "https://sepolia.etherscan.io", rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY_OR_PUBLIC", ownerOnly: true },
          POLYGON: { name: "Polygon Mainnet", chainId: "137", symbol: "MATIC", explorerUrl: "https://polygonscan.com", rpcUrl: "https://polygon-rpc.com", ownerOnly: false },
          POLYGON_AMOY: { name: "Polygon Amoy Testnet", chainId: "80002", symbol: "MATIC", explorerUrl: "https://www.oklink.com/amoy", rpcUrl: "https://rpc-amoy.polygon.technology/", ownerOnly: true },
          BASE: { name: "Base Mainnet", chainId: "8453", symbol: "ETH", explorerUrl: "https://basescan.org", rpcUrl: "https://mainnet.base.org", ownerOnly: false },
          BASE_SEPOLIA: { name: "Base Sepolia Testnet", chainId: "84532", symbol: "ETH", explorerUrl: "https://sepolia.basescan.org", rpcUrl: "https://sepolia.base.org", ownerOnly: true }
      };
      const upperKey = networkKey.toUpperCase();
      return map[upperKey] || { name: networkKey.replace(/_/g, ' '), chainId: "", symbol: "", explorerUrl: "", rpcUrl: "", ownerOnly: false };
  };

  const handleAddCustomNetwork = () => { /* ... same as before ... */ };
  const handleRemoveCustomNetwork = (networkKeyToRemove) => { /* ... same as before ... */ };

  return (
    <div className="space-y-6">
      <Alert variant="default">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Network Configuration Guide</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
          <p>For common networks (like Ethereum, Sepolia shown below), essential details like Chain ID, Symbol, and public RPC/Explorer URLs are pre-filled as defaults. You only need to enter a value if you want to **override** these defaults.</p>
          <p>The **Contract Address** is unique to your NFT collection and usually needs to be entered for each network you use.</p>
          <p>If you add a **"Custom Network,"** you must provide all its core details (marked with <span className="text-destructive font-semibold">*</span>).</p>
          <p><strong>Advanced Users:</strong> Settings in your project's <code>.env</code> file (e.g., <code>VITE_ETHEREUM_RPC_URL</code>) will always take precedence over values set here, especially for private API keys in RPC URLs.</p>
        </AlertDescription>
      </Alert>

      <div className="space-y-5">
        {allNetworkKeysToDisplay.map((networkKey) => {
          const defaultInfo = getDefaultNetworkInfo(networkKey);
          const currentNetworkData = networksConfig[networkKey] || {};
          const isCustom = currentNetworkData.isCustom || networkKey.startsWith('custom_');

          // --- For displaying, if wizard has a value, use it. Otherwise, show the hardcoded default for predefined. ---
          // --- For saving, if user clears input, it's saved as "" (empty string) ---
          const getNameForDisplay = () => isCustom ? (currentNetworkData.name || '') : (currentNetworkData.name || defaultInfo.name);
          const getChainIdForDisplay = () => String(currentNetworkData.chainId !== undefined && currentNetworkData.chainId !== '' ? currentNetworkData.chainId : (isCustom ? '' : defaultInfo.chainId));
          const getRpcUrlForDisplay = () => currentNetworkData.rpcUrl || (isCustom ? '' : defaultInfo.rpcUrl);
          const getSymbolForDisplay = () => currentNetworkData.symbol || (isCustom ? '' : defaultInfo.symbol);
          const getExplorerUrlForDisplay = () => currentNetworkData.explorerUrl || (isCustom ? '' : defaultInfo.explorerUrl);
          const contractAddr = currentNetworkData.contractAddress || ''; // Contract address is usually user-input
          const ownerOnlyValue = currentNetworkData.ownerOnly !== undefined ? !!currentNetworkData.ownerOnly : (isCustom ? false : defaultInfo.ownerOnly);


          const isContractInvalid = contractAddr && contractAddr.toLowerCase() !== 'unused' && !isValidAddress(contractAddr);
          // For predefined, RPC being empty in wizard is fine (will use default/env). For custom, it's an issue if empty.
          const isRpcInvalid = isCustom ? (getRpcUrlForDisplay().trim() === '' || !isValidHttpUrl(getRpcUrlForDisplay())) : (getRpcUrlForDisplay() && !isValidHttpUrl(getRpcUrlForDisplay()));
          const isExplorerInvalid = getExplorerUrlForDisplay() && !isValidHttpUrl(getExplorerUrlForDisplay());
          const isChainIdInvalidForInput = isCustom ? (getChainIdForDisplay().trim() === '' || !isValidChainId(getChainIdForDisplay())) : (!isValidChainId(getChainIdForDisplay()) && getChainIdForDisplay().trim() !== '');
          const isNameInvalidForInput = isCustom && getNameForDisplay().trim() === '';
          const isSymbolInvalidForInput = isCustom && getSymbolForDisplay().trim() === '';


          return (
            <Card key={networkKey} className={`p-4 pt-3 relative ${isContractInvalid || (isCustom && (isRpcInvalid || isChainIdInvalidForInput || isNameInvalidForInput || isSymbolInvalidForInput )) ? 'border-destructive shadow-md shadow-destructive/20' : 'border-border'}`}>
              {isCustom && ( <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive z-10" onClick={() => handleRemoveCustomNetwork(networkKey)} title="Remove Custom Network"> <XCircle className="h-4 w-4" /> </Button> )}
              <div className="font-semibold text-lg mb-3 mr-8">
                {isCustom ? (<Input value={getNameForDisplay()} placeholder="Custom Network Name *" onChange={(e) => handleInputChange(networkKey, 'name', e.target.value)} className={cn("text-lg font-semibold h-auto p-0 border-0 focus-visible:ring-0 shadow-none", isNameInvalidForInput && "border-destructive ring-destructive")} />)
                : (getNameForDisplay())} {/* Display default/wizard name for predefined */}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-3">
                  <div> <Label htmlFor={`contractAddress-${networkKey}`}>Contract Address {isCustom ? <span className="text-destructive">*</span> : ''}</Label> <Input id={`contractAddress-${networkKey}`} placeholder={"0x... or UNUSED"} value={contractAddr} onChange={(e) => handleInputChange(networkKey, 'contractAddress', e.target.value)} className={isContractInvalid ? 'border-destructive' : ''} /> {isContractInvalid && <p className="text-xs text-destructive mt-1">Invalid address.</p>} <p className="text-xs text-muted-foreground mt-0.5">Your NFT collection's unique blockchain address.</p> </div>
                  {!isCustom && ( <div> <Label htmlFor={`networkName-${networkKey}`}>Display Name <span className="text-muted-foreground text-xs">(Optional Override)</span></Label> <Input id={`networkName-${networkKey}`} placeholder={`Default: ${defaultInfo.name}`} value={currentNetworkData.name || ''} onChange={(e) => handleInputChange(networkKey, 'name', e.target.value)} /> <p className="text-xs text-muted-foreground mt-0.5">Changes how this network is named in the UI.</p> </div> )}
                  <div> <Label htmlFor={`chainId-${networkKey}`}>Chain ID {isCustom ? <span className="text-destructive">*</span> : ''}</Label> <Input id={`chainId-${networkKey}`} type="text" placeholder={isCustom ? "e.g., 1337" : `Default: ${defaultInfo.chainId}`} value={getChainIdForDisplay()} onChange={(e) => handleInputChange(networkKey, 'chainId', e.target.value)} className={isChainIdInvalidForInput ? 'border-destructive' : ''} /> {isChainIdInvalidForInput && <p className="text-xs text-destructive mt-1">Must be a positive number.</p>} <p className="text-xs text-muted-foreground mt-0.5">The network's unique numerical identifier.</p> </div>
                </div>
                <div className="space-y-3">
                  <div> <Label htmlFor={`rpcUrl-${networkKey}`}>RPC URL {isCustom ? <span className="text-destructive">*</span> : ''}</Label> <Input id={`rpcUrl-${networkKey}`} placeholder={isCustom ? "https://your-node-rpc.com" : `e.g., ${defaultInfo.rpcUrl}`} value={getRpcUrlForDisplay()} onChange={(e) => handleInputChange(networkKey, 'rpcUrl', e.target.value)} className={isRpcInvalid ? 'border-destructive' : ''} /> {(isRpcInvalid && getRpcUrlForDisplay()) && <p className="text-xs text-destructive mt-1">Must be a valid https URL.</p>} {isCustom && getRpcUrlForDisplay().trim() === '' && <p className="text-xs text-destructive mt-1">Required for custom networks.</p>} <p className="text-xs text-muted-foreground mt-0.5">Link to connect to the blockchain node.</p> </div>
                  <div> <Label htmlFor={`symbol-${networkKey}`}>Currency Symbol {isCustom ? <span className="text-destructive">*</span> : ''}</Label> <Input id={`symbol-${networkKey}`} placeholder={isCustom ? "e.g., MYC" : `Default: ${defaultInfo.symbol}`} value={getSymbolForDisplay()} onChange={(e) => handleInputChange(networkKey, 'symbol', e.target.value)} className={isSymbolInvalidForInput && "border-destructive"}/> {isSymbolInvalidForInput && <p className="text-xs text-destructive mt-1">Required for custom networks.</p>} <p className="text-xs text-muted-foreground mt-0.5">e.g., ETH, MATIC.</p> </div>
                  <div> <Label htmlFor={`explorerUrl-${networkKey}`}>Explorer URL <span className="text-muted-foreground text-xs">(Optional)</span></Label> <Input id={`explorerUrl-${networkKey}`} placeholder={isCustom ? "https://your-explorer.com" : `Default: ${defaultInfo.explorerUrl}`} value={getExplorerUrlForDisplay()} onChange={(e) => handleInputChange(networkKey, 'explorerUrl', e.target.value)} className={isExplorerInvalid ? 'border-destructive' : ''} /> {isExplorerInvalid && <p className="text-xs text-destructive mt-1">Invalid URL.</p>} <p className="text-xs text-muted-foreground mt-0.5">Link to a blockchain transaction viewer.</p> </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-3 pt-3 border-t"> <Checkbox id={`ownerOnly-${networkKey}`} checked={ownerOnlyValue} onCheckedChange={(checked) => handleCheckboxChange(networkKey, 'ownerOnly', checked)} /> <Label htmlFor={`ownerOnly-${networkKey}`} className="text-sm font-normal">Restrict UI access for this network to contract owner</Label> </div>
              {(isContractInvalid || (isCustom && (isRpcInvalid || isChainIdInvalidForInput || isNameInvalidForInput || isSymbolInvalidForInput ))) && ( <p className="text-sm text-destructive mt-2 font-medium">Please correct required fields for this network.</p> )}
            </Card>
          );
        })}
      </div>
      <Button type="button" variant="outline" onClick={handleAddCustomNetwork} className="mt-6">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Another (Custom) Network
      </Button>
      {/* Removed the last alert as the top one covers .env, and field specific notes guide the rest */}
    </div>
  );
};

export default NetworkConfig;