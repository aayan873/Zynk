import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef } from "react";

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const hasConfirmed = useRef(false);

  useEffect(() => {
    if (hasConfirmed.current) return;   // prevent second run
    hasConfirmed.current = true;

    const confirmLogout = window.confirm("Are you sure you want to logout?");

    if (confirmLogout) {
      logout();
      navigate("/login", { replace: true });
    } else {
      navigate(-1);
    }
  }, [logout, navigate]);

  return null;
};

export default Logout;
