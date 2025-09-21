import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
          About Us
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8">
          Welcome to our platform! We are passionate about delivering accurate AI-powered insights to help users detect fake reviews and make informed decisions.
        </p>

        <Button
          onClick={() => navigate("/")} // <- navigates to main page
          className="mt-6"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default AboutUs;
