// src/utils/environment.js

/**
 * Checks if the code is running inside a GitHub Codespace.
 * Relies on environment variables automatically set by Codespaces.
 * @returns {boolean} True if in Codespaces, false otherwise.
 */
export const isRunningInCodespaces = () => {
    // CODESPACE_NAME and GITHUB_CODESPACE_TOKEN are common indicators
    return !!(import.meta.env.CODESPACE_NAME || import.meta.env.GITHUB_CODESPACE_TOKEN);
    // Note: Vite might not automatically expose these non-VITE_ prefixed vars.
    // You might need to explicitly handle them in your Codespace setup (.devcontainer.json)
    // or use alternative detection methods if these aren't reliable in the client.
    // A simpler check might be window.location.hostname containing 'github.dev' or 'app.github.dev'
    // return window.location.hostname.includes('.github.dev') || window.location.hostname.includes('.app.github.dev');
  };
  
  /**
   * Checks if the browser supports the File System Access API's showDirectoryPicker.
   * @returns {boolean} True if supported, false otherwise.
   */
  export const supportsFileSystemAccessAPI = () => {
    return 'showDirectoryPicker' in window && typeof window.showDirectoryPicker === 'function';
  };
  
  /**
   * Determines the current environment capability for saving configuration.
   * @returns {'codespaces' | 'filesystem' | 'manual'} The detected environment type.
   */
  export const getSaveEnvironment = () => {
    // Prioritize Codespaces detection if reliable
    // if (isRunningInCodespaces()) {
    //   console.log("Environment Check: Detected Codespaces (Placeholder - Client-side detection tricky)");
    //   return 'codespaces'; // Reliability needs testing from within actual Codespace browser client
    // }
  
    // For now, let's rely more on feature detection for FS API
    if (supportsFileSystemAccessAPI()) {
      console.log("Environment Check: Detected File System Access API support.");
      return 'filesystem';
    }
  
    console.log("Environment Check: Defaulting to Manual Download.");
    return 'manual'; // Fallback
  };