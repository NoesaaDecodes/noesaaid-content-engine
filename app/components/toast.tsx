"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

let toastId = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function showToast(message: string, type: ToastType = "info") {
  const item: ToastItem = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(item));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg backdrop-blur-sm ${
              t.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : t.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
            }`}
          >
            {t.type === "success" ? (
              <Check className="size-3.5" />
            ) : t.type === "error" ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <Info className="size-3.5" />
            )}
            {t.message}
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-1 text-zinc-500 hover:text-white"
            >
              <X className="size-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
