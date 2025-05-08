// src/App.jsx
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useConfig } from './contexts/ConfigContext';
import SetupWizard from './config-tool/SetupWizard';

// Import Layout and Page Components
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Mint from "@/pages/Mint";
import Owner from "@/pages/Owner";
import Gallery from "@/pages/Gallery";
import CreateMetadata from "@/pages/CreateMetadata";
import { Loader2 } from 'lucide-react';

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
  const { isConfigured, isLoading, error } = useConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center text-red-600">
        Error loading configuration: {error}
      </div>
    );
  }

  if (!isConfigured) {
    return <SetupWizard />;
  }

  // If configured, render the main application structure
  return (
    <QueryClientProvider client={queryClient}>
      {/* NetworkProvider needs to be INSIDE the configured app part
          because it relies on configuration which is only available
          when isConfigured is true. We'll add it back in main.jsx */}
      <MainApp />
    </QueryClientProvider>
  );
};

export default App;