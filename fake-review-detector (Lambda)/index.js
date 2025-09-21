// index.js — supports BOTH:
//  A) shopName  -> overall fake% by scoring each review and averaging
//  B) reviewText -> single-review fake% (multilingual via Comprehend + Translate)
// Handler: index.handler

import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { ComprehendClient, DetectDominantLanguageCommand, BatchDetectDominantLanguageCommand } from "@aws-sdk/client-comprehend";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { systemInstruction, buildUserPrompt } from "./bedrockPrompt.js";

/* ====== config ====== */
const REGION   = process.env.BEDROCK_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0";
const TABLE    = process.env.TABLE_NAME || "reviews";

const MIN_REVIEWS       = 3;
const CHUNK_SIZE        = 20;
const HARD_CAP_REVIEWS  = 400;
const SUMMARY_MAX_CHARS = 12000;
const TRANSLATE_TARGET  = process.env.TRANSLATE_TARGET_LANG || "en";

/* ====== clients ====== */
const bedrock    = new BedrockRuntimeClient({ region: REGION });
const ddb        = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const comprehend = new ComprehendClient({ region: REGION });
const translate  = new TranslateClient({ region: REGION });

/* ====== tolerant headers ====== */
const NAME_KEYS = [
  "name","shop","shopname","shop_name","place","place_name",
  "business","business_name","title","company","company_name"
];
const REVIEW_KEYS = [
  "review_text","reviewText","review text","review","text","content",
  "comment","body","snippet","opinion","Review Text","Reviews","review_body"
];

/* ====== helpers ====== */
const norm = s => (s ? String(s).toLowerCase().replace(/[^a-z0-9]/g, "") : "");
function editDistance(a,b){const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)dp[i][0]=i;for(let j=0;j<=n;j++)dp[0][j]=j;for(let i=1;i<=m;i++){for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c)}}return dp[m][n]}
function fuzzyMatch(a,b){if(!a||!b)return false;if(a.includes(b)||b.includes(a))return true;const d=editDistance(a,b);return (Math.max(a.length,b.length)<=8)?d<=1:d<=2}
function readField(obj,cands){const map=new Map(Object.keys(obj).map(k=>[k.toLowerCase().replace(/\s+/g,""),k]));for(const c of cands){const k=map.get(c.toLowerCase().replace(/\s+/g,""));if(k&&obj[k]!=null)return obj[k]}return undefined}
function cors(code, body) {
  return {
    statusCode: code,
    headers: {
      // correct content-type and explicit UTF-8
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
function extractJson(text){if(typeof text!=="string")return{};const m=text.match(/\{[\s\S]*\}$/);try{return JSON.parse(m?m[0]:text)}catch{return{} }}
const clamp=(n,lo,hi)=>Number.isFinite(+n)?Math.min(hi,Math.max(lo,+n)):0;

/* ====== language + translation helpers ====== */
async function detectLang(text){
  try{
    const out = await comprehend.send(new DetectDominantLanguageCommand({ Text:text }));
    const top = (out.Languages||[]).sort((a,b)=>(b.Score||0)-(a.Score||0))[0];
    return top?.LanguageCode || "en";
  }catch{return "en";}
}

async function detectLangBatch(texts){
  try{
    const out = await comprehend.send(new BatchDetectDominantLanguageCommand({ TextList:texts }));
    const codes = new Array(texts.length).fill("en");
    for(const r of out.ResultList||[]){
      const top=(r.Languages||[]).sort((a,b)=>(b.Score||0)-(a.Score||0))[0];
      if(top?.LanguageCode) codes[r.Index]=top.LanguageCode;
    }
    return codes;
  }catch{
    return new Array(texts.length).fill("en");
  }
}

/* ====== TRANSLATION (replaced) ====== */
async function translateIfNeeded(text, lang) {
  // If already English or no lang detected, don't translate
  if (!lang || /^en(-|$)/i.test(lang)) return { text, translated:false };

  // 1) Try Amazon Translate with detected language
  try {
    const out = await translate.send(
      new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: lang,            // e.g., "zh", "ja", "ko"
        TargetLanguageCode: TRANSLATE_TARGET // usually "en"
      })
    );
    const translatedText = out.TranslatedText || text;
    return { text: translatedText, translated: translatedText !== text };
  } catch (err) {
    console.error("Translate failed (detected lang:", lang, "):", err);
  }

  // 2) Retry letting Translate auto-detect the source
  try {
    const out2 = await translate.send(
      new TranslateTextCommand({
        Text: text,
        TargetLanguageCode: TRANSLATE_TARGET, // no SourceLanguageCode => auto-detect
      })
    );
    const translatedText = out2.TranslatedText || text;
    return { text: translatedText, translated: translatedText !== text };
  } catch (err2) {
    console.error("Translate auto-detect retry failed:", err2);
  }

  // 3) FINAL FALLBACK: Bedrock translation (works without NAT if Bedrock is reachable)
  try {
    const br = await bedrockTranslateToEn(text);
    return { text: br, translated: br !== text };
  } catch (err3) {
    console.error("Bedrock translate fallback failed:", err3);
    return { text, translated:false };
  }
}

async function bedrockTranslateToEn(text) {
  const prompt =
    "Translate this text to English. Return ONLY the translation with no extra words.\n\n" + text;

  const payload = {
    system: [{ text: "You are a precise translator. Output only the translation." }],
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 400, temperature: 0.0 }
  };

  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    })
  );

  const out = JSON.parse(new TextDecoder().decode(res.body));
  const translation = out?.output?.message?.content?.[0]?.text?.trim() || "";
  return translation || text;
}

