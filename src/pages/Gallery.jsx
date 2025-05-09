// src/pages/Gallery.jsx

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork } from '@/contexts/NetworkContext';

// --- Configuration ---
const MAX_CONSECUTIVE_FAILURES = 5;
const INITIAL_SKELETON_COUNT = 4;

// Contract ABI - Ensure it includes necessary functions
const CONTRACT_ABI = [
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function ownerOf(uint256 tokenId) public view returns (address)"
];

// --- IPFS Gateway Configuration & Helper ---
const PREFERRED_IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

const generateIpfsHttpUrls = (uri) => {
  if (typeof uri !== 'string' || !uri.trim()) return [];
  let correctedUri = uri;
  if (uri.startsWith('ipfs://ipfs://')) { correctedUri = `ipfs://${uri.substring('ipfs://ipfs://'.length)}`; }
  if (correctedUri.startsWith('http://') || correctedUri.startsWith('https://')) return [correctedUri];

  let cid = null; let pathSuffix = '';
  if (correctedUri.startsWith('ipfs://')) {
    pathSuffix = correctedUri.slice(7);
    cid = pathSuffix.split('/')[0];
  } else if (correctedUri.length > 40 && correctedUri.length < 70 && !correctedUri.includes('/') && !correctedUri.includes('.')) {
    cid = correctedUri; pathSuffix = cid;
  }

  if (!cid || (cid.length < 46 && !cid.startsWith('Qm') && !cid.startsWith('bafy') && !cid.startsWith('baga'))) {
      console.warn(`Could not extract valid CID from URI (after correction attempt): ${correctedUri}`);
      return [];
  }
  if (cid) return PREFERRED_IPFS_GATEWAYS.map(gw => `${gw}${pathSuffix}`);
  console.warn(`Unrecognized/unhandled URI format (after correction attempt): ${correctedUri}`);
  return [];
};


// --- Image Modal Component ---
const ImageModal = ({ isOpen, onClose, imageUrl, name }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[90vw] max-w-[90vw] w-auto sm:max-h-[90vh] max-h-[80vh] overflow-hidden p-0 bg-transparent border-none shadow-none outline-none ring-0 focus:ring-0 focus:outline-none">
            <button onClick={onClose} className="fixed top-2 right-2 z-50 text-white bg-black bg-opacity-50 rounded-full p-1.5 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50" aria-label="Close image viewer"> <X size={24} /> </button>
            <div className="flex justify-center items-center h-full w-full p-4">
                {imageUrl ? (<img src={imageUrl} alt={name || 'NFT Image'} className="max-w-full max-h-[75vh] sm:max-h-[85vh] object-contain block"/>)
                : (<div className="text-white p-4 bg-black bg-opacity-30 rounded">Image not available</div>)}
            </div>
        </DialogContent>
    </Dialog>
);

