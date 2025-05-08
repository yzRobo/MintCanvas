// src/config-tool/SetupWizard.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ProjectDetails from './steps/ProjectDetails';
import NetworkConfig from './steps/NetworkConfig';
import AttributesConfig from './steps/AttributesConfig';
import ReviewConfig from './steps/ReviewConfig';
import { ethers } from 'ethers';
import { getSaveEnvironment } from '@/utils/environment'; // Import environment checker
import { downloadConfigFile, saveConfigFileViaFS, saveConfigFileInCodespaces } from '@/utils/configSaver'; // Import save functions
import { useConfig } from '@/contexts/ConfigContext'; // Import useConfig to potentially reload
import { Loader2, Download, Save, Terminal } from 'lucide-react'; // Add icons

// Basic validation for Ethereum-style addresses (used in wizard validation)
const isValidAddressForWizard = (address) => {
    if (!address || address.toLowerCase() === 'unused') return true; // Empty or UNUSED is valid input
    return ethers.utils.isAddress(address);
};

// Define steps configuration
const steps = [
  { id: 1, title: "Project Details", component: ProjectDetails },
  { id: 2, title: "Network Configuration", component: NetworkConfig },
  { id: 3, title: "Display Preferences", component: AttributesConfig },
  { id: 4, title: "Review & Apply", component: ReviewConfig },
];

