import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };
const eventName = "zudev:toast";
let nextId = 0;

export const toast = {
  success(message: string) {
    publish(message, "success");
  },
  error(message: string) {
    publish(message, "error");
  },
  info(message: string) {
    publish(message, "info");
  },
};

function publish(message: string, variant: ToastVariant) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ToastItem>(eventName, {
        detail: { id: ++nextId, message, variant },
      }),
    );
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const item = (event as CustomEvent<ToastItem>).detail;
      setItems((current) => [...current, item]);
      window.setTimeout(
        () => setItems((current) => current.filter(({ id }) => id !== item.id)),
        5000,
      );
    };
    window.addEventListener(eventName, onToast);
    return () => window.removeEventListener(eventName, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed right-4 top-4 z-[100] grid w-[min(24rem,calc(100vw-2rem))] gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.variant === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm text-white shadow-lg ${item.variant === "success" ? "border-emerald-700 bg-emerald-700" : item.variant === "error" ? "border-red-700 bg-red-700" : "border-sky-700 bg-sky-700"}`}
        >
          <span>{item.message}</span>
          <button
            type="button"
            className="-mr-1 -mt-1 rounded p-1 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Dismiss notification"
            onClick={() =>
              setItems((current) => current.filter(({ id }) => id !== item.id))
            }
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
