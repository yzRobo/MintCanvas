// src/config/networks.js

// Predefined keys remain useful for iterating
export const networkKeys = [
    'ETHEREUM', 'SEPOLIA', 'POLYGON', 'POLYGON_AMOY', 'BASE', 'BASE_SEPOLIA',
];

// TODO: Config Wizard - These slugs could potentially be part of advanced network config
const OPENSEA_SLUGS = {
    ETHEREUM: 'ethereum',
    SEPOLIA: 'sepolia',
    POLYGON: 'matic',
    POLYGON_AMOY: 'amoy', // Assuming 'amoy', verify if needed
    BASE: 'base',
    BASE_SEPOLIA: 'base-sepolia',
};

// Helper to parse boolean env vars or default
const parseBool = (val) => typeof val === 'string' && val.toLowerCase() === 'true';

/**
 * Generates the networks configuration object based on runtime config data
 * and falls back to environment variables if needed. Ensures essential fields
 * like chainId and rpcUrl are present for a network to be included.
 *
 * @param {object | null} configData - The loaded configuration object from ConfigContext.
 * @returns {{
 *   networks: Record<string, object>;
 *   defaultNetworkKey: string | null;
 *   defaultNetwork: object | null;
 *   displayPrefs: object;
 *   projectName: string;
 * }}
 */
export function loadNetworksConfig(configData) {
    console.log("loadNetworksConfig: Generating config. Received configData:", !!configData);
    const wizardNetworks = configData?.networks || {};
    const wizardDisplayPrefs = configData?.displayPrefs || {};
    const wizardProjectName = configData?.projectName;
    const wizardDefaultKey = configData?.defaultNetworkKey;

    const loadedNetworks = {};

    for (const key of networkKeys) {
        const wizardConfig = wizardNetworks[key] || {};
        const envConfig = {
            contractAddress: import.meta.env[`VITE_${key}_CONTRACT_ADDRESS`],
            chainIdStr: import.meta.env[`VITE_${key}_CHAIN_ID`],
            name: import.meta.env[`VITE_${key}_NAME`],
            rpcUrl: import.meta.env[`VITE_${key}_RPC_URL`],
            explorerUrl: import.meta.env[`VITE_${key}_EXPLORER_URL`],
            symbol: import.meta.env[`VITE_${key}_SYMBOL`],
            ownerOnlyStr: import.meta.env[`VITE_${key}_OWNER_ONLY`],
        };

        // --- Determine final values, prioritizing wizard config for contract address ---
        const contractAddress = (wizardConfig.contractAddress && wizardConfig.contractAddress.toLowerCase() !== 'unused')
            ? wizardConfig.contractAddress
            : envConfig.contractAddress;

        // TODO: Allow wizard to override these in later steps/advanced config
        const chainIdStr = envConfig.chainIdStr;
        const name = envConfig.name || key.replace('_', ' '); // Default name formatting
        const rpcUrl = envConfig.rpcUrl;
        const explorerUrl = envConfig.explorerUrl;
        const symbol = envConfig.symbol || 'ETH';
        const ownerOnlyStr = envConfig.ownerOnlyStr;

        // --- Stricter Validation ---
        const chainId = parseInt(chainIdStr, 10);
        const isChainIdValid = !isNaN(chainId) && chainId > 0;
        const isRpcValid = rpcUrl && rpcUrl.startsWith('https://');
        // Network *must* have valid chainId and RPC to be functional for switching/adding
        const hasRequiredBaseInfo = isChainIdValid && isRpcValid;

        // Contract is considered configured if address exists and isn't 'UNUSED'
        const isContractConfigured = contractAddress && contractAddress.toLowerCase() !== "unused";

        if (hasRequiredBaseInfo) {
            const isTestnet = name.toLowerCase().includes('sepolia') || name.toLowerCase().includes('amoy') || name.toLowerCase().includes('goerli');
            const openseaBaseUrl = isTestnet ? 'https://testnets.opensea.io' : 'https://opensea.io';
            const openseaSlug = OPENSEA_SLUGS[key]; // TODO: Allow wizard override (advanced)

            loadedNetworks[key] = {
                key: key,
                chainId: chainId,
                chainIdHex: `0x${chainId.toString(16)}`,
                name: name,
                rpcUrl: rpcUrl,
                explorerUrl: explorerUrl || null, // Ensure explorerUrl can be null/optional
                contractAddress: contractAddress || null, // Ensure contractAddress can be null
                isContractConfigured: isContractConfigured, // Flag for easier checks later
                symbol: symbol,
                ownerOnly: parseBool(ownerOnlyStr),
                openseaBaseUrl: openseaBaseUrl,
                openseaSlug: openseaSlug,
            };
        } else {
             console.warn(`Network '${name}' (Key: ${key}) skipped: Missing valid Chain ID or HTTPS RPC URL.`);
        }
    }

    // --- Determine Default Network ---
    const envDefaultKey = import.meta.env.VITE_DEFAULT_NETWORK_KEY;
    let determinedDefaultKey = null;

    // Priority: Wizard -> Environment Variable -> First Loaded Network
    if (wizardDefaultKey && loadedNetworks[wizardDefaultKey]) {
        determinedDefaultKey = wizardDefaultKey;
    } else if (envDefaultKey && loadedNetworks[envDefaultKey]) {
        determinedDefaultKey = envDefaultKey;
    } else {
        // Fallback to the first network key in the *loadedNetworks* object
        determinedDefaultKey = Object.keys(loadedNetworks)[0] || null;
    }

    const defaultNetwork = determinedDefaultKey ? loadedNetworks[determinedDefaultKey] : null;

    console.log("loadNetworksConfig: Final Networks Object:", loadedNetworks);
    console.log("loadNetworksConfig: Final Default Network Key:", determinedDefaultKey);

    return {
        networks: loadedNetworks,
        defaultNetworkKey: determinedDefaultKey,
        defaultNetwork: defaultNetwork,
        displayPrefs: wizardDisplayPrefs, // Pass through display prefs
        projectName: wizardProjectName || "NFT Project" // Pass through project name
    };
}