const SetupWizard = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [configInProgress, setConfigInProgress] = useState({
    projectName: '',
    projectDescription: '',
    networks: {}, // Will be populated: { ETHEREUM: { contractAddress: '...' } }
    displayPrefs: { // Initialize displayPrefs
        primaryAttribute: '',
    },
    configFormatVersion: 1, // Set initial version
    defaultNetworkKey: null, // Initialize defaultNetworkKey
  });
  const [stepErrors, setStepErrors] = useState({});
  const [isApplying, setIsApplying] = useState(false); // State for apply button loading
  const [applyError, setApplyError] = useState(null); // Specific error during apply action
  const [saveEnv, setSaveEnv] = useState('manual'); // State to hold detected environment ('manual', 'filesystem', 'codespaces')

  const { loadConfig } = useConfig(); // Get loadConfig to potentially trigger reload later

  // Detect environment on component mount
  useEffect(() => {
    setSaveEnv(getSaveEnvironment());
  }, []);

  // Get the component for the current step
  const CurrentStepComponent = steps[currentStepIndex].component;

  // --- Update Configuration State ---
  const updateConfigData = useCallback((newData) => {
    setConfigInProgress(prev => {
        // Create a new state object by merging previous state and new data
        const nextState = { ...prev, ...newData };

        // Special handling for networks to ensure defaultNetworkKey logic runs
        if (newData.networks) {
            // Determine the first valid configured network as a potential default
            // Only update default if it's not set or the current default becomes invalid
            const firstValidKey = Object.keys(nextState.networks).find(k =>
                nextState.networks[k]?.contractAddress &&
                nextState.networks[k].contractAddress.toLowerCase() !== 'unused' &&
                isValidAddressForWizard(nextState.networks[k].contractAddress) // Use validation here too
            );

            const currentDefaultIsValid = nextState.defaultNetworkKey &&
                                        nextState.networks[nextState.defaultNetworkKey]?.contractAddress &&
                                        nextState.networks[nextState.defaultNetworkKey].contractAddress.toLowerCase() !== 'unused' &&
                                        isValidAddressForWizard(nextState.networks[nextState.defaultNetworkKey].contractAddress);

            if (!currentDefaultIsValid) {
                console.log("Setting default network key to:", firstValidKey || null);
                nextState.defaultNetworkKey = firstValidKey || null;
            } else if (!nextState.defaultNetworkKey && firstValidKey) {
                // Set if it was previously null and a valid one is now available
                console.log("Setting initial default network key to:", firstValidKey);
                nextState.defaultNetworkKey = firstValidKey;
            }
        }
        return nextState;
    });
    // Clear validation error for the current step when data changes
    setStepErrors(prev => ({...prev, [currentStepIndex]: null}));
    setApplyError(null); // Clear apply error on data change
  }, [currentStepIndex]); // Include currentStepIndex if logic inside depends on it (like setting default)

  // --- Step Validation ---
  const validateStep = (stepIndex) => {
      let error = null;
      if (stepIndex === 0) { // Project Details validation
          if (!configInProgress.projectName?.trim()) {
              error = "Project Name is required.";
          }
      } else if (stepIndex === 1) { // Network Config validation
          const configuredNetworks = Object.entries(configInProgress.networks || {})
              .filter(([_, config]) => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused');

          if (configuredNetworks.length === 0) {
              error = "Please configure at least one network with a valid contract address (or mark all as UNUSED).";
          } else {
              const invalidEntry = configuredNetworks.find(([key, config]) => !isValidAddressForWizard(config.contractAddress));
              if (invalidEntry) {
                  error = `Invalid address format entered for network ${invalidEntry[0].replace('_', ' ')}. Please correct it.`;
              }
          }
      } else if (stepIndex === 2) {
          // No required fields for AttributesConfig currently
      } else if (stepIndex === 3) {
          // Final review step validation - could re-run previous steps' validation
           if (!configInProgress.projectName?.trim()) error = "Project Name is missing (Go back to Step 1).";
           else if (Object.values(configInProgress.networks || {}).filter(n => n?.contractAddress && n.contractAddress.toLowerCase() !== 'unused').length === 0) error = "No networks configured (Go back to Step 2).";
           // Add more checks if needed
      }

      setStepErrors(prev => ({...prev, [stepIndex]: error}));
      return !error; // Return true if valid, false otherwise
  };

  // --- Apply Configuration Logic ---
  const handleApplyConfiguration = async () => {
    // Re-validate the final step before applying
    if (!validateStep(currentStepIndex)) {
        console.warn("Apply blocked due to validation errors on review step.");
        return;
    }

    console.log("Applying configuration with method:", saveEnv);
    setIsApplying(true);
    setApplyError(null);
    let result = { success: false, error: "Unknown saving method." };

    // Prepare the final configuration object
    const finalConfig = {
        projectName: configInProgress.projectName?.trim() || "My NFT Project",
        projectDescription: configInProgress.projectDescription?.trim() || "",
        networks: configInProgress.networks || {},
        displayPrefs: configInProgress.displayPrefs || {},
        configFormatVersion: configInProgress.configFormatVersion || 1,
        defaultNetworkKey: configInProgress.defaultNetworkKey || null,
    };


    try {
        if (saveEnv === 'filesystem') {
            // result = await saveConfigFileViaFS(finalConfig); // Uncomment when implemented
            console.warn("Filesystem save not implemented yet.");
            result = { success: false, error: "Filesystem save not implemented." };
        } else if (saveEnv === 'codespaces') {
            // result = await saveConfigFileInCodespaces(finalConfig); // Uncomment when implemented
            console.warn("Codespaces save not implemented yet.");
            result = { success: false, error: "Codespaces save not implemented." };
        } else { // Default to manual download
            result = downloadConfigFile(finalConfig);
            // For download, success just means the download was triggered
            if (result.success) {
                 // Provide clearer instructions for manual download
                 alert("Configuration file ('projectConfig.json') download initiated.\n\nIMPORTANT:\n1. Find the downloaded file.\n2. Place it inside the '/public' directory in your project folder.\n3. Restart the development server (Ctrl+C and 'npm run dev').\n4. Refresh this page.");
                 // We cannot automatically reload here for manual download
                 // Setting isApplying to false is enough. User needs to act.
            }
        }

        if (!result.success) {
             // Throw error if any save method reported failure
            throw new Error(result.error || "Failed to apply configuration.");
        }

        // If other methods (FS API, Codespaces) were successful, potentially reload:
        if (saveEnv === 'filesystem' || saveEnv === 'codespaces') {
             // Optional: Reload after a short delay to allow file system to sync?
             // setTimeout(() => window.location.reload(), 1000);
             // Or try triggering context reload:
             // await loadConfig();
        }


    } catch (error) {
        console.error("Apply Configuration Error:", error);
        setApplyError(error.message || "An unexpected error occurred during saving.");
    } finally {
        setIsApplying(false); // Stop loading indicator
    }
  };

  // --- Navigation ---
  const goToNextStep = () => {
    if (!validateStep(currentStepIndex)) {
        return;
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // On the last step, clicking "Next" becomes "Apply"
      handleApplyConfiguration();
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // --- Render Variables ---
  const currentStepError = stepErrors[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Determine apply button text/icon based on detected environment
  let applyButtonText = "Apply Configuration";
  let applyButtonIcon = null;
  if (saveEnv === 'filesystem') { applyButtonText = "Save to Project Folder"; applyButtonIcon = <Save className="mr-2 h-4 w-4"/>; }
  else if (saveEnv === 'codespaces') { applyButtonText = "Apply in Codespaces"; applyButtonIcon = <Terminal className="mr-2 h-4 w-4"/>; }
  else { applyButtonText = "Download Config File"; applyButtonIcon = <Download className="mr-2 h-4 w-4"/>; }
  // Override if applying
  if (isApplying) { applyButtonText = "Applying..."; applyButtonIcon = <Loader2 className="mr-2 h-4 w-4 animate-spin"/>; }


  // --- JSX ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
           <CardTitle className="text-2xl font-bold">Configure Your NFT dApp</CardTitle>
           <CardDescription>
             Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
           </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          <CurrentStepComponent
            data={configInProgress}
            updateData={updateConfigData}
          />
          {/* Display step-specific validation error */}
          {currentStepError && !isApplying && (
            <p className="text-sm text-red-600 mt-4">{currentStepError}</p>
          )}
          {/* Display Apply Error only on the last step */}
          {isLastStep && applyError && (
            <p className="text-sm text-red-600 mt-4">Apply Error: {applyError}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
           <Button
             variant="outline"
             onClick={goToPreviousStep}
             disabled={currentStepIndex === 0 || isApplying} // Disable back while applying
           >
            Back
           </Button>
           <Button
             onClick={goToNextStep}
             // Disable if error on current step OR if currently applying config
             disabled={!!currentStepError || isApplying}
           >
             {isLastStep ? applyButtonIcon : null}
             {isLastStep ? applyButtonText : 'Next'}
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetupWizard;