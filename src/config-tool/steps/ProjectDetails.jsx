// src/config-tool/steps/ProjectDetails.jsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Props will include the current config data for this step and an update function
const ProjectDetails = ({ data, updateData }) => {
  const handleChange = (e) => {
    updateData({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the basic details for your NFT project. This will be used for branding and display purposes.
      </p>
      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name *</Label>
        <Input
          id="projectName"
          name="projectName" // Use name for easier handling in updateData
          placeholder="e.g., My Awesome Art Collection"
          value={data?.projectName || ''}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectDescription">Project Description (Optional)</Label>
        <Textarea
          id="projectDescription"
          name="projectDescription"
          placeholder="A brief description of your project or collection."
          value={data?.projectDescription || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>
    </div>
  );
};

export default ProjectDetails;