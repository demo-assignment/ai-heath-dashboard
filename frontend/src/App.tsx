import { FC } from "react";
import Dashboard from "./modules/dashboard/Dashboard";
import AssistantWidget from "./modules/assistant/AssistantWidget";
import LoginScreen from "./modules/auth/LoginScreen";
import { useAuth } from "./modules/auth/AuthProvider";
import Mascot from "./components/mascot/Mascot";

const AppContent: FC = () => {
  const { status, errorMessage, retrySession } = useAuth();
  if (status === "checking")
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 text-muted">
        <Mascot mood="happy" size={44} />
        <span className="font-semibold">Checking your session…</span>
      </main>
    );
  if (status === "network-error")
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="max-w-sm rounded-3xl bg-white/85 p-7 text-center shadow-xl">
          <Mascot mood="concerned" size={64} />
          <h1 className="mt-3 font-display text-2xl font-extrabold">Couldn’t reach Hearty</h1>
          <p className="mt-2 text-sm text-muted">{errorMessage}</p>
          <button
            onClick={retrySession}
            className="mt-5 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-brand"
          >
            Try again
          </button>
        </section>
      </main>
    );
  if (status === "anonymous") return <LoginScreen />;
  return (
    <>
      <Dashboard />
      <AssistantWidget />
    </>
  );
};

const App: FC = () => <AppContent />;
export default App;
