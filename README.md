# NFT Gallery & 1-of-1 Minting dApp Template

Create and manage your own unique NFT showcase and minting platform with an easy-to-use setup wizard. Designed for artists, creators, and developers looking for a quick and configurable start.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<YOUR_USERNAME>%2F<YOUR_REPO_NAME>&project-name=my-nft-gallery&framework=vite&env=PINATA_JWT,KV_URL,KV_REST_API_URL,KV_REST_API_TOKEN,KV_REST_API_READ_ONLY_TOKEN,REDIS_URL&envDescription=Required%20for%20IPFS%20and%20large%20file%20uploads.) <!-- TODO: Update YOUR_USERNAME/YOUR_REPO_NAME -->
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/<YOUR_USERNAME>/<YOUR_REPO_NAME>) <!-- TODO: Update YOUR_USERNAME/YOUR_REPO_NAME -->
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

<!-- Optional: Add a link to a live demo if you deploy one -->
<!-- **[Live Demo (Template Example)](YOUR_DEMO_LINK_HERE)** -->

## Table of Contents

*   [Introduction: What is This?](#introduction-what-is-this)
*   [Who is This For?](#who-is-this-for)
*   [Key Features](#key-features)
*   [How it Works: The Setup Process](#how-it-works-the-setup-process)
*   [Getting Started: Choose Your Path](#getting-started-choose-your-path)
    *   [GitHub Codespaces (Recommended)](#github-codespaces-recommended)
    *   [Local Development (Your Computer)](#local-development-your-computer)
*   [The Configuration Wizard: Your Control Panel](#the-configuration-wizard-your-control-panel)
*   [Essential Secrets: Manual Configuration Required!](#essential-secrets-manual-configuration-required)
*   [Deploying Your dApp](#deploying-your-dapp)
*   [Technology Stack](#technology-stack)
*   [Contributing](#contributing)
*   [License](#license)

## Introduction: What is This?

This project is a **configurable template** that lets you quickly set up and personalize your very own NFT (Non-Fungible Token) gallery and minting platform. It's built with modern web technologies (React, Vite, Tailwind CSS) and connects to Ethereum-compatible blockchains (like Ethereum, Polygon, Base, and their testnets) using Ethers.js.

**Key Benefits:**

*   **Easy Setup:** A step-by-step web wizard guides you through the initial configuration.
*   **No Coding (for Basic Setup):** Get your platform running with your branding and contract details without needing to write code for the main settings.
*   **Own Your Platform:** Host it yourself, connect your own smart contracts, and control your digital assets.
*   **Flexible:** Supports multiple blockchain networks, allows for custom network additions, and offers various customization options.
*   **Modern Tooling:** Uses efficient tools for a smooth development experience and a fast user interface.

## Who is This For?

*   **Artists & Creators:** Easily showcase and mint your digital art as NFTs.
*   **NFT Project Owners:** Quickly deploy a gallery and minting page for your collection.
*   **Developers:** Get a head start on building a custom NFT platform with a solid foundation.

## Key Features

*   **NFT Gallery:** Dynamically browse minted NFTs from your configured smart contracts on various networks.
*   **NFT Minting:** A dedicated interface for an authorized minter (set by the contract owner) to create new NFTs.
*   **Owner Panel:** Secure section for the contract owner to manage critical settings like the authorized minter address and the base URI for metadata.
*   **Metadata Creation Tool:** Prepare your NFT metadata (name, description, attributes) and upload associated images (including large files via chunking) to IPFS through Pinata.
*   **Multi-Chain Support:** Pre-configured for popular networks like Ethereum, Polygon, Base, and their testnets (Sepolia, Amoy). Easily add custom EVM-compatible networks.
*   **Configuration Wizard:** An intuitive web-based wizard for first-time setup, guiding you through project details, network settings, and display preferences.
*   **Environment Support:**
    *   **GitHub Codespaces:** One-click setup in a fully configured cloud development environment.
    *   **Local Development:** Run and configure on your own machine. Supports direct saving to your project folder via the File System Access API (in compatible browsers) or manual file download.
*   **Customizable:** Change project name, descriptions, and eventually more display aspects.
*   **Secure Secret Management:** Clear guidance on handling sensitive API keys and RPC URLs via `.env` files or secure environment variable stores (Codespaces Secrets, Vercel Environment Variables).

## How it Works: The Setup Process

1.  **Get the Template:** Start by using this repository as a template on GitHub or by cloning it.
2.  **Set Up Secrets:** Before running the app, you'll need to configure essential secret API keys (for Pinata, Vercel KV) in your chosen environment (local `.env` file, Codespaces Secrets, or Vercel Environment Variables).
3.  **Run the Application:** Start the development server.
4.  **Configuration Wizard:** On the first run, a wizard will appear, guiding you to input your project's name, your smart contract addresses for different networks, and other preferences.
5.  **Apply & Save:** The wizard will help you save this configuration.
6.  **Launch!** Your personalized dApp is ready.

## Getting Started: Choose Your Path

There are a couple of ways to get your dApp up and running:

### GitHub Codespaces (Recommended)

This is the quickest way to get a fully working development environment without installing anything on your computer.

1.  **Open in Codespaces:** Click the "Open in GitHub Codespaces" badge at the top of this README. GitHub will prepare a development environment for you in the cloud.

2.  **Automatic Setup:** The Codespace will automatically:
    *   Clone the repository.
    *   Install all necessary dependencies (`npm install`).
    *   Start the development server (`npm run dev`).

3.  **Configure Secrets:**
    *   Once the Codespace is running, you **MUST** add your essential API keys as Codespaces Secrets.
    *   Go to your new repository's page on GitHub.
    *   Navigate to `Settings` > `Secrets and variables` (in the left sidebar) > `Codespaces`.
    *   Click "New repository secret" for each secret listed in the "[Essential Secrets](#essential-secrets-manual-configuration-required)" section below (e.g., `PINATA_JWT`, `KV_URL`, `VITE_ETHEREUM_RPC_URL` if you have a private one).
    *   After adding secrets, you may need to **rebuild your Codespace** for the changes to be fully applied to the running server. (Click the Codespaces icon in VS Code bottom-left > "Rebuild Container").

4.  **Access the Wizard:** Open the application in the browser preview within Codespaces. The Setup Wizard will appear to guide you through the rest of the configuration.

5.  **Apply Configuration:** The wizard will save your settings directly within the Codespace environment. The page will reload, and your dApp will be ready!

### Local Development (Your Computer)

1.  **Prerequisites:**
    *   [Node.js](https://nodejs.org/) (v18 or newer recommended)
    *   npm (comes with Node.js) or [Yarn](https://yarnpkg.com/) or [pnpm](https://pnpm.io/)
    *   [Git](https://git-scm.com/)

2.  **Get the Code:**
    *   Click "Use this template" on GitHub to create your own repository from this template.
    *   Clone your new repository: `git clone https://github.com/<YOUR_USERNAME>/<YOUR_NEW_REPO_NAME>.git`
    *   Navigate into the project folder: `cd <YOUR_NEW_REPO_NAME>`

3.  **Install Dependencies:** `npm install` (or `yarn install` / `pnpm install`)

4.  **Configure Secrets in `.env` File:**
    *   Find the file named `.env.template` in the main project folder.
    *   **Make a copy of this file and rename the copy to `.env`**.
    *   Open your new `.env` file with a text editor.
    *   Fill in the required values for `PINATA_JWT`, `KV_URL`, etc., as detailed in the "[Essential Secrets](#essential-secrets-manual-configuration-required)" section below.
    *   If you have private RPC URLs with API keys, add them here as well (e.g., `VITE_ETHEREUM_RPC_URL=https://...`).

5.  **Run the Development Server:** `npm run dev`

6.  **Configuration Wizard:** Open your browser to `http://localhost:8080` (or the port shown in your terminal). The Setup Wizard will guide you.

7.  **Apply Configuration:**
    *   **If your browser supports it (Chrome, Edge, Brave):** The wizard may prompt you to "Save to Project Folder." Select the **root directory** of your local project. The config file will be saved to `public/projectConfig.json`, and the app will reload.
    *   **Otherwise:** The wizard will prompt you to "Download Config File." Download `projectConfig.json`, manually move it into the `public/` folder inside your project, and then **restart your development server** (`Ctrl+C` in the terminal, then `npm run dev`).

## The Configuration Wizard: Your Control Panel

When you first run the application, or if the configuration is missing, a setup wizard will appear. It consists of the following steps:

1.  **Project Details:**
    *   **Project Name:** The name of your dApp/gallery (e.g., "My Amazing Art"). This appears in the header and footer.
    *   **Project Description (Optional):** A short description for your project.

2.  **Network Configuration:**
    *   For common networks (Ethereum, Sepolia, etc.), key details like Chain ID, Symbol, and public RPC/Explorer URLs are pre-filled with sensible defaults. You typically only **need to enter your Smart Contract Address** for each network you plan to use. Other fields can be left as is to use the defaults, or you can override them.
    *   The wizard will guide you to enter the RPC URL. **For RPC URLs containing private API keys, it is strongly recommended to set these in your `.env` file (local) or Codespaces/Vercel Secrets for better security.** The application will prioritize these secure settings if they exist.
    *   You can also **Add Custom Network Chains** if you use a blockchain not on the default list, for which you'll need to provide all essential details (Name, Chain ID, RPC URL, Symbol, Contract Address).
    *   For each network configuration:
        *   **Contract Address:** The deployed address of your NFT smart contract on that specific network. This is crucial for the dApp to find your NFTs. Enter `UNUSED` or leave blank if you don't have a contract on a particular network.
        *   **Display Name:** How the network will appear in dropdowns (e.g., "Ethereum Mainnet"). Defaults are provided.
        *   **Chain ID:** The unique numeric ID for the blockchain (e.g., `1` for Ethereum).
        *   **RPC URL:** The connection link to the blockchain. Public ones are often okay for reading data.
        *   **Currency Symbol:** The blockchain's native currency (e.g., ETH, MATIC).
        *   **Block Explorer URL (Optional):** Link to a site like Etherscan for viewing transactions.
        *   **Owner Only UI:** Restrict visibility of this network in the UI to only the contract owner.

3.  **Display Preferences:**
    *   **Primary Attribute (Optional):** Specify an attribute `trait_type` from your NFT metadata (e.g., "Edition", "Year Created") that you want to be highlighted on the gallery cards.

4.  **Review & Apply:**
    *   A summary of all your entered settings.
    *   Click "Apply" to save the configuration. Depending on your environment (local browser capabilities, Codespaces), this will either:
        *   Save `projectConfig.json` directly to your project's `public/` folder (FS API).
        *   Save `projectConfig.json` to your Codespace workspace (requires Codespaces save mechanism to be fully implemented).
        *   Prompt you to download `projectConfig.json` (manual method). You'll then need to place it in `public/` and restart your server.

## Essential Secrets: Manual Configuration Required!

For the dApp to fully function (especially for features like uploading images, handling large files, and reliably connecting to blockchains for transactions), you **MUST** manually configure the following secret keys and private URLs. The wizard cannot handle these for security reasons.

**Where to set these secrets:**

*   **Local Development (your computer):** Create a file named `.env` in the main project folder (by copying `.env.template` and renaming it) and add the values there.
*   **GitHub Codespaces:** Go to your repository settings on GitHub -> `Settings` > `Secrets and variables` (in the left sidebar) > `Codespaces`. Add each as a "New repository secret".
*   **Vercel Deployment (or other hosting):** Add these as "Environment Variables" in your Vercel project settings (or your hosting provider's equivalent).

**Required Secrets (Refer to `.env.template` for variable names):**

1.  **Pinata (for IPFS Image/Metadata Uploads):**
    *   `PINATA_JWT`: Your Pinata JWT (JSON Web Token). Used to securely upload NFT images/metadata to IPFS via Pinata.
    *   **How to get it:**
        1.  Sign up/Log in to [Pinata.cloud](https://pinata.cloud).
        2.  Navigate to "API Keys" in your Pinata account.
        3.  Create a new API Key. Ensure it has permissions for `pinFileToIPFS` and `pinJSONToIPFS`.
        4.  Choose JWT as the type and copy the generated JWT string.

2.  **Vercel KV (for Large File Upload Support - Used by default Metadata Creator):**
    *   `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `REDIS_URL`
    *   These are needed by the serverless functions that handle chunked (large) file uploads for the metadata creator.
    *   **How to get them:** In your Vercel dashboard, create a KV store. Connection details are in the store's settings. See [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv/quickstart).

3.  **RPC URLs (Especially with API Keys):**
    *   **For reliable and secure blockchain connections, it is STRONGLY RECOMMENDED to set your primary RPC URLs (especially those containing private API keys from services like Infura, Alchemy, etc.) as environment variables.**
    *   **Variable Name Format:** `VITE_<NETWORK_KEY>_RPC_URL` (e.g., `VITE_ETHEREUM_RPC_URL`, `VITE_SEPOLIA_RPC_URL`).
    *   **How it Works:** The application will *always* use an RPC URL from your environment variables (`.env` file locally, Codespaces Secrets, or Vercel Environment Variables) if it's set for a network.
    *   **Wizard's RPC Field:** You can optionally enter a public/fallback RPC URL in the wizard for a network. This wizard-entered URL will only be used if the corresponding `VITE_<NETWORK_KEY>_RPC_URL` is NOT set in your environment. This field is primarily for users who might not have a private RPC key yet or are using a truly public (keyless) endpoint.
    *   **Security:** This approach keeps your private API keys out of the `projectConfig.json` file, which is safer if your project configuration might be shared or committed.

**Ensure these secrets are correctly set up in the appropriate environment before expecting all features to work!**

## Deploying Your dApp

We recommend deploying to [Vercel](https://vercel.com) for its ease of use with Vite projects and serverless functions.

1.  **Push to GitHub:** Make sure your configured project (including your `projectConfig.json` in the `public` folder) is pushed to your GitHub repository.

2.  **Import to Vercel:**
    *   Click the "Deploy with Vercel" button at the top of this README, or
    *   Go to your Vercel dashboard, click "Add New..." -> "Project".
    *   Select your GitHub repository.

3.  **Configure Project:**
    *   Vercel should automatically detect it as a Vite project.
    *   **Crucially: Add Environment Variables.** Go to your new Vercel project's "Settings" -> "Environment Variables." Add all the secrets listed in the "[Essential Secrets](#essential-secrets-manual-configuration-required)" section (e.g., `PINATA_JWT`, `KV_URL`, `VITE_ETHEREUM_RPC_URL` if you're using a private one for your deployed app).

4.  **Deploy!** Vercel will build and deploy your application.

## Technology Stack

*   **Frontend:** React (with Vite for fast bundling and development)
*   **Blockchain Interaction:** Ethers.js v5
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui (built on Radix UI)
*   **Routing:** React Router DOM
*   **Backend (for IPFS/Uploads):** Vercel Serverless Functions
*   **Large File Uploads:** Vercel KV (Redis) & Vercel Blob for chunked uploads
*   **IPFS Pinning:** Pinata

## Contributing

This project is open source. If you'd like to contribute, please:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Submit a pull request with a clear description of your changes.

<!-- TODO: Add more specific contribution guidelines if needed -->

## License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPLv3).

You may use, modify, and distribute this software under the terms of the AGPLv3 license. If you deploy a modified version of this application as a service, you are required to make your source code available to users of that service under the same license.

See the [LICENSE](./LICENSE) file for the full license text.