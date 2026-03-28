import { useEffect } from "react";
import {useAuth} from '../context/AuthContext';
import { useNavigate } from "react-router-dom";

const ProtectedRoutes = ({children})=>{
    const { auth } = useAuth();
    
    const navigate = useNavigate();
    const user = auth?.user;
    const token = auth?.token;

    useEffect(()=>{
       if(!user || !token){
        navigate("/login", { replace: true });
        return;
    }},
     [user, token, navigate]);

     if (!user || !token) return null;

       return children;

}

export default  ProtectedRoutes;
