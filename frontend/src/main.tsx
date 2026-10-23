import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";
import { AuthProvider } from "./modules/auth/AuthProvider";
import Toaster from "./components/toast/Toaster";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </Provider>
  </StrictMode>,
);
