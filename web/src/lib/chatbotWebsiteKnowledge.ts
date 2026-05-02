export type WebsiteKnowledgeRule = {
  id: string;
  keywords: string[];
  answer: string;
};

export const WEBSITE_KNOWLEDGE: WebsiteKnowledgeRule[] = [
  {
    id: "order_flow",
    keywords: ["where to order", "how to order", "how to buy", "place order", "checkout"],
    answer:
      "To order on this website: 1) Open Shop and pick a product, 2) Click View, choose size/color if available, 3) Click Add to Cart, 4) Open Cart from the icon, 5) Proceed to Checkout, 6) Confirm details and place your order.",
  },
  {
    id: "cart_location",
    keywords: ["where is cart", "open cart", "go to cart", "cart icon"],
    answer:
      "Use the cart icon at the top-right (desktop) or bottom navigation (mobile). Add products first, then open Cart to review items and checkout.",
  },
  {
    id: "auth_help",
    keywords: ["login", "sign in", "sign up", "register", "create account", "google login"],
    answer:
      "Go to Login or Signup to access your account. You can use email/password or Google login. After login, open Settings (gear icon) to manage your profile and account details.",
  },
  {
    id: "settings_help",
    keywords: ["settings", "profile", "account", "change password", "update profile"],
    answer:
      "Open Settings from the top-right gear icon. Sections include Profile, Addresses, Orders, Wishlist, Notifications, and Security.",
  },
  {
    id: "categories_help",
    keywords: ["categories", "kids", "teens", "youth", "adults", "accessories"],
    answer:
      "The shop categories are Kids, Teens, Youth, Adults, and Accessories. Use category filters and search suggestions to find items faster.",
  },
  {
    id: "tracking_help",
    keywords: ["shipping", "delivery", "track order", "tracking", "order status"],
    answer:
      "You can monitor your order from the Orders section, where status updates move from pending to processing, shipped, and delivered.",
  },
  {
    id: "website_features",
    keywords: ["about this website", "what can this website do", "features", "what does this app do"],
    answer:
      "This is a full e-commerce clothing platform with product catalog, filters, search, cart, wishlist, checkout, order history, settings/profile management, admin dashboard, and an AI stylist chatbot.",
  },
];

export function matchWebsiteKnowledge(message: string) {
  const lower = message.toLowerCase().trim();
  if (!lower) return null;
  return WEBSITE_KNOWLEDGE.find((rule) => rule.keywords.some((k) => lower.includes(k))) ?? null;
}
