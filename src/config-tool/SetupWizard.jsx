// src/config-tool/SetupWizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ProjectDetails from './steps/ProjectDetails';
import NetworkConfig from './steps/NetworkConfig';
import AttributesConfig from './steps/AttributesConfig';
import ReviewConfig from './steps/ReviewConfig';
import { ethers } from 'ethers';
import { getSaveEnvironment } from '@/utils/environment';
import { downloadConfigFile, saveConfigFileViaFS, saveConfigFileInCodespaces } from '@/utils/configSaver';
import { useConfig } from '@/contexts/ConfigContext';
import { Loader2, Download, Save, Terminal } from 'lucide-react';

// Basic validation for Ethereum-style addresses
const isValidAddressForWizard = (address) => {
    if (!address || address.toLowerCase() === 'unused') return true;
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
    networks: {},
    displayPrefs: { primaryAttribute: '' },
    configFormatVersion: 1,
    defaultNetworkKey: null,
  });
  const [stepErrors, setStepErrors] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [saveEnv, setSaveEnv] = useState('manual');

  const { loadConfig } = useConfig(); // To reload config after successful save

  // Detect environment on mount
  useEffect(() => {
    setSaveEnv(getSaveEnvironment());
  }, []);

  const CurrentStepComponent = steps[currentStepIndex].component;

  const updateConfigData = useCallback((newData) => {
    setConfigInProgress(prev => {
        const nextState = { ...prev, ...newData };
        if (newData.networks) {
            const firstValidKey = Object.keys(nextState.networks).find(k =>
                nextState.networks[k]?.contractAddress &&
                nextState.networks[k].contractAddress.toLowerCase() !== 'unused' &&
                isValidAddressForWizard(nextState.networks[k].contractAddress)
            );
            const currentDefaultIsValid = nextState.defaultNetworkKey &&
                                        nextState.networks[nextState.defaultNetworkKey]?.contractAddress &&
                                        nextState.networks[nextState.defaultNetworkKey].contractAddress.toLowerCase() !== 'unused' &&
                                        isValidAddressForWizard(nextState.networks[nextState.defaultNetworkKey].contractAddress);
            if (!currentDefaultIsValid) {
                nextState.defaultNetworkKey = firstValidKey || null;
            } else if (!nextState.defaultNetworkKey && firstValidKey) {
                nextState.defaultNetworkKey = firstValidKey;
            }
        }
        return nextState;
    });
    setStepErrors(prev => ({...prev, [currentStepIndex]: null}));
    setApplyError(null);
  }, [currentStepIndex]); // currentStepIndex dependency is fine here

  const validateStep = (stepIndex) => {
    let error = null;
    if (stepIndex === 0) {
        if (!configInProgress.projectName?.trim()) error = "Project Name is required.";
    } else if (stepIndex === 1) {
        const configuredNetworks = Object.values(configInProgress.networks || {}).filter(
            config => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused'
        );
        if (configuredNetworks.length === 0) {
            error = "Please configure at least one network with a valid contract address (or mark all as UNUSED).";
        } else {
            const invalidEntry = Object.entries(configInProgress.networks || {}).find(
                ([key, config]) => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused' && !isValidAddressForWizard(config.contractAddress)
            );
            if (invalidEntry) {
                error = `Invalid address format for network ${invalidEntry[0].replace('_', ' ')}.`;
            }
        }
    } else if (stepIndex === 2) { /* No validation for AttributesConfig yet */ }
    else if (stepIndex === 3) { // Review step validation
        if (!configInProgress.projectName?.trim()) error = "Project Name is missing (Go back to Step 1).";
        else {
            const configuredForReview = Object.values(configInProgress.networks || {}).filter(
                config => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused'
            );
            if (configuredForReview.length === 0) {
                 error = "No networks configured with contract addresses (Go back to Step 2).";
            } else {
                 const invalidForReview = Object.entries(configInProgress.networks || {}).find(
                    ([key, config]) => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused' && !isValidAddressForWizard(config.contractAddress)
                );
                 if (invalidForReview) error = `Invalid address for network ${invalidForReview[0].replace('_', ' ')} (Go back to Step 2).`;
            }
        }
    }
    setStepErrors(prev => ({...prev, [stepIndex]: error}));
    return !error;
  };

  const handleApplyConfiguration = async () => {
    if (!validateStep(currentStepIndex)) { return; }

    console.log("Applying configuration with method:", saveEnv, configInProgress);
    setIsApplying(true);
    setApplyError(null);
    let result = { success: false, error: "Saving method not determined or failed." };

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
            result = await saveConfigFileViaFS(finalConfig, 'projectConfig.json');
        } else if (saveEnv === 'codespaces') {
            result = await saveConfigFileInCodespaces(finalConfig); // Placeholder
        } else { // Default to manual download
            result = downloadConfigFile(finalConfig, 'projectConfig.json');
        }

        if (!result.success) { throw new Error(result.error || "Failed to apply configuration."); }

        if (saveEnv === 'filesystem' || saveEnv === 'codespaces') {
            alert("Configuration saved successfully! Reloading the application to apply changes...");
            // A short delay might help ensure file system write completes before reload
            setTimeout(() => window.location.reload(), 500);
        } else if (saveEnv === 'manual' && result.success) {
            alert("Configuration file ('projectConfig.json') download initiated.\n\nIMPORTANT:\n1. Find the downloaded file.\n2. Place it in the '/public' directory in your project folder.\n3. Restart the development server (Ctrl+C and 'npm run dev').\n4. Refresh this page.");
            // No automatic reload for manual download
        }
    } catch (error) {
        console.error("Apply Configuration Error:", error);
        setApplyError(error.message || "An unexpected error occurred during saving.");
    } finally {
        // Only set isApplying to false if not reloading, or if an error occurred
        if (!(result.success && (saveEnv === 'filesystem' || saveEnv === 'codespaces'))) {
            setIsApplying(false);
        }
    }
  };

  const goToNextStep = () => {
    if (!validateStep(currentStepIndex)) return;
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleApplyConfiguration();
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  const currentStepError = stepErrors[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  let applyButtonText = "Apply Configuration";
  let applyButtonIcon = null;
  if (saveEnv === 'filesystem') { applyButtonText = "Save to Project Folder"; applyButtonIcon = <Save className="mr-2 h-4 w-4"/>; }
  else if (saveEnv === 'codespaces') { applyButtonText = "Apply in Codespaces"; applyButtonIcon = <Terminal className="mr-2 h-4 w-4"/>; }
  else { applyButtonText = "Download Config File"; applyButtonIcon = <Download className="mr-2 h-4 w-4"/>; }
  if (isApplying) { applyButtonText = "Applying..."; applyButtonIcon = <Loader2 className="mr-2 h-4 w-4 animate-spin"/>; }

  return (
    
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
           <CardTitle className="text-2xl font-bold">Configure Your NFT dApp</CardTitle>
           <CardDescription>Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          <CurrentStepComponent data={configInProgress} updateData={updateConfigData} />
          {currentStepError && !isApplying && (
            <p className="text-sm text-red-600 mt-4">{currentStepError}</p>
          )}
          {isLastStep && applyError && (
            <p className="text-sm text-red-600 mt-4">Apply Error: {applyError}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
           <Button variant="outline" onClick={goToPreviousStep} disabled={currentStepIndex === 0 || isApplying}>Back</Button>
           <Button onClick={goToNextStep} disabled={!!currentStepError || isApplying}>
             {isLastStep ? applyButtonIcon : null}
             {isLastStep ? applyButtonText : 'Next'}
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetupWizard;