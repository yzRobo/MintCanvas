// src/config-tool/steps/ReviewConfig.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area"; // Good for long lists of networks

// Helper to format network display
const NetworkReviewItem = ({ networkKey, config }) => (
  <div className="border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
    <p className="font-medium text-sm">{networkKey.replace('_', ' ')}</p>
    <p className="text-xs text-muted-foreground break-all">
      Contract: {config?.contractAddress || <span className="italic text-muted-foreground/70">Not Configured</span>}
    </p>
    {/* TODO: Add display for advanced network settings when implemented */}
  </div>
);

// Props will include the full configuration data object
const ReviewConfig = ({ data }) => {
  const {
    projectName,
    projectDescription,
    networks,
    displayPrefs,
  } = data || {}; // Destructure with defaults

  const configuredNetworks = Object.entries(networks || {})
      .filter(([_, config]) => config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused');

  const notConfiguredNetworks = Object.entries(networks || {})
      .filter(([_, config]) => !config?.contractAddress || config.contractAddress.toLowerCase() === 'unused');


  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Please review your configuration settings below. Click "Apply Configuration" when you're ready. You can use the "Back" button to make changes.
      </p>

      {/* Project Details Review */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><Label className="text-muted-foreground">Name:</Label> {projectName || <span className="italic">Not Set</span>}</div>
          <div><Label className="text-muted-foreground">Description:</Label> {projectDescription || <span className="italic">Not Set</span>}</div>
        </CardContent>
      </Card>

      {/* Network Config Review */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Network Configuration</CardTitle>
        </CardHeader>
        <CardContent>
           {configuredNetworks.length > 0 ? (
               <ScrollArea className="h-[150px] pr-3"> {/* Adjust height as needed */}
                 <div className="space-y-2">
                    {configuredNetworks.map(([key, config]) => (
                        <NetworkReviewItem key={key} networkKey={key} config={config} />
                    ))}
                 </div>
               </ScrollArea>
           ) : (
               <p className="text-sm text-muted-foreground italic">No networks configured with contract addresses.</p>
           )}
           {notConfiguredNetworks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Networks skipped (no contract address provided): {notConfiguredNetworks.map(n => n[0].replace('_', ' ')).join(', ')}
              </p>
           )}
        </CardContent>
      </Card>

      {/* Display Preferences Review */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Display Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><Label className="text-muted-foreground">Primary Attribute:</Label> {displayPrefs?.primaryAttribute || <span className="italic">None Set</span>}</div>
          {/* TODO: Add review for advanced display settings */}
        </CardContent>
      </Card>

    </div>
  );
};

export default ReviewConfig;