import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth, type Role } from "./lib/auth";
import { ShieldOff } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Photos = lazy(() => import("./pages/Photos"));
const Sections = lazy(() => import("./pages/Sections"));
const Users = lazy(() => import("./pages/Users"));
const Login = lazy(() => import("./pages/Login"));

function UnauthorizedRedirect() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = () => {
      logout().then(() => navigate("/login", { replace: true }));
    };
    window.addEventListener("api:unauthorized", handler);
    return () => window.removeEventListener("api:unauthorized", handler);
  }, [logout, navigate]);

  return null;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-outline">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function RequireRole({ roles }: { roles: Role[] }) {
  const { role, loading } = useAuth();

  if (loading) return <div className="p-8 text-outline">Loading…</div>;

  if (!roles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldOff size={48} className="text-outline mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Non autorizzato</h2>
        <p className="text-sm text-outline">Non hai i permessi per accedere a questa pagina.</p>
      </div>
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <UnauthorizedRedirect />
      <Suspense fallback={<div className="p-8 text-outline">Loading…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />

              <Route element={<RequireRole roles={["admin", "editor"]} />}>
                <Route path="photos" element={<Photos />} />
              </Route>

              <Route element={<RequireRole roles={["admin"]} />}>
                <Route path="sections" element={<Sections />} />
                <Route path="users" element={<Users />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
