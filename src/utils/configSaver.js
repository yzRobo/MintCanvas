// src/utils/configSaver.js
import { supportsFileSystemAccessAPI } from '@/utils/environment';

/**
 * Prepares the configuration data for saving, ensuring all expected top-level keys are present.
 * @param {object} configData - The raw configuration data from the wizard.
 * @returns {object} - The structured configuration data ready for serialization.
 */
const prepareConfigForSave = (configData) => {
  return {
    projectName: configData.projectName?.trim() || "My NFT Project",
    projectDescription: configData.projectDescription?.trim() || "",
    networks: configData.networks || {},
    displayPrefs: configData.displayPrefs || {},
    configFormatVersion: configData.configFormatVersion || 1,
    defaultNetworkKey: configData.defaultNetworkKey || null,
    // Add any other top-level config keys here in the future
  };
};

/**
 * Triggers a browser download for the generated configuration JSON.
 * @param {object} configData - The configuration object to save.
 * @param {string} [filename='projectConfig.json'] - The desired filename for download.
 */
export const downloadConfigFile = (configData, filename = 'projectConfig.json') => {
  try {
    const dataToSave = prepareConfigForSave(configData);
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

/**
 * Saves the configuration file directly into the 'public' subdirectory of the user's
 * selected project directory using the File System Access API.
 * @param {object} configData - The configuration object to save.
 * @param {string} [filename='projectConfig.json'] - The filename to save as.
 * @returns {Promise<{success: boolean, error?: string}>} - Promise resolving to success/error status.
 */
export const saveConfigFileViaFS = async (configData, filename = 'projectConfig.json') => {
  if (!supportsFileSystemAccessAPI()) {
    console.warn("ConfigSaver: FS API called but not supported by browser.");
    return { success: false, error: "File System Access API is not supported by your browser." };
  }

  alert(
    "You will now be asked to select your project's ROOT directory.\n\n" +
    "Please choose the main folder for your NFT dApp project " +
    "(the one containing 'src', 'public', 'package.json', etc.).\n\n" +
    `The configuration file ('${filename}') will be saved into the 'public' subfolder within it.`
  );

  try {
    console.log("ConfigSaver: Requesting directory handle for project root...");
    const projectDirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'nftDappConfigProjectRoot', // ID to remember the project root
        startIn: 'documents',
    });
    console.log(`ConfigSaver: Project root directory selected: ${projectDirHandle.name}`);

    // Get/create the 'public' subdirectory
    const publicDirHandle = await projectDirHandle.getDirectoryHandle('public', { create: true });
    console.log(`ConfigSaver: Got/created directory handle for 'public' within ${projectDirHandle.name}.`);

    // Get a handle to the file within 'public', creating it if it doesn't exist
    const fileHandle = await publicDirHandle.getFileHandle(filename, { create: true });
    console.log(`ConfigSaver: Got file handle for public/${filename}`);

    // Create a writable stream
    const writable = await fileHandle.createWritable();
    console.log("ConfigSaver: Created writable stream.");

    const dataToSave = prepareConfigForSave(configData);
    const jsonString = JSON.stringify(dataToSave, null, 2);

    // Write the contents
    await writable.write(jsonString);
    console.log("ConfigSaver: Wrote data to stream.");

    // Close the file and write the contents to disk
    await writable.close();
    console.log(`ConfigSaver: Successfully saved ${filename} to ${projectDirHandle.name}/public.`);

    return { success: true };

  } catch (error) {
    console.error("ConfigSaver: Error saving file via FS API:", error);
    if (error.name === 'AbortError') {
        return { success: false, error: "Directory selection cancelled by user." };
    }
    return { success: false, error: `Failed to save file: ${error.message || "Unknown error"}` };
  }
};

// Placeholder for Codespaces saving
export const saveConfigFileInCodespaces = async (configData) => {
   console.log("ConfigSaver: saveConfigFileInCodespaces called (Not Implemented)");
   alert("Codespaces saving not implemented yet.");
   return { success: false, error: "Codespaces saving not implemented." };
   // Implementation might involve POSTing to a local server endpoint within Codespace
};