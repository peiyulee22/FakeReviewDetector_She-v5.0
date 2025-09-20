import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_URL =
  "https://8nqr385rbd.execute-api.us-east-1.amazonaws.com/Testing1/DetectReview";

const Home = () => {
  const [inputMethod, setInputMethod] = useState<"text" | "shop">("text");
  const [reviewText, setReviewText] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (
      (!reviewText && inputMethod === "text") ||
      (!shopName && inputMethod === "shop")
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const payload =
        inputMethod === "text"
          ? { review: reviewText.trim() }
          : { shopName: shopName.trim() };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = { error: "Invalid response from server" };
      }

      if (!res.ok) {
        navigate("/analyze", {
          state: {
            error: true,
            message: data?.error || `Request failed (${res.status})`,
          },
        });
        return;
      }

      // Success → pass API payload to analysis page
      navigate("/analyze", { state: data });
    } catch (e: any) {
      navigate("/analyze", {
        state: { error: true, message: String(e?.message || e) },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-2xl text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
            Uncover the Truth in Reviews
          </h2>
          <p
            className="text-lg text-foreground-secondary mb-8 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Our AI analyzes reviews to detect fakes. Choose your input method
            below.
          </p>

          <div
            className="flex justify-center gap-4 mb-6 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <button
              onClick={() => setInputMethod("text")}
              className={`px-6 py-3 rounded-lg text-lg font-bold shadow-md transition-all transform hover:scale-105 ${
                inputMethod === "text"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground-secondary hover:bg-primary/10"
              }`}
            >
              Paste Review Text
            </button>
            <button
              onClick={() => setInputMethod("shop")}
              className={`px-6 py-3 rounded-lg text-lg font-bold shadow-md transition-all transform hover:scale-105 ${
                inputMethod === "shop"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground-secondary hover:bg-primary/10"
              }`}
            >
              Search Shop
            </button>
          </div>

          <div
            className="w-full bg-card/50 p-2 rounded-xl shadow-xl card-shadow animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            {inputMethod === "text" ? (
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full h-40 p-4 bg-background rounded-lg resize-none text-base placeholder:text-foreground-muted focus:outline-none input-glow border-0"
                placeholder="Paste a review text here..."
              />
            ) : (
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-4 bg-background rounded-lg text-base placeholder:text-foreground-muted focus:outline-none input-glow border-0"
                placeholder="Enter shop name... e.g., The Italian Corner"
                type="text"
              />
            )}
          </div>

          <div
            className="mt-6 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <button
              onClick={handleAnalyze}
              disabled={
                isLoading ||
                (!reviewText && inputMethod === "text") ||
                (!shopName && inputMethod === "shop")
              }
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-bold shadow-xl hover:bg-accent-hover transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          <div
            className="mt-8 text-sm text-foreground-muted h-6 flex items-center justify-center space-x-2 animate-slide-up"
            style={{ animationDelay: "0.5s" }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p>Analyzing reviews with AI...</p>
              </>
            ) : (
              <p>Ready to analyze reviews</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;