/* ====== Bedrock calls ====== */
async function scoreBatch(modelId,batch){
  const numbered = batch.map((t, i) => `${i+1}. ${t}`).join("\n\n");
  const prompt = `
You are a review authenticity and sentiment scorer.
For EACH review below, return strict JSON:

{
  "fake_probs": [p1, p2, ...],  // 0.0 (definitely real) .. 1.0 (definitely fake)
  "sentiments": [s1, s2, ...]   // 0..10 per review
}

Rules: arrays MUST match the number & order of reviews. Numbers only. Return ONLY JSON.
REVIEWS:
${numbered}
  `.trim();

  const payload={system:[{text:systemInstruction}],messages:[{role:"user",content:[{text:prompt}]}],inferenceConfig:{maxTokens:400,temperature:0.0,topP:0.9}};
  const res=await bedrock.send(new InvokeModelCommand({modelId,contentType:"application/json",accept:"application/json",body:JSON.stringify(payload)}));
  const out=JSON.parse(new TextDecoder().decode(res.body));
  const text=out?.output?.message?.content?.[0]?.text ?? "";
  const obj=extractJson(text);
  return {
    fake_probs: Array.isArray(obj.fake_probs)?obj.fake_probs.map(Number):[],
    sentiments: Array.isArray(obj.sentiments)?obj.sentiments.map(Number):[]
  };
}

async function summarizeShop(modelId,shopName,reviews){
  let t=reviews.join("\n\n"); if(t.length>SUMMARY_MAX_CHARS)t=t.slice(0,SUMMARY_MAX_CHARS);
  const payload = {
    system: [{ text: systemInstruction }],
    messages: [{ role: "user", content: [{ text: `${buildUserPrompt({ shopName, reviewsText: t })}\n\nReturn ONLY the JSON.` }] }],
    inferenceConfig: { maxTokens: 500, temperature: 0.2, topP: 0.9 }
  };
  const res=await bedrock.send(new InvokeModelCommand({modelId,contentType:"application/json",accept:"application/json",body:JSON.stringify(payload)}));
  const out=JSON.parse(new TextDecoder().decode(res.body));
  const obj=extractJson(out?.output?.message?.content?.[0]?.text ?? "");
  return {
    recommendation: obj.verdict || "Mixed",
    pros: Array.isArray(obj.pros)?obj.pros.slice(0,4):[],
    cons: Array.isArray(obj.cons)?obj.cons.slice(0,4):[]
  };
}

async function scoreSingleReview(modelId,reviewText){
  const prompt = `
Classify ONE customer review for authenticity and sentiment.
Return ONLY this JSON:
{
  "fake_prob": <0..1>,
  "sentiment": <0..10>,
  "verdict": "Likely Fake" | "Unclear" | "Likely Real",
  "signals": ["short reason 1","short reason 2"]
}
Review:
${reviewText}
  `.trim();

  const payload={system:[{text:"You are a precise JSON-only classifier."}],messages:[{role:"user",content:[{text:prompt}]}],inferenceConfig:{maxTokens:250,temperature:0.0,topP:0.9}};
  const res=await bedrock.send(new InvokeModelCommand({modelId,contentType:"application/json",accept:"application/json",body:JSON.stringify(payload)}));
  const out=JSON.parse(new TextDecoder().decode(res.body));
  const obj=extractJson(out?.output?.message?.content?.[0]?.text ?? "");
  const fakeProb=clamp(obj.fake_prob,0,1);
  const sentiment=clamp(obj.sentiment,0,10);
  return {
    fakePercentage: Math.round(fakeProb*100),
    sentimentScore: +sentiment.toFixed(1),
    verdict: typeof obj.verdict==="string"?obj.verdict:"Unclear",
    signals: Array.isArray(obj.signals)?obj.signals.slice(0,4):[]
  };
}

