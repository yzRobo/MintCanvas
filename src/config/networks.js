// src/config/networks.js
// TODO: Config Wizard - This file will need significant refactoring to load runtime config

// Helper function to parse boolean environment variables
// TODO: Config Wizard - This parsing might move or be duplicated if loading from JSON
const parseBool = (val) => typeof val === 'string' && val.toLowerCase() === 'true';

// --- Define Network Keys ---
// TODO: Config Wizard - This list might become configurable or dynamically generated
export const networkKeys = [
    'ETHEREUM', 'SEPOLIA', 'POLYGON', 'POLYGON_AMOY', 'BASE', 'BASE_SEPOLIA',
];

// --- Define OpenSea Slugs ---
// TODO: Config Wizard - These could potentially be part of the advanced network config
const OPENSEA_SLUGS = {
    ETHEREUM: 'ethereum',
    SEPOLIA: 'sepolia',
    POLYGON: 'matic',
    POLYGON_AMOY: 'amoy', // Assuming 'amoy', verify if needed
    BASE: 'base',
    BASE_SEPOLIA: 'base-sepolia',
};

// --- Build Networks Configuration ---
// TODO: Config Wizard - This whole reduce function will likely be replaced by a function
// that reads from the loaded runtime configuration (e.g., from ConfigContext or projectConfig.json)
// and uses import.meta.env ONLY as a potential fallback during initial dev or for specific overrides.
export const networks = networkKeys.reduce((acc, key) => {
  // TODO: Config Wizard - These VITE_ vars will become fallbacks or be replaced
  // by loading from the runtime config (e.g., projectConfig.json or ConfigContext)
  const contractAddress = import.meta.env[`VITE_${key}_CONTRACT_ADDRESS`];
  const chainIdStr = import.meta.env[`VITE_${key}_CHAIN_ID`];
  const name = import.meta.env[`VITE_${key}_NAME`] || key;
  // RPC might remain env var if treated as semi-secret or be configurable
  const rpcUrl = import.meta.env[`VITE_${key}_RPC_URL`];
  const explorerUrl = import.meta.env[`VITE_${key}_EXPLORER_URL`];
  const symbol = import.meta.env[`VITE_${key}_SYMBOL`] || 'ETH';
  const ownerOnlyStr = import.meta.env[`VITE_${key}_OWNER_ONLY`];

  const isContractConfigured = contractAddress && contractAddress.toLowerCase() !== "unused";
  const chainId = parseInt(chainIdStr, 10);
  const isChainIdValid = !isNaN(chainId) && chainId > 0;

  if (isContractConfigured && isChainIdValid) {
    // --- Determine if it's a testnet for OpenSea URL ---
    // Simple heuristic: check if name includes 'Sepolia', 'Goerli', 'Amoy', or use chain ID ranges if preferred
    const isTestnet = name.toLowerCase().includes('sepolia') || name.toLowerCase().includes('amoy') || name.toLowerCase().includes('goerli');
    const openseaBaseUrl = isTestnet ? 'https://testnets.opensea.io' : 'https://opensea.io';
    const openseaSlug = OPENSEA_SLUGS[key]; // Get slug from our mapping

    acc[key] = {
        key: key,
        chainId: chainId,
        chainIdHex: `0x${chainId.toString(16)}`,
        name: name,
        rpcUrl: rpcUrl,
        explorerUrl: explorerUrl,
        contractAddress: contractAddress,
        symbol: symbol,
        ownerOnly: parseBool(ownerOnlyStr),
        // --- Add OpenSea specific fields ---
        openseaBaseUrl: openseaBaseUrl,
        openseaSlug: openseaSlug, // Add the slug here
    };
  } else {
    // Log skipped networks
     if (!isChainIdValid) console.warn(`Network '${name}' (Key: ${key}) skipped: Invalid Chain ID (${chainIdStr})`);
     else if (!isContractConfigured) console.log(`Network '${name}' (Key: ${key}) skipped: Contract Address not configured.`);
  }
  return acc;
}, {});

// --- Determine Default Network ---
// TODO: Config Wizard - Default network key will likely come from the runtime config
export const defaultNetworkKey = (import.meta.env.VITE_DEFAULT_NETWORK_KEY && networks[import.meta.env.VITE_DEFAULT_NETWORK_KEY])
                                  ? import.meta.env.VITE_DEFAULT_NETWORK_KEY
                                  : networkKeys.find(k => networks[k]);
export const defaultNetwork = networks[defaultNetworkKey];

// --- Logging & Error Check (remain the same) ---
console.log("Loaded Networks Config:", JSON.stringify(networks, null, 2));
console.log("Default Network Key:", defaultNetworkKey);
console.log("Default Network Config:", defaultNetwork ? JSON.stringify(defaultNetwork, null, 2) : 'Not Found');
if (!defaultNetwork) { console.error(/* ... Fatal error message ... */); }