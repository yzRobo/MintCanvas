// src/contexts/ConfigContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ConfigContext = createContext(null);

// Placeholder - In later steps, this will actually try to load config
// from localStorage, File System API, or check a flag.
const checkConfigurationStatus = async () => {
  console.log("ConfigContext: Checking configuration status...");
  // Simulate checking - for now, always return false (not configured)
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async check
  console.log("ConfigContext: Status check complete (returning 'not configured').");
  // In the future, this would return { isConfigured: true, configData: {...} }
  return { isConfigured: false, configData: null };
};

export const ConfigProvider = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { isConfigured: loadedIsConfigured, configData: loadedConfigData } = await checkConfigurationStatus();
      setIsConfigured(loadedIsConfigured);
      setConfigData(loadedConfigData);
      console.log(`ConfigContext: Loaded - isConfigured: ${loadedIsConfigured}`);
    } catch (err) {
      console.error("ConfigContext: Error loading configuration:", err);
      setError("Failed to load configuration.");
      setIsConfigured(false); // Ensure not configured on error
      setConfigData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load config on initial mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // TODO: Add saveConfig function later

  const value = {
    isConfigured,
    configData,
    isLoading,
    error,
    loadConfig, // Allow reloading if needed
    // saveConfig // Add later
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

// Custom hook to use the context
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};