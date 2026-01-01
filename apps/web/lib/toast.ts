export type ToastType = "success" | "error" | "warning" | "info";

const TOAST_DURATION_MS = 3000;

export const showToast = (message: string, type: ToastType = "info") => {
  if (typeof document === "undefined") return;

  const toast = document.createElement("div");
  toast.className = `pb-toast pb-toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, TOAST_DURATION_MS);
};
