import { createContext, useContext, useState } from "react";

 const AuthContext = createContext();

 const AuthContextProvider = ({children})=>{
     const [auth, setAuth] = useState(() => {
     const user = localStorage.getItem("pos-user");
     const token = localStorage.getItem("pos-token");

  return user && token ? { user: JSON.parse(user), token }: { user: null, token: null }; });

  
  const login = (userData, token) => {
    const authData = { user: userData, token };
      setAuth(authData);

      localStorage.setItem("pos-user", JSON.stringify(userData));
      localStorage.setItem("pos-token", token);
   };

   const logout = () => {
      setAuth({ user: null, token: null });
      localStorage.removeItem("pos-user");
      localStorage.removeItem("pos-token");
    };
   return (
    <AuthContext.Provider value={{ auth, login, logout }}>
        {children}
    </AuthContext.Provider>
   )
 };

    const useAuth = () => useContext(AuthContext);
    const AuthProvider = AuthContextProvider;

    export { AuthProvider, useAuth };