// src/config-tool/SetupWizard.jsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ProjectDetails from './steps/ProjectDetails';
// Import other steps later:
// import NetworkConfig from './steps/NetworkConfig';
// import AttributesConfig from './steps/AttributesConfig';
// import ReviewConfig from './steps/ReviewConfig';

// Define steps configuration
const steps = [
  { id: 1, title: "Project Details", component: ProjectDetails },
  { id: 2, title: "Network Configuration", component: () => <div>Network Config (Step 2 - Coming Soon)</div> }, // Placeholder
  { id: 3, title: "Display Preferences", component: () => <div>Display Preferences (Step 3 - Coming Soon)</div> }, // Placeholder
  { id: 4, title: "Review & Apply", component: () => <div>Review & Apply (Step 4 - Coming Soon)</div> }, // Placeholder
];

const SetupWizard = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // State to hold the configuration object being built
  const [configInProgress, setConfigInProgress] = useState({
    // Initialize with potential default structure or leave empty
    projectName: '',
    projectDescription: '',
    networks: {}, // Structure for network configs
    displayPrefs: {}, // Structure for display prefs
    // Add a version field from the start
    configFormatVersion: 1, // Or import from your planned version file later
  });

  const CurrentStepComponent = steps[currentStepIndex].component;

  // Function to update the main config object
  const updateConfigData = (stepData) => {
    setConfigInProgress(prev => ({ ...prev, ...stepData }));
  };

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Handle final step / Apply logic later
      console.log("Final Step Reached. Config:", configInProgress);
      alert("Wizard Complete! (Apply logic not implemented yet)");
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Basic validation for the first step
  const isStep1Valid = !!configInProgress.projectName?.trim();
  const canGoNext = currentStepIndex === 0 ? isStep1Valid : true; // Add more validation per step

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl shadow-xl"> {/* Increased max-width */}
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Configure Your NFT dApp</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
          </CardDescription>
          {/* TODO: Add a progress bar/indicator later */}
        </CardHeader>
        <CardContent className="min-h-[300px]"> {/* Added min-height */}
          {/* Pass relevant part of config and update function to the current step */}
          <CurrentStepComponent
             data={configInProgress} // Pass the whole config for simplicity now, can refine later
             updateData={updateConfigData}
          />
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
          >
            Back
          </Button>
          <Button
            onClick={goToNextStep}
            disabled={!canGoNext} // Disable Next if current step invalid
          >
            {currentStepIndex === steps.length - 1 ? 'Finish & Apply (Later)' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetupWizard;