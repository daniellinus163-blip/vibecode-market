import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchWebsiteKnowledge } from "@/lib/chatbotWebsiteKnowledge";

type Intent = { occasion?: string; style?: string; budgetMax?: number; color?: string };
type ProductView = { id: string; title: string; slug: string; category: string; priceCents: number; image: string };
type HistoryMsg = { role: "user" | "assistant"; content: string };

const AI_MODEL = process.env.STYLIST_AI_MODEL ?? "gpt-4o-mini";
const GENERAL_MODEL = process.env.GENERAL_AI_MODEL ?? AI_MODEL;

function normalizePriceCents(raw: any) {
  const direct = Number(raw?.price_cents ?? raw?.priceCents ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const alt = Number(raw?.price ?? 0);
  if (Number.isFinite(alt) && alt > 0) return Math.round(alt * 100);
  const v = raw?.variants?.[0]?.priceCents ?? raw?.variants?.[0]?.price_cents ?? 0;
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function parseBudgetFromText(message: string) {
  const m = message.toLowerCase().match(/(?:under|below|less than|max(?:imum)?|budget)\s*(?:₦|ngn|k)?\s*(\d+(?:\.\d+)?)(k)?/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  return Math.round((m[2] ? n * 1000 : n) * 100);
}

function fallbackIntent(message: string): Intent {
  const lower = message.toLowerCase();
  const colors = ["black", "white", "red", "green", "blue", "pink", "brown", "gold", "navy", "cream"];
  const occasions = ["school", "party", "casual", "wedding", "gym", "date", "office", "church"];
  const styles = ["male", "female", "unisex", "streetwear", "formal", "sport", "smart casual"];
  return {
    color: colors.find((c) => lower.includes(c)),
    occasion: occasions.find((o) => lower.includes(o)),
    style: styles.find((s) => lower.includes(s)),
    budgetMax: parseBudgetFromText(message),
  };
}

function isFashionRelated(message: string) {
  const lower = message.toLowerCase();
  const keywords = ["outfit", "wear", "dress", "shirt", "pants", "party", "casual", "wedding", "gym", "date", "style", "fashion", "look", "clothes", "cloth", "budget", "color"];
  return keywords.some((k) => lower.includes(k));
}

function localKnowledgeReply(message: string) {
  const q = message.toLowerCase().trim();
  const facts: Array<{ test: RegExp; answer: string }> = [
    { test: /president of nigeria|who .*president.*nigeria/, answer: "Nigeria's current president is Bola Ahmed Tinubu." },
    { test: /america is a what|what is america|united states is a what/, answer: "The United States of America is a country in North America." },
    { test: /capital of nigeria/, answer: "The capital of Nigeria is Abuja." },
    { test: /capital of france/, answer: "The capital of France is Paris." },
    { test: /capital of usa|capital of united states/, answer: "The capital of the United States is Washington, D.C." },
    { test: /who is ronaldo|cristiano ronaldo/, answer: "Cristiano Ronaldo is a Portuguese professional footballer, widely regarded as one of the greatest players of all time. He has played for Sporting CP, Manchester United, Real Madrid, Juventus, and Al Nassr." },
    { test: /who is elon musk/, answer: "Elon Musk is a technology entrepreneur and business leader, known for leading Tesla, SpaceX, X (formerly Twitter), xAI, and other companies." },
    { test: /what is javascript|javascript is what/, answer: "JavaScript is a high-level programming language mainly used to build interactive websites and web applications (frontend and backend with Node.js)." },
  ];
  return facts.find((f) => f.test.test(q))?.answer ?? null;
}

function websiteKnowledgeReply(message: string) {
  const match = matchWebsiteKnowledge(message);
  return match?.answer ?? null;
}

async function openAIChat(messages: any[], model: string, temperature = 0.4) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const modelCandidates = Array.from(
    new Set([model, "gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"])
  );
  for (const m of modelCandidates) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: m, temperature, messages }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as any;
        const emsg = String(err?.error?.message ?? "");
        if (
          emsg.toLowerCase().includes("model") ||
          emsg.toLowerCase().includes("does not exist") ||
          emsg.toLowerCase().includes("not found")
        ) {
          continue;
        }
        return null;
      }
      const body = (await res.json()) as any;
      const text = String(body?.choices?.[0]?.message?.content ?? "").trim();
      if (text) return text;
    } catch {
      continue;
    }
  }
  return null;
}

function genericKnowledgeFallback(message: string) {
  const q = message.trim();
  const lower = q.toLowerCase();
  if (!q) return "Please ask a question and I will answer directly.";
  if (lower.includes("node js") || lower.includes("nodejs")) {
    return "Node.js is a JavaScript runtime that lets you run JavaScript on the server side. It is built on Chrome's V8 engine and is used for APIs, real-time apps, tooling, and backend services.";
  }
  if (lower.startsWith("what is ") || lower.startsWith("who is ") || lower.startsWith("define ")) {
    return "I cannot reach live sources at the moment, but I can still answer from built-in knowledge. Please ask one clear question at a time and I will answer directly.";
  }
  return "I cannot reach live providers right now, but I can still help from built-in knowledge. Ask a short direct question and I will answer step by step.";
}

async function parseIntentWithAI(message: string): Promise<Intent> {
  const base = fallbackIntent(message);
  const content = await openAIChat(
    [
      { role: "system", content: "Extract shopping intent in compact JSON only with keys: occasion, style, budgetMax, color." },
      { role: "user", content: message },
    ],
    AI_MODEL,
    0.1
  );
  if (!content) return base;
  const s = content.indexOf("{");
  const e = content.lastIndexOf("}");
  if (s === -1 || e === -1) return base;
  try {
    const parsed = JSON.parse(content.slice(s, e + 1)) as Intent;
    return {
      occasion: parsed.occasion?.toLowerCase() ?? base.occasion,
      style: parsed.style?.toLowerCase() ?? base.style,
      color: parsed.color?.toLowerCase() ?? base.color,
      budgetMax: parsed.budgetMax ? Math.round(Number(parsed.budgetMax) * 100) : base.budgetMax,
    };
  } catch {
    return base;
  }
}

