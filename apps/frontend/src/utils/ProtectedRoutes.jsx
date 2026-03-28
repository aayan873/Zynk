import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ProtectedRoutes = ({ children }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const user = auth?.user;
  const token = auth?.token;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!user || !token) {
        if (active) {
          setChecking(false);
          navigate("/login", { replace: true });
        }
        return;
      }

      try {
        await axios.get("/api/auth/validate");
        if (active) setChecking(false);
      } catch {
        logout();
        if (active) {
          setChecking(false);
          navigate("/login", { replace: true });
        }
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [user, token, navigate, logout]);

  if (checking) return null;
  if (!user || !token) return null;

  return children;
};

export default ProtectedRoutes;
