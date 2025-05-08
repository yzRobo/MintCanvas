// src/contexts/ConfigContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ConfigContext = createContext(null);

// --- Configuration Loading ---
// Attempts to load configuration from a known location.
// For now, we'll try fetching from `/projectConfig.json` (expected in public/ dir initially,
// but the "Apply" step will later save it potentially elsewhere for local dev).
const loadConfigurationFromFile = async () => {
  console.log("ConfigContext: Attempting to load configuration from /projectConfig.json...");
  try {
    const response = await fetch('/projectConfig.json', { cache: 'no-store' });

    if (response.ok) {
      const configData = await response.json();
      console.log("ConfigContext: Successfully loaded projectConfig.json:", configData);

      // Validation: Check for minimum required field (e.g., projectName)
      if (configData && typeof configData === 'object' && configData.projectName) {
        console.log("ConfigContext: Configuration appears valid.");
        // TODO: Migration logic can go here
        return { isConfigured: true, configData: configData };
      } else {
        console.warn("ConfigContext: projectConfig.json found but content seems invalid/incomplete.");
        // *** CHANGE HERE: Don't return an error, just mark as not configured ***
        return { isConfigured: false, configData: null };
      }
    } else if (response.status === 404) {
      console.log("ConfigContext: projectConfig.json not found (404). App needs configuration.");
      return { isConfigured: false, configData: null };
    } else {
      console.error(`ConfigContext: Failed to fetch projectConfig.json - Status ${response.status}`);
      // Keep returning error for actual fetch failures
      return { isConfigured: false, configData: null, error: `Failed to load configuration (HTTP ${response.status}).` };
    }
  } catch (error) {
    console.error("ConfigContext: Error during configuration load:", error);
    if (error instanceof SyntaxError) {
       // Keep returning error for malformed JSON
       return { isConfigured: false, configData: null, error: "Configuration file is malformed (invalid JSON)." };
    }
    // Keep returning error for network/other issues
    return { isConfigured: false, configData: null, error: "Could not check configuration." };
  }
};


export const ConfigProvider = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [error, setError] = useState(null); // Config loading specific error

  const loadConfig = useCallback(async () => {
    console.log("ConfigContext: loadConfig called.");
    setIsLoading(true);
    setError(null); // Clear previous loading errors
    try {
      const {
          isConfigured: loadedIsConfigured,
          configData: loadedConfigData,
          error: loadingError // Capture error from loading function
       } = await loadConfigurationFromFile();

      setIsConfigured(loadedIsConfigured);
      setConfigData(loadedConfigData);
      if(loadingError) setError(loadingError); // Set error state if loading failed

      console.log(`ConfigContext: Load complete. isConfigured: ${loadedIsConfigured}, Error: ${loadingError || 'None'}`);
    } catch (err) {
      // Catch any unexpected errors from the load function itself
      console.error("ConfigContext: Unexpected error during loadConfig execution:", err);
      setError("An unexpected error occurred while loading configuration.");
      setIsConfigured(false);
      setConfigData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load config on initial mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Function to be called by the wizard to save the config
  // This is just a placeholder for the structure; actual saving happens in the wizard
  const saveConfig = async (newConfigData) => {
     console.log("ConfigContext: saveConfig called (will be handled by wizard apply logic)", newConfigData);
     // In a real scenario after saving, you'd likely call loadConfig() again
     // or directly update the state and trigger a reload if necessary.
     setConfigData(newConfigData);
     setIsConfigured(true); // Assume saving means it's now configured
     // Possibly: window.location.reload(); // Force reload to ensure all modules get new config
     return true; // Indicate success (placeholder)
  };


  const value = {
    isConfigured,
    configData,
    isLoading,
    error,
    loadConfig, // Expose loadConfig to potentially re-trigger loading
    saveConfig, // Expose saveConfig (even as placeholder)
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

// Custom hook remains the same
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};