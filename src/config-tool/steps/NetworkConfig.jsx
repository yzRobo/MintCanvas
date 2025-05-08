// src/config-tool/steps/NetworkConfig.jsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ethers } from 'ethers'; // For address validation

// Define the network keys we expect configuration for
// TODO: Ideally, load this dynamically later based on .env.template or a base config
const PREDEFINED_NETWORK_KEYS = [
  'ETHEREUM', 'SEPOLIA', 'POLYGON', 'POLYGON_AMOY', 'BASE', 'BASE_SEPOLIA'
];

// Basic validation for Ethereum-style addresses
const isValidAddress = (address) => {
  if (!address || address.toLowerCase() === 'unused') return true; // Allow 'UNUSED' or empty
  return ethers.utils.isAddress(address);
};

const NetworkConfig = ({ data, updateData }) => {
  // data.networks should be an object like: { ETHEREUM: { contractAddress: '...' }, SEPOLIA: { ... } }
  const networksConfig = data?.networks || {};

  const handleAddressChange = (networkKey, value) => {
    const newNetworksConfig = {
      ...networksConfig,
      [networkKey]: {
        ...networksConfig[networkKey], // Keep existing data for the network
        contractAddress: value, // Update only the address
      },
    };
    // Update the main config object in the wizard state
    updateData({ networks: newNetworksConfig });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter the deployed Smart Contract address for each network you want to support.
        Leave blank or type "UNUSED" if you don't have a contract deployed on a specific network.
      </p>
      <div className="space-y-4">
        {PREDEFINED_NETWORK_KEYS.map((networkKey) => {
          const currentAddress = networksConfig[networkKey]?.contractAddress || '';
          const isInvalid = currentAddress && currentAddress.toLowerCase() !== 'unused' && !isValidAddress(currentAddress);

          return (
            <Card key={networkKey} className={`p-4 ${isInvalid ? 'border-red-500' : ''}`}>
              <Label htmlFor={`contractAddress-${networkKey}`} className="font-semibold text-base block mb-2">
                {networkKey.replace('_', ' ')} {/* Simple formatting */}
              </Label>
              <Input
                id={`contractAddress-${networkKey}`}
                name={`contractAddress-${networkKey}`}
                placeholder="0x... or leave blank/UNUSED"
                value={currentAddress}
                onChange={(e) => handleAddressChange(networkKey, e.target.value)}
                className={isInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {isInvalid && (
                <p className="text-xs text-red-600 mt-1">Invalid address format.</p>
              )}
              {/* TODO: Add expandable section for Advanced options (RPC, Name, etc.) */}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground pt-2">
        Note: RPC URLs, Chain IDs, Explorer URLs etc., are currently read from the environment template (`.env.template`). Advanced configuration options will be added later. Ensure your corresponding `.env` file has the correct RPC URLs for the networks you configure here.
      </p>
    </div>
  );
};

export default NetworkConfig;