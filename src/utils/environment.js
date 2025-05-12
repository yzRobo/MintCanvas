// src/utils/environment.js

/**
 * Checks if the code is running inside a GitHub Codespace.
 * It prioritizes hostname checks, then looks for VITE_ prefixed environment variables.
 * @returns {boolean} True if in Codespaces, false otherwise.
 */
export const isRunningInCodespaces = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Check 1: Hostname patterns for Codespaces
  // Standard Codespaces domains:
  // 1. *.github.dev (VS Code for the Web interface - application preview might still be on app.github.dev)
  // 2. *.app.github.dev (Port forwarded applications, often with a long prefix like your-codespace-name-8080.app.github.dev)
  // Regex to match domains ending with .github.dev or .app.github.dev
  const codespacesHostnamePattern = /\.github\.dev$|\.app\.github\.dev$/;
  const isInCodespacesHostname = codespacesHostnamePattern.test(hostname);

  if (isInCodespacesHostname) {
      console.log("Environment Check: Detected Codespaces via hostname:", hostname);
      return true;
  }

  // Check 2: VITE_ prefixed environment variables (more explicit, but require setup in .devcontainer or .env)
  // Vite exposes env vars prefixed with VITE_ to the client.
  // Common Codespaces env vars are CODESPACE_NAME, GITHUB_CODESPACE_TOKEN.
  // To use them here, they'd need to be VITE_CODESPACE_NAME, VITE_GITHUB_CODESPACES='true', etc.
  const viteEnvVarIsCodespaces = import.meta.env.VITE_GITHUB_CODESPACES === 'true';
  const viteEnvVarHasCodespaceName = typeof import.meta.env.VITE_CODESPACE_NAME === 'string' && import.meta.env.VITE_CODESPACE_NAME !== '';

  if (viteEnvVarIsCodespaces || viteEnvVarHasCodespaceName) {
      console.log("Environment Check: Detected Codespaces via VITE_ prefixed environment variable.");
      return true;
  }
  
  // console.log("Environment Check: Codespaces not detected via hostname or VITE_ env vars.");
  return false;
};

/**
 * Checks if the browser supports the File System Access API's showDirectoryPicker.
 * @returns {boolean} True if supported, false otherwise.
 */
export const supportsFileSystemAccessAPI = () => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && typeof window.showDirectoryPicker === 'function';
};

/**
 * Determines the current environment capability for saving configuration.
 * It prioritizes Codespaces if detected, then File System Access API, then defaults to manual.
 * @returns {'codespaces' | 'filesystem' | 'manual'} The detected environment type.
 */
export const getSaveEnvironment = () => {
  if (isRunningInCodespaces()) {
    // This log will now be more accurate based on the improved isRunningInCodespaces
    console.log("Environment Check: Save environment set to 'codespaces'.");
    return 'codespaces';
  }

  if (supportsFileSystemAccessAPI()) {
    console.log("Environment Check: Save environment set to 'filesystem' (File System Access API support detected).");
    return 'filesystem';
  }

  console.log("Environment Check: Save environment set to 'manual' (fallback).");
  return 'manual';
};