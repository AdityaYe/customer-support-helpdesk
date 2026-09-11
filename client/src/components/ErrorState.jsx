import { AlertCircle, RefreshCw, X } from "lucide-react";

export default function ErrorState({
  message,
  onRetry,
  onDismiss,
  className = "",
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">
            Something went wrong
          </p>
          <p className="mt-0.5 text-sm text-red-700">{message}</p>

          {(onRetry || onDismiss) && (
            <div className="mt-3 flex items-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