// --- NFT Card Component ---
const NFTCard = ({ token, onImageClick, currentNetwork }) => {
  let openSeaLink = '#';
  if (currentNetwork?.openseaBaseUrl && currentNetwork?.openseaSlug && currentNetwork?.contractAddress) {
      openSeaLink = `${currentNetwork.openseaBaseUrl}/assets/${currentNetwork.openseaSlug}/${currentNetwork.contractAddress}/${token.id}`;
  }
  const [imageError, setImageError] = useState(false);
  const handleImageError = () => { console.warn(`Image failed to load for token ${token.id} on network ${currentNetwork?.key}: ${token.image}`); setImageError(true); };
  const shortenAddress = (address) => { if (!address || address.length < 10) return address || 'N/A'; return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`; }
  useEffect(() => { setImageError(false); }, [token.image]);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg group">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg truncate" title={token.name || `Token #${token.id}`}>
            {token.metadataLoading ? <Skeleton className="h-6 w-3/4" /> : (token.name || `Token #${token.id}`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-2">
        <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden mb-3 rounded relative">
           {token.image && !imageError ? (
                <img src={token.image} alt={token.name || `Token #${token.id}`} className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-105" onClick={() => onImageClick(token)} loading="lazy" onError={handleImageError}/>
           ) : (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-xs px-2 text-center bg-muted/50">
                 {token.metadataLoading ? (<><Loader2 className="h-6 w-6 animate-spin mb-1 text-muted-foreground/70" /><span>Loading Metadata...</span></>)
                 : (<><AlertCircle className="h-6 w-6 mb-1 text-destructive/70" /><span>{imageError ? 'Image Load Error' : (token.metadataError ? 'Metadata Error' : 'No Image')}</span></>)}
             </div>
           )}
        </div>
        <div className="text-sm text-muted-foreground min-h-[60px] mb-2 flex-grow break-words">
            {token.metadataLoading ? (<> <Skeleton className="h-4 w-full mb-1" /> <Skeleton className="h-4 w-5/6" /> </>)
            : (token.metadataError ? (<span className="text-red-500/80 text-xs italic">Error: {token.metadataError}</span>)
            : (token.description || "No description available."))}
        </div>
        {/* Display specialMessage (Primary Attribute) here */}
        {token.specialMessage && !token.metadataLoading && !token.metadataError && (
          <p className="mt-1 mb-2 italic text-sm text-primary/90">"{token.specialMessage}"</p>
        )}
        <div className="mt-auto pt-2 border-t border-border/50">
           <div className="text-xs text-muted-foreground truncate mb-1" title={token.ownerFull || 'Owner address'}>Owner: {token.metadataLoading ? <Skeleton className="h-3 w-20 inline-block" /> : shortenAddress(token.ownerFull)}</div>
            <a href={openSeaLink} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center text-primary hover:underline text-sm font-medium ${openSeaLink === '#' ? 'opacity-50 cursor-not-allowed' : ''}`} title={`View Token #${token.id} on OpenSea ${openSeaLink === '#' ? '(Link not available)' : ''}`} onClick={(e) => { if (openSeaLink === '#') e.preventDefault(); }}> View on OpenSea <ExternalLink size={14} className="ml-1" /> </a>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Gallery Component ---
const Gallery = () => {
  const { currentNetwork, isInitialized: networkInitialized, displayPrefs } = useNetwork();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const runFetch = async (networkConfig) => {
        console.log(`Gallery Fetch: Starting for network ${networkConfig?.name || 'N/A'}...`);
        // Get the primaryAttributeName from the displayPrefs provided by useNetwork
        const primaryAttributeNameFromConfig = displayPrefs?.primaryAttribute?.trim();
        console.log(`Gallery Fetch: Using Primary Attribute from config: '${primaryAttributeNameFromConfig || "None Set"}'`);

        if (isMounted) { setLoading(true); setError(null); setTokens([]); }
        else { return; }

        if (!networkConfig?.contractAddress || !networkConfig.isContractConfigured || !networkConfig?.rpcUrl) {
            const errMessage = `Gallery not available: Missing essential configuration for ${networkConfig?.name || 'selected network'} (Contract Address, RPC, or not marked as configured).`;
            console.error("Gallery Fetch Error:", errMessage, networkConfig);
            if (isMounted) { setError(errMessage); setLoading(false); }
            return;
        }

        try {
            const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
            const contract = new ethers.Contract(networkConfig.contractAddress, CONTRACT_ABI, provider);
            console.log(`Gallery Fetch: Provider connected to ${networkConfig.rpcUrl}, Contract at ${networkConfig.contractAddress}`);

            const fetchedTokensData = [];
            let tokenId = 1; let consecutiveFailures = 0;

            while (consecutiveFailures < MAX_CONSECUTIVE_FAILURES && isMounted) {
                const currentTokenId = tokenId;
                try {
                    const ownerAddress = await contract.ownerOf(currentTokenId);
                    if (!isMounted || abortController.signal.aborted) break;

                    const rawTokenURI = await contract.tokenURI(currentTokenId);
                    if (!isMounted || abortController.signal.aborted) break;

                    const potentialMetadataUrls = generateIpfsHttpUrls(rawTokenURI);
                    const placeholderUri = potentialMetadataUrls.length > 0 ? potentialMetadataUrls[0] : rawTokenURI;
                    const placeholderToken = { id: currentTokenId, uri: placeholderUri, ownerFull: ownerAddress, name: `Token #${currentTokenId}`, description: 'Loading metadata...', image: null, specialMessage: null, metadataLoading: true, metadataError: null };

                    if (isMounted) { fetchedTokensData.push(placeholderToken); setTokens([...fetchedTokensData]); } else { break; }

                    let metadata = null; let metadataErrorMessage = 'No valid metadata URLs.';
                    if (potentialMetadataUrls.length > 0) {
                        metadataErrorMessage = 'All metadata gateways failed.';
                        for (const url of potentialMetadataUrls) {
                             if (!isMounted || abortController.signal.aborted) break;
                             try {
                                 const fetchOptions = { signal: abortController.signal };
                                 const response = await fetch(url, fetchOptions);
                                 if (!isMounted || abortController.signal.aborted) break;
                                 if (response.ok) { metadata = await response.json(); metadataErrorMessage = null; break; }
                                 else { metadataErrorMessage = `Failed (${url.split('/')[2]}): ${response.status}`; }
                             } catch (fetchError) {
                                 if (fetchError.name === 'AbortError') { metadataErrorMessage = "Fetch aborted"; break; }
                                 metadataErrorMessage = `Failed (${url.split('/')[2]}): Network/Timeout?`;
                             }
                        }
                    } else { metadataErrorMessage = `Invalid/unhandled metadata URI: ${rawTokenURI}`; }
                    if (!isMounted || abortController.signal.aborted) break;

                    const index = fetchedTokensData.findIndex(t => t.id === currentTokenId);
                    if (index !== -1) {
                        let imageUrl = null; let specialMessage = null;
                        if (metadata && !metadataErrorMessage) { // Ensure metadata was successfully loaded
                            const potentialImageUrls = generateIpfsHttpUrls(metadata?.image);
                            imageUrl = potentialImageUrls.length > 0 ? potentialImageUrls[0] : null;

                            // Use configured primaryAttributeNameFromConfig to find the special message
                            if (primaryAttributeNameFromConfig && metadata?.attributes && Array.isArray(metadata.attributes)) {
                                const foundAttribute = metadata.attributes.find(
                                    attr => attr.trait_type === primaryAttributeNameFromConfig
                                );
                                specialMessage = foundAttribute?.value || null;
                                if (specialMessage) {
                                    console.log(`Gallery Fetch: Token ${currentTokenId} - Found primary attribute '${primaryAttributeNameFromConfig}': '${specialMessage}'`);
                                }
                            }
                        } else { if (!metadataErrorMessage) metadataErrorMessage = 'Metadata object is null or invalid.'; }

                        fetchedTokensData[index] = {
                             ...fetchedTokensData[index],
                             name: metadata?.name || `Token #${currentTokenId}`,
                             description: metadataErrorMessage ? null : (metadata?.description || "No description."),
                             image: imageUrl,
                             specialMessage: metadataErrorMessage ? null : specialMessage, // Use the resolved specialMessage
                             metadataLoading: false,
                             metadataError: metadataErrorMessage
                        };
                        if (isMounted) setTokens([...fetchedTokensData]); else break;
                    }
                    tokenId++; consecutiveFailures = 0;
                } catch (error) {
                     if (!isMounted || abortController.signal.aborted) break;
                     const isNonExistentTokenError = error.code === 'CALL_EXCEPTION' || (error.message && (error.message.includes("nonexistent token") || error.message.includes("URI query for nonexistent token")));
                     if (isNonExistentTokenError) { consecutiveFailures++; }
                     else { console.error(`Gallery Fetch: Contract error checking token ${currentTokenId}:`, error.code, error.reason || error.message); consecutiveFailures++; }
                     tokenId++;
                }
            }
            if (isMounted) setLoading(false);
        } catch (majorError) {
            console.error("Gallery Fetch: Major setup error:", majorError);
            if(isMounted){ setError(`Failed gallery init: ${majorError.message}`); setLoading(false); setTokens([]); }
        }
      };

      if (networkInitialized && currentNetwork && currentNetwork.isContractConfigured) { // Check isContractConfigured
          runFetch(currentNetwork);
      } else if (networkInitialized && (!currentNetwork || !currentNetwork.isContractConfigured)) {
          const reason = !currentNetwork ? "No network selected or available" : "Contract not configured for selected network";
          setError(`Gallery not available: ${reason} (${currentNetwork?.name || 'N/A'}).`);
          setLoading(false); setTokens([]);
      } else {
          setLoading(true); // Waiting for network context to initialize
      }

    return () => { isMounted = false; abortController.abort(); console.log("Gallery: Cleanup effect running."); };
  }, [networkInitialized, currentNetwork, displayPrefs]); // Add displayPrefs to dependency array


  // --- Modal Handlers ---
  const handleImageClick = (token) => { if (token.image && !token.metadataError && !token.metadataLoading) { setSelectedImage(token); } };
  const handleCloseModal = () => { setSelectedImage(null); };

  // --- Render Logic ---
   if (!networkInitialized && loading) { // Show generic loading if network context itself isn't ready
        return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-2 text-muted-foreground">Initializing Gallery...</p></div>;
   }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">NFT Gallery ({currentNetwork?.name || (networkInitialized ? "No Network Selected" : "Initializing...")})</h2>

      {/* Loading Skeletons */}
      {loading && tokens.length === 0 && ( <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"> {[...Array(INITIAL_SKELETON_COUNT)].map((_, i) => ( <Card key={`skel-${i}`} className="flex flex-col"> <CardHeader className="pb-2"><Skeleton className="h-6 w-3/4" /></CardHeader> <CardContent className="flex-grow flex flex-col pt-2"> <Skeleton className="w-full aspect-square mb-3 rounded" /> <div className="flex-grow mb-2"> <Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-4 w-5/6" /></div> <div className="mt-auto pt-2 border-t border-border/50"><Skeleton className="h-3 w-20 mb-1" /><Skeleton className="h-5 w-1/2" /></div> </CardContent> </Card> ))} </div> )}
      {/* Error Display */}
      {!loading && error && ( <div className="text-center py-10 px-4 bg-destructive/10 border border-destructive/30 rounded-lg"> <p className="font-semibold text-destructive">Error Loading Gallery</p> <p className="text-destructive/90 mt-1 text-sm">{error}</p> <p className="mt-2 text-sm text-muted-foreground">Refresh or try switching networks.</p> </div> )}
      {/* No Tokens Found (and not loading and no error) */}
      {!loading && !error && tokens.length === 0 && networkInitialized && currentNetwork && currentNetwork.isContractConfigured && ( <p className="text-center py-10 text-muted-foreground">No NFTs found for this collection on {currentNetwork.name}.</p> )}
      {/* No contract configured message (if network is selected but no contract) */}
      {!loading && !error && tokens.length === 0 && networkInitialized && currentNetwork && !currentNetwork.isContractConfigured && ( <p className="text-center py-10 text-muted-foreground">Contract not configured for {currentNetwork.name}. Gallery cannot be displayed.</p> )}
      {/* No network selected at all after init */}
      {!loading && !error && tokens.length === 0 && networkInitialized && !currentNetwork && ( <p className="text-center py-10 text-muted-foreground">Please select a configured network to view the gallery.</p> )}

      {/* Tokens Grid */}
      {tokens.length > 0 && ( <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"> {tokens.map((token) => ( <NFTCard key={`${currentNetwork?.key || 'no-network'}-${token.id}`} token={token} onImageClick={handleImageClick} currentNetwork={currentNetwork} /> ))} {loading && tokens.length > 0 && ( <Card className="flex flex-col items-center justify-center aspect-square border-dashed bg-muted/50"> <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> <p className="text-xs text-muted-foreground mt-2">Loading more...</p> </Card> )} </div> )}
      {/* Image Modal */}
      {selectedImage && ( <ImageModal isOpen={!!selectedImage} onClose={handleCloseModal} imageUrl={selectedImage?.image} name={selectedImage?.name || `Token #${selectedImage?.id}`} /> )}
    </div>
  );
};

export default Gallery;