import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../lib/auth";

function safeInternalPath(value: string | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("://")) return "/";
  return value;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = safeInternalPath(
    (location.state as { from?: { pathname?: string } })?.from?.pathname,
  );

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async () => {
    setError(null);
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);

    if (result.error) {
      setError("Accesso non riuscito. Riprova tra qualche secondo.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Ginella" className="w-20 h-20 rounded-xl object-contain mb-4" />
          <h1 className="text-2xl font-extrabold text-primary">Ginella</h1>
          <p className="text-sm text-outline mt-1">
            Accedi al pannello di gestione
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          disabled={loading || submitting}
          onClick={handleLogin}
          className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-white border border-outline-variant/40 text-sm font-semibold text-slate-700 shadow-sm hover:bg-stone-50 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {submitting ? "Accesso in corso…" : "Accedi con Google"}
        </button>

        <p className="text-[10px] text-outline mt-6 text-center">
          Solo gli utenti già registrati possono accedere al pannello.
        </p>
      </div>
    </div>
  );
}
