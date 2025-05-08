// src/config-tool/steps/AttributesConfig.jsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Props will include the current config data for this step and an update function
const AttributesConfig = ({ data, updateData }) => {
  // data.displayPrefs should be an object like: { primaryAttribute: '...' }
  const displayPrefs = data?.displayPrefs || {};

  const handleChange = (e) => {
    updateData({
      displayPrefs: {
        ...displayPrefs,
        [e.target.name]: e.target.value
      }
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure how NFT attributes are displayed in the gallery. More options will be added later.
      </p>
      <Card className="p-4">
        <Label htmlFor="primaryAttribute" className="font-semibold text-base block mb-2">
          Primary Display Attribute (Optional)
        </Label>
        <Input
          id="primaryAttribute"
          name="primaryAttribute" // Matches the key in displayPrefs
          placeholder="e.g., Special Message, Year Created, Edition"
          value={displayPrefs?.primaryAttribute || ''}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Enter the exact name of an attribute trait type (case-sensitive) that you want to prominently display on the NFT card in the gallery, if it exists for that token. Leave blank if not needed.
        </p>
      </Card>
       {/* TODO: Add Advanced section for IPFS gateways, layout options etc. */}
       <div className="mt-4 p-4 border border-dashed rounded-md text-center text-muted-foreground">
          Advanced display options (like IPFS Gateway preferences) coming soon.
       </div>
    </div>
  );
};

export default AttributesConfig;