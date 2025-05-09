// src/config/networks.js

// These are fallback default values if nothing is provided in .env or projectConfig.json
// They are also used by the wizard to know which predefined networks to offer.
const PREDEFINED_NETWORK_DEFAULTS = {
    ETHEREUM: { name: "Ethereum Mainnet", chainId: "1", symbol: "ETH", explorerUrl: "https://etherscan.io", rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_ID", ownerOnly: false },
    SEPOLIA: { name: "Sepolia Testnet", chainId: "11155111", symbol: "SepoliaETH", explorerUrl: "https://sepolia.etherscan.io", rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_ID", ownerOnly: true },
    POLYGON: { name: "Polygon Mainnet", chainId: "137", symbol: "MATIC", explorerUrl: "https://polygonscan.com", rpcUrl: "https://polygon-rpc.com", ownerOnly: false },
    POLYGON_AMOY: { name: "Polygon Amoy Testnet", chainId: "80002", symbol: "MATIC", explorerUrl: "https://www.oklink.com/amoy", rpcUrl: "https://rpc-amoy.polygon.technology/", ownerOnly: true },
    BASE: { name: "Base Mainnet", chainId: "8453", symbol: "ETH", explorerUrl: "https://basescan.org", rpcUrl: "https://mainnet.base.org", ownerOnly: false },
    BASE_SEPOLIA: { name: "Base Sepolia Testnet", chainId: "84532", symbol: "ETH", explorerUrl: "https://sepolia.basescan.org", rpcUrl: "https://sepolia.base.org", ownerOnly: true }
};


const OPENSEA_SLUGS = { // Only for predefined keys that have OpenSea presence
    ETHEREUM: 'ethereum', SEPOLIA: 'sepolia', POLYGON: 'matic',
    POLYGON_AMOY: 'amoy', BASE: 'base', BASE_SEPOLIA: 'base-sepolia',
};

const parseBool = (val, defaultValue = false) => {
    if (val === undefined || val === null) return defaultValue;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return defaultValue;
};

export function loadNetworksConfig(configData) {
    console.log("loadNetworksConfig: Generating. Received configData:", configData);
    const wizardNetworks = configData?.networks || {};
    const wizardDisplayPrefs = configData?.displayPrefs || {};
    const wizardProjectName = configData?.projectName;
    const wizardDefaultKey = configData?.defaultNetworkKey;

    const loadedNetworks = {};

    // Iterate over ALL keys found in the wizard's network configuration (includes predefined and custom)
    const allConfiguredKeys = Object.keys(wizardNetworks);

    for (const key of allConfiguredKeys) {
        const wizardNetworkSettings = wizardNetworks[key] || {};
        const upperKeyForEnv = key.toUpperCase(); // For VITE_ETHEREUM_...
        const predefinedDefaults = PREDEFINED_NETWORK_DEFAULTS[upperKeyForEnv] || {};

        const envConfig = {
            contractAddress: import.meta.env[`VITE_${upperKeyForEnv}_CONTRACT_ADDRESS`],
            chainId: import.meta.env[`VITE_${upperKeyForEnv}_CHAIN_ID`],
            name: import.meta.env[`VITE_${upperKeyForEnv}_NAME`],
            rpcUrl: import.meta.env[`VITE_${upperKeyForEnv}_RPC_URL`],
            explorerUrl: import.meta.env[`VITE_${upperKeyForEnv}_EXPLORER_URL`],
            symbol: import.meta.env[`VITE_${upperKeyForEnv}_SYMBOL`],
            ownerOnly: import.meta.env[`VITE_${upperKeyForEnv}_OWNER_ONLY`],
        };

        // Layering:
        // 1. Contract Address: Wizard's value from projectConfig.json is primary. Fallback to .env only if wizard's is empty/UNUSED.
        const contractAddress = (wizardNetworkSettings.contractAddress && wizardNetworkSettings.contractAddress.toLowerCase() !== 'unused' && wizardNetworkSettings.contractAddress.trim() !== '')
            ? wizardNetworkSettings.contractAddress.trim()
            : envConfig.contractAddress;

        // 2. For other fields: .env > wizard > predefined default > calculated default
        const name = envConfig.name || wizardNetworkSettings.name || predefinedDefaults.name || key.replace(/_/g, ' ');
        const chainIdStr = String(envConfig.chainId || wizardNetworkSettings.chainId || predefinedDefaults.chainId || '').trim();
        const rpcUrl = envConfig.rpcUrl || wizardNetworkSettings.rpcUrl || predefinedDefaults.rpcUrl;
        const symbol = envConfig.symbol || wizardNetworkSettings.symbol || predefinedDefaults.symbol || (upperKeyForEnv === 'ETHEREUM' || upperKeyForEnv.includes('BASE') ? 'ETH' : upperKeyForEnv.includes('POLYGON') ? 'MATIC' : 'UNIT');
        const explorerUrl = envConfig.explorerUrl || wizardNetworkSettings.explorerUrl || predefinedDefaults.explorerUrl;
        const ownerOnlyRaw = envConfig.ownerOnly !== undefined ? envConfig.ownerOnly : (wizardNetworkSettings.ownerOnly !== undefined ? wizardNetworkSettings.ownerOnly : predefinedDefaults.ownerOnly);
        const ownerOnly = parseBool(ownerOnlyRaw, false);

        // Validation
        const chainId = parseInt(chainIdStr, 10);
        const isChainIdValid = !isNaN(chainId) && chainId > 0;
        const isRpcValid = rpcUrl && typeof rpcUrl === 'string' && rpcUrl.trim().startsWith('https://');
        const hasRequiredBaseInfo = isChainIdValid && isRpcValid; // A network *must* have these
        const isContractConfigured = contractAddress && typeof contractAddress === 'string' && contractAddress.toLowerCase() !== "unused" && contractAddress.trim() !== '';

        if (hasRequiredBaseInfo) {
            const isTestnet = name.toLowerCase().includes('sepolia') || name.toLowerCase().includes('amoy') || name.toLowerCase().includes('goerli') || name.toLowerCase().includes('testnet');
            const openseaBaseUrl = isTestnet ? 'https://testnets.opensea.io' : 'https://opensea.io';
            const openseaSlug = OPENSEA_SLUGS[upperKeyForEnv] || null;

            loadedNetworks[key] = {
                key: key,
                chainId: chainId,
                chainIdHex: `0x${chainId.toString(16)}`,
                name: name.trim(),
                rpcUrl: rpcUrl.trim(),
                explorerUrl: explorerUrl ? explorerUrl.trim() : null,
                contractAddress: contractAddress ? contractAddress.trim() : null,
                isContractConfigured: isContractConfigured,
                symbol: symbol.trim(),
                ownerOnly: ownerOnly,
                openseaBaseUrl: openseaBaseUrl,
                openseaSlug: openseaSlug,
                isCustom: wizardNetworkSettings.isCustom || key.startsWith('custom_'),
            };
        } else {
             console.warn(`Network '${name || key}' (Key: ${key}) skipped due to missing valid Chain ID or HTTPS RPC URL. Values after merge: ChainID='${chainIdStr}', RPC='${rpcUrl}'`);
        }
    }

    const envDefaultKey = import.meta.env.VITE_DEFAULT_NETWORK_KEY;
    let determinedDefaultKey = null;

    if (wizardDefaultKey && loadedNetworks[wizardDefaultKey]?.isContractConfigured) { // Also check if default from wizard is usable
        determinedDefaultKey = wizardDefaultKey;
    } else if (envDefaultKey && loadedNetworks[envDefaultKey]?.isContractConfigured) {
        determinedDefaultKey = envDefaultKey;
    } else {
        // Fallback: first key from loadedNetworks that has a configured contract
        determinedDefaultKey = Object.keys(loadedNetworks).find(k => loadedNetworks[k].isContractConfigured)
                             // If none have contracts, then just the first loaded network, if any
                             || Object.keys(loadedNetworks)[0]
                             || null;
    }
    const defaultNetwork = determinedDefaultKey ? loadedNetworks[determinedDefaultKey] : null;

    console.log("loadNetworksConfig: Final Merged Networks:", JSON.parse(JSON.stringify(loadedNetworks)));
    console.log("loadNetworksConfig: Final Default Network Key:", determinedDefaultKey);

    return {
        networks: loadedNetworks,
        defaultNetworkKey: determinedDefaultKey,
        defaultNetwork: defaultNetwork,
        displayPrefs: wizardDisplayPrefs,
        projectName: wizardProjectName || "NFT Project"
    };
}