// src/config-tool/SetupWizard.jsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ProjectDetails from './steps/ProjectDetails';
import NetworkConfig from './steps/NetworkConfig';
import AttributesConfig from './steps/AttributesConfig';
import ReviewConfig from './steps/ReviewConfig'; // Import the new step
import { ethers } from 'ethers';

// Basic validation function (keep as is)
const isValidAddressForWizard = (address) => {
    if (!address || address.toLowerCase() === 'unused') return true;
    return ethers.utils.isAddress(address);
};

// Define steps configuration
const steps = [
  { id: 1, title: "Project Details", component: ProjectDetails },
  { id: 2, title: "Network Configuration", component: NetworkConfig },
  { id: 3, title: "Display Preferences", component: AttributesConfig },
  { id: 4, title: "Review & Apply", component: ReviewConfig }, // Use the actual component
];

const SetupWizard = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [configInProgress, setConfigInProgress] = useState({
    projectName: '',
    projectDescription: '',
    networks: {},
    displayPrefs: {
        primaryAttribute: '',
    },
    configFormatVersion: 1,
  });
  const [stepErrors, setStepErrors] = useState({});
  const [isApplying, setIsApplying] = useState(false); // State for apply button

  const CurrentStepComponent = steps[currentStepIndex].component;

  // Update function remains the same
  const updateConfigData = (newData) => {
    setConfigInProgress(prev => ({ ...prev, ...newData }));
    setStepErrors(prev => ({...prev, [currentStepIndex]: null}));
  };

  // Validation function remains the same for now
  const validateStep = (stepIndex) => {
    let error = null;
    if (stepIndex === 0) {
        if (!configInProgress.projectName?.trim()) {
            error = "Project Name is required.";
        }
    } else if (stepIndex === 1) {
        const configuredNetworks = Object.entries(configInProgress.networks || {})
            .filter(([_, config]) => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused');
        if (configuredNetworks.length === 0) {
             error = "Please configure at least one network with a valid contract address.";
         } else {
             const invalidEntry = configuredNetworks.find(([_, config]) => !isValidAddressForWizard(config.contractAddress));
             if (invalidEntry) {
                 error = `Invalid address format entered for network ${invalidEntry[0]}. Please correct it.`;
             }
         }
    } else if (stepIndex === 2) {
         // No validation currently needed for step 3
    } else if (stepIndex === 3) {
         // Review step typically doesn't need validation itself, but relies on previous steps
         // Re-validate previous steps perhaps? For now, assume valid if reached.
    }
    setStepErrors(prev => ({...prev, [stepIndex]: error}));
    return !error;
  };

  const handleApplyConfiguration = () => {
      console.log("Attempting to apply configuration:", configInProgress);
      setIsApplying(true); // Show loading/disabled state
      // TODO: Implement actual configuration saving logic here based on environment
      // (e.g., call File System API, post to Codespaces helper, provide download)
      alert("Apply Configuration Logic Not Implemented Yet!");
      // Simulate success/failure later
      setTimeout(() => {
          // On success: maybe call loadConfig() from ConfigContext to trigger app reload?
          // On failure: show error message
          setIsApplying(false);
      }, 1500);
  };

  const goToNextStep = () => {
    if (!validateStep(currentStepIndex)) {
        return;
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // We are on the last step (Review), so trigger the apply action
      handleApplyConfiguration();
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const currentStepError = stepErrors[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
           <CardTitle className="text-2xl font-bold">Configure Your NFT dApp</CardTitle>
           <CardDescription>
             Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
           </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px]"> {/* Consider max-h with scroll if content gets long */}
          <CurrentStepComponent
            data={configInProgress}
            updateData={updateConfigData}
          />
          {currentStepError && (
            <p className="text-sm text-red-600 mt-4">{currentStepError}</p>
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
             {/* Show loading indicator if applying */}
             {isApplying && isLastStep && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {/* Change button text based on step */}
             {isLastStep ? (isApplying ? 'Applying...' : 'Apply Configuration') : 'Next'}
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetupWizard;