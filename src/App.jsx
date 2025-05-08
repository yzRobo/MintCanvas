// src/App.jsx
import React from 'react'; // Ensure React is imported
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useConfig } from './contexts/ConfigContext'; // Import the hook
import SetupWizard from './config-tool/SetupWizard'; // Import the wizard

// Import Layout and Page Components (remain the same)
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Mint from "@/pages/Mint";
import Owner from "@/pages/Owner";
import Gallery from "@/pages/Gallery";
import CreateMetadata from "@/pages/CreateMetadata";
import { Loader2 } from 'lucide-react'; // Import Loader icon

const queryClient = new QueryClient();

// Renaming the core app part for clarity
const MainApp = () => (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Routes wrapped by the Layout component */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/owner" element={<Owner />} />
            <Route path="/create-metadata" element={<CreateMetadata />} />
          </Route>
          {/* Other routes outside Layout if needed */}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

const App = () => {
  const { isConfigured, isLoading, error } = useConfig(); // Keep error here for logging/debugging if needed

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If loading is done, render Wizard if not configured, otherwise the Main App
  // This now catches cases where loading finished but resulted in an error state,
  // effectively treating load errors the same as 'not configured'.
  if (!isConfigured) {
    // Log the error here if you want developers to see it easily without opening console
    if (error) {
        console.error("ConfigContext reported an error, showing SetupWizard:", error);
    }
    return <SetupWizard />;
  }

  // If configured and no longer loading, render the main application structure
  return (
    <QueryClientProvider client={queryClient}>
      {/* NetworkProvider needs to be INSIDE the configured app part */}
      <MainApp />
    </QueryClientProvider>
  );
};

export default App;