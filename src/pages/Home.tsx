import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

// Use your correct API URL here (with stage if needed)
const API_URL = "https://rxfogy5lti.execute-api.us-east-1.amazonaws.com/analyze";

type Place = {
  name: string;       // Canonical name as stored in DB
  area?: string;      // Optional locality
  place_id?: string;  // Optional Place ID from DB
};

const Home = () => {
  const [inputMethod, setInputMethod] = useState<"text" | "shop">("text");
  const [reviewText, setReviewText] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState<string | null>(null);

  const navigate = useNavigate();

  /** ----------------------------------------------------------------
   * In production, fetch these from your DB (DynamoDB/Places dump).
   * index        -> list of canonical places
   * aliasIndex   -> alias/shortcut -> canonical place
   * ---------------------------------------------------------------- */
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

    // Aliases → canonical (add as many as you want; later load from DB)
    const aliases: Record<string, Place> = {
      "mcd":          { name: "McDonald's", area: "KLCC" },
      "mcdonald":     { name: "McDonald's", area: "KLCC" },
      "mcdonalds":    { name: "McDonald's", area: "KLCC" },
      "mcdonald's":   { name: "McDonald's", area: "KLCC" },
      "burger lab":   { name: "myBurgerLab", area: "Seapark" },
      "myburgerlab":  { name: "myBurgerLab", area: "Seapark" },
      "burgerlab":    { name: "BurgerLab", area: "SS15" },
      "zanmai":       { name: "Sushi Zanmai", area: "Mid Valley" },
      "italian corner": { name: "The Italian Corner", area: "Bukit Bintang" },
      // add more…
    };
    setAliasIndex(aliases);
  }, []);

  // --- Matching utilities (no dependencies) ---
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[’`“”]/g, "'")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/\s+/g, " ")
      .trim();

  // Classic Levenshtein
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

  // Similarity ratio
  const similarity = (a: string, b: string): number => {
    if (!a && !b) return 1;
    const d = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length) || 1;
    return 1 - d / maxLen;
  };

  /** Fuzzy near-exact from the canonical index */
  const findNearExact = (qRaw: string): Place | null => {
    const q = normalize(qRaw);
    if (!q) return null;

    // Direct normalized equality
    const eq = index.find((p) => normalize(p.name) === q);
    if (eq) return eq;

    const ACCEPT_DISTANCE = 2;
    const ACCEPT_RATIO = 0.90;
    const AMBIGUITY_GAP = 0.06;

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

  /** Canonical resolver:
   * 1) Alias table (exact on normalized string)
   * 2) Near-exact fuzzy over canonical list
   */
  const resolveCanonical = (q: string): Place | null => {
    const key = normalize(q);
    if (aliasIndex[key]) return aliasIndex[key];
    return findNearExact(q);
  };

  const handleAnalyze = async (override?: { shopName?: string; reviewText?: string; place_id?: string }) => {
    const review = (override?.reviewText ?? reviewText).trim();
    let shop = (override?.shopName ?? shopName).trim();
    let place_id = override?.place_id;

    if (
      (inputMethod === "text" && !override?.reviewText && !review) ||
      (inputMethod === "shop" && !override?.shopName && !shop)
    ) {
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

      const payload =
        inputMethod === "text"
          ? { reviewText: review }
          : { shopName: shop, place_id };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Robust parsing (JSON or double-encoded)
      let raw = "";
      let data: any = null;
      try {
        raw = await res.text();
        data = JSON.parse(raw);
      } catch {
        try {
          data = JSON.parse(JSON.parse(raw));
        } catch {
          data = null;
        }
      }
      if (!data) data = { error: "Invalid response from server" };

      if (!res.ok) {
        try { sessionStorage.setItem("analysis", JSON.stringify(data)); } catch {}
        navigate("/analyze", {
          state: {
            error: true,
            message: data?.error || `Request failed (${res.status})`,
            data,
          },
        });
        return;
      }

      try { sessionStorage.setItem("analysis", JSON.stringify(data)); } catch {}
      navigate("/analyze", { state: { data } });
    } catch (e: any) {
      navigate("/analyze", {
        state: { error: true, message: String(e?.message || e) },
      });
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
                  placeholder="Enter shop name... e.g., mcd, myburgerlab, zanmai"
                  type="text"
                  aria-label="Shop name"
                />

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
