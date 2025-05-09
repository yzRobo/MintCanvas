// src/App.jsx
import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"; // Main ThemeProvider
import { useConfig } from './contexts/ConfigContext';
import SetupWizard from './config-tool/SetupWizard';

import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Mint from "@/pages/Mint";
import Owner from "@/pages/Owner";
import Gallery from "@/pages/Gallery";
import CreateMetadata from "@/pages/CreateMetadata";
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

const MainApp = () => (
  // This ThemeProvider is for the fully configured app
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <TooltipProvider>
      <Toaster /> {/* This Toaster also benefits from ThemeProvider */}
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/owner" element={<Owner />} />
            <Route path="/create-metadata" element={<CreateMetadata />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

const App = () => {
  const { isConfigured, isLoading, error } = useConfig();

  if (isLoading) {
    return (
      // Wrap loader in ThemeProvider too so it respects theme if possible, or just basic styling
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme-setup">
         <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      </ThemeProvider>
    );
  }

  if (!isConfigured) {
    if (error) {
        console.error("ConfigContext reported an error during load, showing SetupWizard:", error);
    }
    // Wrap SetupWizard with its own ThemeProvider instance
    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme-setup"> {/* Can use a different storageKey or same */}
        <SetupWizard />
      </ThemeProvider>
    );
  }

  // If configured and no longer loading, render the main application structure
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
};

export default App;