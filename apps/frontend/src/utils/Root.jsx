import { useEffect } from 'react';
import {useAuth} from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Root = () => {
    const { auth } = useAuth();
    const user = auth?.user
    const navigate = useNavigate(); 
    
    useEffect(() => {
        if(user){
            navigate('/dashboard');           
        }else{
            navigate('/login');
        }


    }, [user, navigate]);

    return null;
}

export default Root;