/* ====== handler ====== */
export const handler = async (event) => {
  try {
    if (event?.requestContext?.http?.method === "OPTIONS") return cors(200,{});

    const body = typeof event?.body === "string" ? JSON.parse(event.body || "{}") : (event?.body || {});
    const reviewText = typeof body.reviewText === "string" ? reviewTextSan(body.reviewText) : "";
    const shopName   = typeof body.shopName   === "string" ? body.shopName.trim()   : "";

    // ---- Flow B: single review (now multilingual)
    if (reviewText) {
      const lang = await detectLang(reviewText);
      const { text: enText, translated } = await translateIfNeeded(reviewText, lang);
      const r = await scoreSingleReview(MODEL_ID, enText);
      return cors(200, { 
        reviewText,                 // original text
        detectedLanguage: lang,     // e.g. "zh"
        translatedForBedrock: translated, 
        englishText: translated ? enText : reviewText,  // always include something
        ...r 
      });
    }

    // ---- Flow A: shop aggregate
    if (!shopName) return cors(400, { message: "Provide either reviewText or shopName" });

    const target = norm(shopName);
    const matched = [];
    let lastKey;
    do {
      const page = await ddb.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey }));
      for (const row of (page.Items || [])) {
        const nameVal = readField(row, NAME_KEYS);
        if (!nameVal) continue;
        if (!fuzzyMatch(norm(String(nameVal)), target)) continue;
        const text = readField(row, REVIEW_KEYS);
        if (typeof text === "string" && text.trim()) {
          matched.push(text.trim());
          if (matched.length >= HARD_CAP_REVIEWS) break;
        }
      }
      lastKey = page.LastEvaluatedKey;
      if (matched.length >= HARD_CAP_REVIEWS) break;
    } while (lastKey);

    const reviewsAnalyzed = matched.length;
    if (reviewsAnalyzed < MIN_REVIEWS) {
      return cors(200, { shopName, fakePercentage:0, sentimentScore:0, reviewsAnalyzed, recommendation:"Not enough data", pros:[], cons:[] });
    }

    // language-detect all, translate non-EN to EN for Bedrock
    const langs = await detectLangBatch(matched);

    let sumFake=0,nFake=0,sumSent=0,nSent=0;
    for (let i=0;i<matched.length;i+=CHUNK_SIZE){
      const originalBatch = matched.slice(i,i+CHUNK_SIZE);
      const batchLangs    = langs.slice(i,i+CHUNK_SIZE);

      // translate if needed, item-by-item (Translate has no batch call)
      const englishBatch = [];
      for (let k=0;k<originalBatch.length;k++){
        const { text: enText } = await translateIfNeeded(originalBatch[k], batchLangs[k]);
        englishBatch.push(enText);
      }

      // Bedrock scoring on English
      const { fake_probs, sentiments } = await scoreBatch(MODEL_ID, englishBatch);
      for(const p of fake_probs){ if(Number.isFinite(p)){ sumFake+=p; nFake++; } }
      for(const s of sentiments){ if(Number.isFinite(s)){ sumSent+=s; nSent++; } }
    }

    const fakePercentage = nFake ? Math.round((sumFake/nFake)*100) : 0;
    const sentimentScore = nSent ? +(sumSent/nSent).toFixed(1) : 0;

    // summarize (send English too so the summary is coherent)
    const englishAll = [];
    for (let j=0;j<matched.length;j++){
      const { text: en } = await translateIfNeeded(matched[j], langs[j]);
      englishAll.push(en);
    }

    let recommendation="Mixed",pros=[],cons=[];
    try { ({recommendation,pros,cons}=await summarizeShop(MODEL_ID,shopName,englishAll)); } catch {}

    return cors(200, { shopName, fakePercentage, sentimentScore, reviewsAnalyzed, recommendation, pros, cons });

  } catch (err) {
    console.error("Analysis failed:", err);
    return cors(500, { message:"Analysis failed", error:String(err?.message||err) });
  }
};

// small input sanitizer to avoid stray BOM/whitespace causing lang-detect weirdness
function reviewTextSan(s) {
  return s.replace(/^\uFEFF/, "").trim();
}
