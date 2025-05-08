// src/utils/configSaver.js

/**
 * Triggers a browser download for the generated configuration JSON.
 * @param {object} configData - The configuration object to save.
 * @param {string} [filename='projectConfig.json'] - The desired filename for download.
 */
export const downloadConfigFile = (configData, filename = 'projectConfig.json') => {
    try {
      // Ensure necessary fields are present before stringifying (optional, good practice)
      const dataToSave = {
        projectName: configData.projectName || "My NFT Project",
        projectDescription: configData.projectDescription || "",
        networks: configData.networks || {},
        displayPrefs: configData.displayPrefs || {},
        configFormatVersion: configData.configFormatVersion || 1,
        defaultNetworkKey: configData.defaultNetworkKey || null, // Save the default network choice
        // Add any other top-level config keys here
      };
  
      const jsonString = JSON.stringify(dataToSave, null, 2); // Pretty print JSON
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
  
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
  
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  
      console.log(`ConfigSaver: Triggered download for ${filename}`);
      return { success: true };
    } catch (error) {
      console.error("ConfigSaver: Error creating download file:", error);
      return { success: false, error: "Failed to generate download file." };
    }
  };
  
  // Placeholder for File System API saving
  export const saveConfigFileViaFS = async (configData) => {
    console.log("ConfigSaver: saveConfigFileViaFS called (Not Implemented)");
    alert("File System saving not implemented yet.");
    return { success: false, error: "File System saving not implemented." };
    // Implementation will involve:
    // 1. const dirHandle = await window.showDirectoryPicker();
    // 2. const fileHandle = await dirHandle.getFileHandle('projectConfig.json', { create: true });
    // 3. const writable = await fileHandle.createWritable();
    // 4. await writable.write(JSON.stringify(configData, null, 2));
    // 5. await writable.close();
  };
  
  // Placeholder for Codespaces saving
  export const saveConfigFileInCodespaces = async (configData) => {
     console.log("ConfigSaver: saveConfigFileInCodespaces called (Not Implemented)");
     alert("Codespaces saving not implemented yet.");
     return { success: false, error: "Codespaces saving not implemented." };
     // Implementation likely involves sending the configData to a simple
     // server/endpoint running *within* the Codespace dev container that has
     // permissions to write to the workspace filesystem.
  };