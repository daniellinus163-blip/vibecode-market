"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import * as Progress from "@radix-ui/react-progress";
import { useCartStore } from "@/store/cartStore";
import { apiGet, apiPost } from "@/lib/api";

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const subtotal = useMemo(() => items.reduce((sum, x) => sum + x.unitPriceCents * x.quantity, 0), [items]);
  const shippingCents = subtotal > 15000 ? 0 : 900;

  const [step, setStep] = useState<Step>(1);
  const [coupon, setCoupon] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [address, setAddress] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  useEffect(() => {
    apiGet("/api/user/profile").catch(() => {
      // Keep user on page; middleware handles guarded routes on navigation.
    });
  }, []);

  async function placeOrder() {
    setPlacing(true);
    try {
      const res = await apiPost<{ orderId: string }>("/api/orders/checkout", {
        items: items.map((x) => ({
          productId: x.productId,
          variantLabel: x.variantLabel,
          quantity: x.quantity,
        })),
        address: {
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        couponCode: coupon || undefined,
      });
      setOrderId(res.orderId);
      clear();
      setStep(3);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.3em] text-white/60">CHECKOUT</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Secure checkout</h1>
        </div>
        <div className="text-xs text-white/60">Step {step} / 3</div>
      </div>

      <div className="mt-5">
        <Progress.Root className="relative h-2 overflow-hidden rounded-full bg-white/10" value={progress}>
          <Progress.Indicator
            className="h-full w-full rounded-full bg-accent transition-transform duration-500"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6">
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="text-xs tracking-[0.28em] text-white/60">SHIPPING</div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {(
                      [
                        ["fullName", "Full name"],
                        ["line1", "Address line 1"],
                        ["line2", "Address line 2 (optional)"],
                        ["city", "City"],
                        ["postalCode", "Postal code"],
                        ["country", "Country"],
                        ["phone", "Phone"],
                      ] as const
                    ).map(([k, label]) => (
                      <input
                        key={k}
                        value={(address as any)[k]}
                        onChange={(e) => setAddress((a) => ({ ...a, [k]: e.target.value }))}
                        placeholder={label}
                        className="w-full rounded-[18px] border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-accent/70"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99]"
                  >
                    Continue
                  </button>
                </motion.div>
              ) : null}

              {step === 2 ? (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="text-xs tracking-[0.28em] text-white/60">REVIEW</div>
                  <div className="mt-4 space-y-3">
                    {items.map((x) => (
                      <div
                        key={`${x.productId}:${x.variantLabel}`}
                        className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{x.title}</div>
                          <div className="text-xs text-white/60">
                            {x.variantLabel} · Qty {x.quantity}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{cents(x.unitPriceCents * x.quantity)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs tracking-[0.22em] text-white/60">COUPON / DISCOUNT</div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder="Try GOLD10 or FLASH15"
                        className="w-full rounded-full border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-accent/70"
                      />
                      <button
                        onClick={() => setCoupon((c) => c.trim())}
                        className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm text-white/80 hover:border-accent/60 hover:bg-white/10"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 md:flex-row">
                    <button
                      onClick={() => setStep(1)}
                      className="rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 hover:border-accent/50 hover:bg-white/10"
                    >
                      Back
                    </button>
                    <button
                      onClick={placeOrder}
                      disabled={placing || items.length === 0}
                      className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
                    >
                      {placing ? "Placing order…" : "Place order"}
                    </button>
                  </div>
                </motion.div>
              ) : null}

              {step === 3 ? (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="text-xs tracking-[0.28em] text-white/60">CONFIRMED</div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight">Order placed</div>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    Your order is now trackable in real time.
                  </p>
                  {orderId ? (
                    <Link
                      href={`/order/${orderId}`}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99]"
                    >
                      Track order
                    </Link>
                  ) : null}
                  <Link
                    href="/shop"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 hover:border-accent/50 hover:bg-white/10"
                  >
                    Back to shop
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="sticky top-24 rounded-[26px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs tracking-[0.28em] text-white/60">TOTAL</div>
            <div className="mt-4 flex items-center justify-between text-sm text-white/70">
              <span>Subtotal</span>
              <span className="text-white">{cents(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-white/70">
              <span>Shipping</span>
              <span className="text-white">{shippingCents === 0 ? "Free" : cents(shippingCents)}</span>
            </div>
            <div className="mt-4 h-px bg-white/10" />
            <div className="mt-4 flex items-center justify-between text-base font-semibold">
              <span>Estimated total</span>
              <span>{cents(subtotal + shippingCents)}</span>
            </div>
            <div className="mt-4 text-xs text-white/50">
              Checkout is demo-ready; connect real payments next (Stripe/Adyen) without changing the UX flow.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

