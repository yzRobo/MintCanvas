// src/config-tool/steps/ReviewConfig.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const NetworkReviewItem = ({ networkKey, config }) => {
    const displayName = config?.name || networkKey.replace(/_/g, ' ');
    const displayNetworkKey = config?.isCustom ? networkKey : `(${networkKey})`; // Show key only for predefined

    return (
      <div className="border-b pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0 text-xs">
        <p className="font-semibold text-sm mb-1">
            {displayName} {config?.isCustom ? <span className="text-muted-foreground font-normal">(Custom)</span> : <span className="text-muted-foreground font-normal">{displayNetworkKey}</span>}
        </p>
        <p><span className="text-muted-foreground">Contract Address:</span> {config?.contractAddress && config.contractAddress.toLowerCase() !== 'unused' ? config.contractAddress : <span className="italic text-muted-foreground/70">Not Used / Not Set by Wizard</span>}</p>
        <p><span className="text-muted-foreground">Chain ID:</span> {config?.chainId || <span className="italic">Not Set by Wizard (uses .env or default)</span>}</p>
        <p><span className="text-muted-foreground">Symbol:</span> {config?.symbol || <span className="italic">Not Set by Wizard (uses .env or default)</span>}</p>
        <p className="break-all"><span className="text-muted-foreground">RPC URL:</span> {config?.rpcUrl || <span className="italic">Not Set by Wizard (uses .env or default)</span>}</p>
        <p className="break-all"><span className="text-muted-foreground">Explorer URL:</span> {config?.explorerUrl || <span className="italic">Not Set by Wizard (uses .env or default)</span>}</p>
        <p><span className="text-muted-foreground">Owner Only UI:</span> {typeof config?.ownerOnly === 'boolean' ? (config.ownerOnly ? 'Yes' : 'No') : <span className="italic">Not Set by Wizard (uses .env or default)</span>}</p>
      </div>
    );
};

const ReviewConfig = ({ data }) => {
  const { projectName, projectDescription, networks, displayPrefs, defaultNetworkKey } = data || {};
  // Filter for networks that have *any* data from the wizard, to distinguish from purely .env driven ones not touched by wizard
  const wizardConfiguredNetworkEntries = Object.entries(networks || {}).filter(([key, config]) => Object.keys(config || {}).length > 0);


  return (
    <div className="space-y-6">
      <Alert variant="default">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Final Review & Important Notes</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>Review your settings. Values from your <code>.env</code> file (or platform secrets) for Network Name, Chain ID, RPC URL, Symbol, and Explorer URL will override what's shown below if those <code>.env</code> variables are set.</p>
            <p>Contract Addresses entered here take precedence. Secret API keys (Pinata, Vercel KV, private RPC keys) **must** be in your <code>.env</code> file or platform's secret manager.</p>
        </AlertDescription>
      </Alert>
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm" role="alert">
        <p className="font-semibold">Applying Configuration</p>
        <ul className="list-disc list-inside ml-4 mt-1 text-xs">
          <li>If using **File System Access**, you'll be prompted to select your project's main (root) folder to save the configuration to <code>public/projectConfig.json</code>. The app will then attempt to reload.</li>
          <li>Otherwise, a `projectConfig.json` file will be **downloaded**. You must manually place this file into your project's `/public` directory and then restart the development server.</li>
        </ul>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-lg">Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><Label className="text-muted-foreground">Project Name:</Label> {projectName || <span className="italic">Not Set</span>}</div>
          <div><Label className="text-muted-foreground">Project Description:</Label> {projectDescription || <span className="italic">Not Set</span>}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-lg">Network Settings (from Wizard)</CardTitle></CardHeader>
        <CardContent>
           {wizardConfiguredNetworkEntries.length > 0 ? (
               <ScrollArea className="h-[200px] pr-3">
                 <div className="space-y-2">
                    {wizardConfiguredNetworkEntries.map(([key, config]) => (
                        <NetworkReviewItem key={key} networkKey={key} config={config} />
                    ))}
                 </div>
               </ScrollArea>
           ) : ( <p className="text-sm text-muted-foreground italic">No networks were configured in the wizard. Settings will rely on <code>.env</code> or defaults.</p> )}

           {defaultNetworkKey && networks && networks[defaultNetworkKey] ? (
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                    Selected Default Network: <span className="font-semibold">{networks[defaultNetworkKey].name || defaultNetworkKey.replace(/_/g, ' ')}</span>
                </p>
           ) : (
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                    Default Network: <span className="italic">Will be determined from available configured networks.</span>
                </p>
           )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-lg">Display Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><Label className="text-muted-foreground">Primary Attribute:</Label> {displayPrefs?.primaryAttribute || <span className="italic">None Set</span>}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewConfig;