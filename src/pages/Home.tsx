import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_URL = "https://rxfogy5lti.execute-api.us-east-1.amazonaws.com/analyze";

type Place = {
  name: string;
  area?: string;
  place_id?: string;
};

type Risk = "low" | "medium" | "high";

/* ---------------- Map Lambda -> UI format ---------------- */
function mapApiToAnalysisData(resp: any) {
  const fakePct = Number(resp.fakePercentage ?? 0);
  const risk: Risk = fakePct >= 60 ? "high" : fakePct >= 30 ? "medium" : "low";

 const englishFromAnyField =
    (typeof resp.englishText === "string" && resp.englishText.trim()) ||
    (typeof resp.englishForBedrock === "string" && resp.englishForBedrock.trim()) ||
    (typeof resp.translatedForBedrock === "string" && resp.translatedForBedrock.trim()) ||
    "";

  return {
    reviewText: resp.reviewText || "",
    isFake: fakePct >= 60,
    confidence: Math.round(fakePct),
    sentimentScore: Number(resp.sentimentScore ?? 5.0),
    keyIndicators: [...(resp.keyPhrases ?? []), ...(resp.signals ?? [])].slice(0, 6),
    aiAnalysis: resp.verdict ? `Verdict: ${resp.verdict}.` : "—",
    riskLevel: risk,

    detectedLanguage: resp.detectedLanguage ?? resp.language,
    // boolean flag: true if either the backend set a flag OR we found an English string
    translatedForBedrock: Boolean(resp.translatedForBedrock || englishFromAnyField),
    // actual English text we will show in UI
    englishText: englishFromAnyField,
  } as const;
}



const Home = () => {
  const [inputMethod, setInputMethod] = useState<"text" | "shop">("text");
  const [reviewText, setReviewText] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState<string | null>(null);
  const navigate = useNavigate();

  const [index, setIndex] = useState<Place[]>([]);
  const [aliasIndex, setAliasIndex] = useState<Record<string, Place>>({});

  useEffect(() => {
    const canonical: Place[] = [
      { name: "The Italian Corner", area: "Bukit Bintang" },
      { name: "Hawker Hall", area: "Petaling Jaya" },
      { name: "Sushi Zanmai", area: "Mid Valley" },
      { name: "myBurgerLab", area: "Seapark" },
      { name: "Chatime", area: "Pavilion" },
      { name: "McDonald's", area: "KLCC" },
      { name: "BurgerLab", area: "SS15" },
    ];
    setIndex(canonical);

    setAliasIndex({
      mcd: { name: "McDonald's", area: "KLCC" },
      mcdonald: { name: "McDonald's", area: "KLCC" },
      mcdonalds: { name: "McDonald's", area: "KLCC" },
      "mcdonald's": { name: "McDonald's", area: "KLCC" },
    });
  }, []);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFKC")
      .replace(/[’`“”]/g, "'")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = tmp;
      }
    }
    return dp[n];
  };

  const findNearExact = (qRaw: string): Place | null => {
    const q = normalize(qRaw);
    if (!q) return null;

    const eq = index.find((p) => normalize(p.name) === q);
    if (eq) return eq;

    const ACCEPT_DISTANCE = 2, ACCEPT_RATIO = 0.9, AMBIGUITY_GAP = 0.06;

    const scored = index.map((p) => {
      const n = normalize(p.name);
      const d = levenshtein(q, n);
      const r = 1 - d / Math.max(q.length, n.length || 1);
      return { item: p, dist: d, ratio: r };
    });

    scored.sort((a, b) => (b.ratio - a.ratio) || (a.dist - b.dist));

    const best = scored[0];
    if (!best) return null;
    if (best.ratio < ACCEPT_RATIO || best.dist > ACCEPT_DISTANCE) return null;

    if (scored.length > 1) {
      const second = scored[1];
      if (second && best.ratio - second.ratio < AMBIGUITY_GAP) return null;
    }
    return best.item;
  };

  const resolveCanonical = (q: string): Place | null => {
    const key = normalize(q);
    if (aliasIndex[key]) return aliasIndex[key];
    return findNearExact(q);
  };

  /* ---------------- Main handler ---------------- */
  const handleAnalyze = async (
    override?: { shopName?: string; reviewText?: string; place_id?: string }
  ) => {
    const review = (override?.reviewText ?? reviewText).trim();
    let shop = (override?.shopName ?? shopName).trim();
    let place_id = override?.place_id;

    if ((inputMethod === "text" && !override?.reviewText && !review) ||
        (inputMethod === "shop" && !override?.shopName && !shop)) {
      return;
    }

    setIsLoading(true);
    setResolvedDisplay(null);

    try {
      if (inputMethod === "shop") {
        const canonical = resolveCanonical(shop);
        if (canonical) {
          if (normalize(canonical.name) !== normalize(shop)) {
            setResolvedDisplay(`Interpreting as “${canonical.name}”`);
          }
          shop = canonical.name;
          place_id = place_id ?? canonical.place_id;
        }
      }

      const payload = inputMethod === "text" ? { reviewText: review } : { shopName: shop, place_id };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      let raw = "", api: any = null;
      try {
        raw = await res.text();
        api = JSON.parse(raw);
      } catch {
        try { api = JSON.parse(JSON.parse(raw)); } catch { api = null; }
      }
      if (!api) api = { error: "Invalid response from server" };

      if (!res.ok) {
        const errState = { error: true, message: api?.error || `Request failed (${res.status})`, data: api };
        navigate(inputMethod === "shop" ? "/analyze" : "/review-analyze", { state: errState });
        return;
      }

      if (inputMethod === "shop") {
        try { sessionStorage.setItem("analysis", JSON.stringify(api)); } catch {}
        navigate("/analyze", { state: { data: api } });
      } else {
        const analysisData = mapApiToAnalysisData(api);
        try { sessionStorage.setItem("analysisData", JSON.stringify(analysisData)); } catch {}
        navigate("/review-analyze", { state: { analysisData } });
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      const errState = { error: true, message: msg };
      navigate(inputMethod === "shop" ? "/analyze" : "/review-analyze", { state: errState });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDisabled =
    isLoading ||
    (inputMethod === "text" && !reviewText.trim()) ||
    (inputMethod === "shop" && !shopName.trim());

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-2xl text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
            Uncover the Truth in Reviews
          </h2>
          <p className="text-lg text-foreground-secondary mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Our AI analyzes reviews to detect fakes. Choose your input method below.
          </p>

          <div className="flex justify-center gap-4 mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => setInputMethod("text")}
              className={`px-6 py-3 rounded-lg text-lg font-bold shadow-md transition-all transform hover:scale-105 ${
                inputMethod === "text" ? "bg-primary text-primary-foreground" : "bg-card text-foreground-secondary hover:bg-primary/10"
              }`}
              aria-pressed={inputMethod === "text"}
            >
              Paste Review Text
            </button>
            <button
              onClick={() => setInputMethod("shop")}
              className={`px-6 py-3 rounded-lg text-lg font-bold shadow-md transition-all transform hover:scale-105 ${
                inputMethod === "shop" ? "bg-primary text-primary-foreground" : "bg-card text-foreground-secondary hover:bg-primary/10"
              }`}
              aria-pressed={inputMethod === "shop"}
            >
              Search Shop
            </button>
          </div>

          <div className="w-full bg-card/50 p-2 rounded-xl shadow-xl card-shadow animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {inputMethod === "text" ? (
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && reviewText.trim()) handleAnalyze();
                  }
                }}
                className="w-full h-40 p-4 bg-background rounded-lg resize-none text-base placeholder:text-foreground-muted focus:outline-none input-glow border-0"
                placeholder="Paste a review text here..."
                aria-label="Review text"
              />
            ) : (
              <div className="text-left">
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (!isLoading && shopName.trim()) handleAnalyze();
                    }
                  }}
                  className="w-full p-4 bg-background rounded-lg text-base placeholder:text-foreground-muted focus:outline-none input-glow border-0"
                  placeholder="Enter shop name... e.g., mcd, cc by mel, vcr"
                  type="text"
                  aria-label="Shop name"
                />

                {/* Suggestions dropdown */}
                {shopName && (
                  <ul className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {index
                      .filter((p) =>
                        p.name.toLowerCase().includes(shopName.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((p, i) => (
                        <li
                          key={i}
                          className="px-4 py-2 cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setShopName(p.name);
                            setResolvedDisplay(`Selected “${p.name}”`);
                          }}
                        >
                          {p.name}{" "}
                          {p.area && (
                            <span className="text-xs text-foreground-muted">
                              – {p.area}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                )}

                {resolvedDisplay && (
                  <div className="mt-2 text-xs text-foreground-muted">
                    {resolvedDisplay}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <button
              onClick={() => handleAnalyze()}
              disabled={analyzeDisabled}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-bold shadow-xl hover:bg-accent-hover transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          <div className="mt-8 text-sm text-foreground-muted h-6 flex items-center justify-center space-x-2 animate-slide-up" style={{ animationDelay: "0.5s" }}>
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