async function generalReply(message: string, history: HistoryMsg[] = [], imageDataUrl?: string) {
  const website = websiteKnowledgeReply(message);
  if (website) return website;

  const local = localKnowledgeReply(message);
  if (local) return local;

  const withAI = await openAIChat(
    [
      { role: "system", content: "You are a highly capable assistant. Be accurate, concise, practical, and conversational like ChatGPT." },
      ...history.slice(-10),
      {
        role: "user",
        content: imageDataUrl
          ? [{ type: "text", text: message || "Analyze this image." }, { type: "image_url", image_url: { url: imageDataUrl } }]
          : message,
      },
    ],
    GENERAL_MODEL,
    0.5
  );
  if (withAI) return withAI;

  try {
    // Wikipedia first because it is often reliable for "who is / what is" style questions.
    const wikiSearch = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(message)}&limit=1&namespace=0&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (wikiSearch.ok) {
      const searchData = (await wikiSearch.json()) as [string, string[]];
      const title = searchData?.[1]?.[0];
      if (title) {
        const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (sumRes.ok) {
          const sum = (await sumRes.json()) as { extract?: string };
          const extract = String(sum.extract ?? "").trim();
          if (extract) return extract;
        }
      }
    }

    const ddg = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(message)}&format=json&no_html=1&skip_disambig=1`,
      { cache: "no-store", signal: AbortSignal.timeout(3500) }
    );
    if (ddg.ok) {
      const b = (await ddg.json()) as any;
      const a = String(b?.Answer ?? "").trim();
      const ab = String(b?.AbstractText ?? "").trim();
      const def = String(b?.Definition ?? "").trim();
      if (a) return a;
      if (ab) return ab;
      if (def) return def;
    }
  } catch {}

  if (imageDataUrl) return "I received your image. I can analyze it deeply once the AI model is reachable.";
  return genericKnowledgeFallback(message);
}

function rowToProduct(row: any): ProductView | null {
  const title = String(row?.title ?? row?.name ?? "").trim();
  const slug = String(row?.slug ?? "").trim();
  if (!title || !slug) return null;
  return {
    id: String(row?.id ?? row?._id ?? slug),
    title,
    slug,
    category: String(row?.category ?? "general"),
    priceCents: normalizePriceCents(row),
    image: String(row?.images?.primary ?? row?.image_url ?? row?.image ?? "").trim() || "/api/local-image?id=11",
  };
}

function scoreProduct(p: ProductView, row: any, intent: Intent) {
  let score = 0;
  const hay = `${p.title} ${p.category} ${String(row?.description ?? "")} ${String(row?.tags ?? "")}`.toLowerCase();
  if (intent.occasion && hay.includes(intent.occasion)) score += 3;
  if (intent.style && hay.includes(intent.style)) score += 2;
  if (intent.color && hay.includes(intent.color)) score += 2;
  if (intent.budgetMax && p.priceCents > 0) score += p.priceCents <= intent.budgetMax ? 2 : -1;
  return score;
}

function formatNaira(cents: number) {
  return `₦${(cents / 100).toLocaleString()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: string; imageDataUrl?: string; history?: Array<{ role?: string; content?: string }> };
    const message = String(body.message ?? "").trim();
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined;
    if (!message && !imageDataUrl) return Response.json({ error: "empty_message" }, { status: 400 });
    const history: HistoryMsg[] = Array.isArray(body.history)
      ? body.history
          .map((h): HistoryMsg => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: String(h.content ?? "").slice(0, 1200),
          }))
          .filter((h) => h.content.length > 0)
      : [];

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) {
      const reply = await generalReply(message || "Analyze this image.", history, imageDataUrl);
      return Response.json({ reply, products: [], intent: {} });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    if (imageDataUrl || !isFashionRelated(message)) {
      const reply = await generalReply(message || "Analyze this image.", history, imageDataUrl);
      return Response.json({ reply, products: [], intent: {} });
    }

    const intent = await parseIntentWithAI(message);
    const { data, error } = await supabase.from("products").select("*").limit(300).abortSignal(AbortSignal.timeout(7000));
    if (error) {
      const reply = await generalReply(message, history);
      return Response.json({ reply, products: [], intent });
    }
    const rows = (data ?? []) as any[];
    const mapped = rows.map((r) => ({ row: r, view: rowToProduct(r) })).filter((x): x is { row: any; view: ProductView } => !!x.view);
    if (mapped.length === 0) return Response.json({ reply: "I could not find products in your catalog yet.", products: [] });

    const ranked = mapped.map((x) => ({ ...x, score: scoreProduct(x.view, x.row, intent) })).sort((a, b) => b.score - a.score);
    const products = ranked.slice(0, 6).map((x) => x.view);
    const catalogContext = products
      .slice(0, 8)
      .map((p) => `${p.title} | ${p.category} | ${formatNaira(p.priceCents)} | /product/${p.slug}`)
      .join("\n");

    const aiFashionReply =
      (await openAIChat(
        [
          {
            role: "system",
            content:
              "You are a premium fashion stylist assistant. Use ONLY provided catalog items. Give concise stylish recommendations and mention alternatives when fit is weak.",
          },
          ...history.slice(-8),
          { role: "user", content: `User request: ${message}\nIntent: ${JSON.stringify(intent)}\nCatalog:\n${catalogContext}` },
        ],
        AI_MODEL,
        0.4
      )) ?? null;

    const fallbackList = products.slice(0, 4).map((p) => `- ${p.title} (${formatNaira(p.priceCents)})`).join("\n");
    const reply =
      aiFashionReply ??
      `I pulled the closest catalog matches for your request:\n${fallbackList}\n\nTell me your preferred color/occasion and I will refine this look.`;

    return Response.json({ reply, products, intent });
  } catch {
    return Response.json({
      reply: "I hit a temporary server issue, but I am still here. Please ask again in a short direct format and I will answer.",
      products: [],
      intent: {},
    });
  }
}

export async function GET() {
  return Response.json({ mode: process.env.OPENAI_API_KEY ? "ai_online" : "fallback_mode", hasOpenAI: Boolean(process.env.OPENAI_API_KEY) });
}
