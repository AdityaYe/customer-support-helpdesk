import { LoaderCircle } from "lucide-react";

export default function LoadingState({ label = "Loading...", className = "" }) {
  return (
    <div
      className={`flex min-h-[240px] items-center justify-center px-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-brand-600" />
        <p className="mt-3 text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
