import { clearToasts, toast } from "@/utils/toast";
import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError, invalidateSessionRequests } from "@/api/client";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, SessionUser } from "@/services/auth.service";
import { useAppDispatch } from "@/app/hooks";
import { dashboardCleared } from "@/modules/dashboard/dashboardSlice";
import { conversationCleared } from "@/modules/assistant/assistantSlice";
import { clearDashboardCache } from "@/utils/dashboardCache";

type AuthStatus = "checking" | "anonymous" | "network-error" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  errorMessage: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const clearPrivateUi = (dispatch: ReturnType<typeof useAppDispatch>) => {
  invalidateSessionRequests();
  clearToasts();
  dispatch(dashboardCleared());
  dispatch(conversationCleared());
  clearDashboardCache();
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const checkId = useRef(0);

  const checkSession = useCallback(async () => {
    const id = ++checkId.current;
    setStatus("checking");
    setErrorMessage("");
    try {
      const response = await getCurrentUser();
      if (id !== checkId.current) return;
      setUser(response.user);
      setStatus("authenticated");
    } catch (error) {
      if (id !== checkId.current) return;
      if (error instanceof ApiError && error.status === 401) {
        clearPrivateUi(dispatch);
        setUser(null);
        setStatus("anonymous");
        return;
      }
      setStatus("network-error");
      setErrorMessage(error instanceof ApiError ? error.message : "We couldn't check your session.");
    }
  }, [dispatch]);

  useEffect(() => {
    void checkSession();
    return () => {
      checkId.current += 1;
    };
  }, [checkSession]);

  useEffect(() => {
    const expire = () => {
      checkId.current += 1;
      clearPrivateUi(dispatch);
      setUser(null);
      setErrorMessage("Your session expired. Please sign in again.");
      setStatus("anonymous");
      toast.info("Your session expired. Please sign in again.");
    };
    window.addEventListener("hearty:unauthorized", expire);
    return () => window.removeEventListener("hearty:unauthorized", expire);
  }, [dispatch]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    checkId.current += 1;
    invalidateSessionRequests();
    setUser(response.user);
    setErrorMessage("");
    setStatus("authenticated");
    toast.success(`Welcome back, ${response.user.name.split(" ")[0]}!`);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    checkId.current += 1;
    clearPrivateUi(dispatch);
    setUser(null);
    setStatus("anonymous");
    toast.success("You're signed out.");
  }, [dispatch]);

  return (
    <AuthContext.Provider
      value={{ status, user, errorMessage, login, logout, retrySession: () => void checkSession() }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
