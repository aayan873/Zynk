import {React} from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const login = ()=>{
      
      const [email,setEmail] = useState("");
     const [password,setPassword] = useState("");
  //  const [error,setError] = useState(null);
   const [loading,setLoading] = useState(false);
   const [showResend, setShowResend] = useState(false);
   const [resendLoading, setResendLoading] = useState(false);

  

 let handleSubmit = async (e)=>{
        e.preventDefault();
        setLoading(true);
        // setError(null);
    
     console.log("Email:",email);

   }
    
  

    return(
        <div className='login-page'>
        <h1 className='title'>Zynk</h1>
        <div className='login-container'>
            <h1>Login</h1>
            <form className='login-form' onSubmit={handleSubmit}>
               <div className='form-group'>
                    <label htmlFor="email">Email</label>
                    <input type="text"
                     name="email"
                     value={email} 
                     required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='Email' />
                 </div>
                 <div className='form-group'>
                    <label htmlFor="password">Password</label>
                    <input type="password"
                     name="password"
                     value={password} 
                     required
                    onChange={(e) => setPassword(e.target.value)}
                        placeholder='Password' />
                </div>
                <button>{loading? "Loading...":"Login"}</button>
            </form>
           <p>
           Don't have an account? <Link to="/signup">Sign up</Link>
           </p>
            {/* {showResend && (
              <div className="resend-btn">
                <p>Your email is not verified.</p>
                <button onClick={resendEmail}>{resendLoading ? "Sending..." : "Send verification email"}</button>
              </div>
            )} */}
        </div>
        </div>
    )

}

export default login;