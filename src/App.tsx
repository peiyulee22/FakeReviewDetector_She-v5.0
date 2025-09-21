import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ReviewAnalysis from "./pages/ReviewAnalysis";          // shop aggregate
import PageReviewAnalysis from "./pages/PageReviewAnalysis";  // single review
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/aboutus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analyze" element={<ReviewAnalysis />} />
            <Route path="/page-review-analyze" element={<PageReviewAnalysis />} />
            <Route path="/aboutus" element={<AboutUs />} />
            {/* Optional alias: if you ever navigate to /review-analyze */}
            <Route path="/review-analyze" element={<PageReviewAnalysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
