import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Root from "./utils/Root.jsx";
import ProtectedRoutes from "./utils/ProtectedRoutes.jsx";
import Logout from "./pages/Logout.jsx";
import Home from "./pages/Home.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import Room from "./components/Room.jsx";
import ProfileSetup from "./pages/ProfileSetup.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ClassroomPage from "./pages/ClassroomPage.jsx";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Toaster position="bottom-left" reverseOrder={false} />
      <Router>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/home"
            element={<Home />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoutes>
                <DashboardHome />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoutes>
                <ProfileSetup />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoutes>
                <ProfilePage />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/classroom/:id"
            element={
              <ProtectedRoutes>
                <ClassroomPage />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoutes>
                <Room />
              </ProtectedRoutes>
            }
          />

         

          <Route path="/logout" element={<Logout />} />

          <Route
            path="/unauthorized"
            element={
              <p className="font-bold text-3xl mt-20 ml-20 ">
                UnAuthorized Path
              </p>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
