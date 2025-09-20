import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_URL =
  "https://8nqr385rbd.execute-api.us-east-1.amazonaws.com/Testing1/DetectReview";

type Recommendation = "positive" | "neutral" | "negative";

interface AnalysisData {
  shopName: string;
  fakePercentage: number;   // 0..100
  sentimentScore: number;   // e.g., 8.2 / 10
  reviewsAnalyzed: number;
  recommendation: Recommendation;
  pros: string[];
  cons: string[];
}

// --- tiny helpers ---
function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  const opts = { ...options, signal: controller.signal, cache: "no-store" as const };
  return fetch(url, opts).finally(() => clearTimeout(t));
}

// Map your backend JSON into the UI shape.
// Adjust this to match your real API payload.
function mapBackendToUI(json: any): AnalysisData {
  // Example defensive mapping (edit to your fields)
  const shopName = json?.shopName || json?.shop || "Unknown Shop";
  const fakePercentage =
    typeof json?.fakePercentage === "number"
      ? Math.round(json.fakePercentage)
      : typeof json?.detection?.score === "number"
      ? Math.max(0, Math.min(100, json.detection.score))
      : 0;

  const sentimentScore =
    typeof json?.sentimentScore === "number"
      ? json.sentimentScore
      : json?.sentiment?.score ?? 7.5;

  const reviewsAnalyzed =
    typeof json?.reviewsAnalyzed === "number" ? json.reviewsAnalyzed : json?.count ?? 1;

  const recommendation: Recommendation =
    (json?.recommendation as Recommendation) ||
    (fakePercentage >= 50 ? "negative" : fakePercentage >= 20 ? "neutral" : "positive");

  const pros: string[] =
    Array.isArray(json?.pros) && json.pros.length
      ? json.pros
      : ["Friendly service", "Good value", "Clean environment"];

  const cons: string[] =
    Array.isArray(json?.cons) && json.cons.length
      ? json.cons
      : fakePercentage > 0
      ? ["Possible review manipulation"]
      : ["Gets crowded on weekends"];

  return {
    shopName,
    fakePercentage,
    sentimentScore,
    reviewsAnalyzed,
    recommendation,
    pros,
    cons,
  };
}

export default function ReviewAnalysis() {
  const { state } = useLocation() as { state?: any };
  const navigate = useNavigate();

  // If Home already provided final API data, use it immediately.
  const preData = state?.data ? mapBackendToUI(state.data) : null;
  // If Home navigated with a payload for this page to fetch, grab it.
  const payload = useMemo(() => state?.payload || null, [state]);

  const [data, setData] = useState<AnalysisData | null>(preData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have data (state.data), nothing else to do.
    if (data) return;

    // If there is no payload from Home and no preData, we can’t fetch.
    if (!payload) {
      setError("Missing request data");
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await fetchWithTimeout(
          API_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          5000 // hard 5s cap
        );

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          json = { error: "Invalid response" };
        }

        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) setError("Restaurant not found");
          } else {
            if (isMounted) setError(json?.error || `Request failed (${res.status})`);
          }
          return;
        }

        if (isMounted) setData(mapBackendToUI(json));
      } catch (e: any) {
        const msg = e?.name === "AbortError" ? "Request timed out" : "Network error";
        if (isMounted) setError(msg);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [payload, data]);

  const back = () => navigate("/");

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Loading */}
        {!data && !error && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold">Analyzing Reviews…</h2>
            <p className="text-foreground-secondary">This should take just a moment.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto text-center bg-card p-6 rounded-xl border border-card-border card-shadow">
            <h2 className="text-2xl font-bold mb-2">We couldn’t analyze that</h2>
            <p className="text-foreground-secondary mb-4">{error}</p>
            <button onClick={back} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg">
              Try again
            </button>
          </div>
        )}

        {/* Data */}
        {data && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <header className="text-center animate-fade-in">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Review Analysis</h1>
              <p className="text-foreground-secondary mt-2">
                Insights for <span className="font-semibold">{data.shopName}</span>
              </p>
            </header>

            {/* Stats */}
            <section
              className="bg-card p-6 rounded-xl border border-card-border card-shadow animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-destructive">{data.fakePercentage}%</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Fake Reviews</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <div className="flex items-center text-success">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2A8,8 0 0,0 6,10A8,8 0 0,0 14,18A8,8 0 0,0 22,10A8,8 0 0,0 14,2M14,16A6,6 0 0,1 8,10A6,6 0 0,1 14,4A6,6 0 0,1 20,10A6,6 0 0,1 14,16M10.5,7.5L13.5,10.5L18.5,5.5L19.9,6.9L13.5,13.3L9.1,8.9L10.5,7.5Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground-muted mt-2">
                    {data.recommendation === "negative"
                      ? "Be cautious"
                      : data.recommendation === "neutral"
                      ? "Mixed signals"
                      : "Worth a Go!"}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-primary">{data.sentimentScore}/10</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Sentiment Score</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-primary">{data.reviewsAnalyzed}</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Reviews Analyzed</p>
                </div>
              </div>
            </section>

            {/* Pros/Cons */}
            <section className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                Sentiment Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
                  <h4 className="font-bold text-lg text-success flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V11H19V21H5V3H13V7A2,2 0 0,0 15,9H21Z" />
                    </svg>
                    Pros
                  </h4>
                  <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                    {data.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
                  <h4 className="font-bold text-lg text-destructive flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M12,15C13.1,15 14,15.9 14,17C14,18.1 13.1,19 12,19C10.9,19 10,18.1 10,17C10,15.9 10.9,15 12,15M13,7H11V13H13" />
                    </svg>
                    Cons
                  </h4>
                  <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                    {data.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div className="flex justify-center pt-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={back}
                className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-lg hover:bg-accent-hover transition-all transform hover:scale-105 flex items-center gap-2 shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
                </svg>
                Analyze Another Shop
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
