# NFT Gallery and 1-of-1 Minting dApp Template

A configurable template for deploying your own NFT gallery and minting platform, based on React, Vite, Ethers.js, and Tailwind CSS.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<YourUsername>%2F<YourRepoName>) <!-- TODO: Update this link after publishing -->
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/<YourUsername>/<YourRepoName>) <!-- TODO: Update this link after publishing -->

## Features

*   **NFT Gallery:** Browse minted NFTs on configured networks.
*   **NFT Minting:** Interface for an authorized minter to create new NFTs.
*   **Owner Panel:** Manage contract settings like minter address and base URI.
*   **Metadata Creation:** Tool to prepare NFT metadata and upload assets (including large files) to IPFS via Pinata.
*   **Multi-Chain Support:** Configurable for multiple EVM networks (Ethereum, Polygon, Base, etc.).
*   **Configuration Wizard:** Easy setup via a web interface (first run).
*   **Environment Support:** Works in Codespaces, Local Development (with File System API or manual setup), and standard hosting.

## Technology Stack

*   React (Vite)
*   Ethers.js v5
*   Tailwind CSS
*   shadcn/ui
*   Vercel (Serverless Functions, KV, Blob Storage)
*   Pinata (IPFS Pinning)

## Prerequisites

*   Node.js (v18+) & npm (or yarn/pnpm)
*   Web3 Wallet (e.g., MetaMask)
*   [Pinata Account](https://pinata.cloud) (for Free plan or higher to get JWT)
*   [Vercel Account](https://vercel.com) (for deployment, Serverless Functions, KV, Blob)

## Getting Started

1.  **Use the Template:** Click the "Use this template" button on GitHub or clone the repository.
2.  **Codespaces (Recommended):** Click "Open in Codespaces". The environment will set up automatically. Follow the on-screen prompts for the configuration wizard.
3.  **Local Setup:**
    *   Clone the repository: `git clone <your-repo-url>`
    *   Navigate into the directory: `cd <your-repo-name>`
    *   Install dependencies: `npm install`
    *   Create `.env` file: Copy `.env.template` to `.env`.
    *   **Important:** Edit `.env` and add your **secret** API keys (`PINATA_JWT`, `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `REDIS_URL`).
    *   Run the development server: `npm run dev`
    *   The Configuration Wizard will appear on the first run to set up contract addresses, network details, etc.

## Configuration

On the first run (or if configuration is missing), you will be prompted by a setup wizard:

1.  **Project Details:** Set the name and description for your dApp.
2.  **Network Config:** Enter the smart contract addresses and optionally other details for the networks you want to support.
3.  **Display Preferences:** Choose attributes to highlight (coming soon).
4.  **Review & Apply:** Confirm settings. The tool will attempt to save the configuration (using File System API if available locally, automatically in Codespaces, or providing files for manual download).

**Secrets (`.env` / Vercel Environment Variables):**
Remember, API keys for Pinata and Vercel KV **must** be configured manually in your `.env` file (for local development) or as Environment Variables in your Vercel project settings (for deployment). The wizard cannot handle these secrets.

## Deployment

Deploy easily using the Vercel button above or via the Vercel CLI. Ensure you set up the required Environment Variables (Pinata, KV) in your Vercel project settings.

## Contributing

[Details on contributing...] <!-- TODO: Add contribution guidelines if applicable -->

## License

[Your License - e.g., MIT] <!-- TODO: Choose and add a license -->