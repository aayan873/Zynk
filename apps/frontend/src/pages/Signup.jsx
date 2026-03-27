import{useState,useEffect} from 'react';
import { Link,useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Signup.css';


const Signup = ()=>{
    const [username,setUsername] = useState('');
   const [email,setEmail] = useState('');
   const [password,setPassword] = useState('');
   
   const [loading,setLoading] = useState(false);
   const [confirmPassword, setConfirmPassword] = useState('');


    let handleSubmit = async (e)=>{
        e.preventDefault();

         if (password !== confirmPassword) {
          alert.error("Passwords do not match");
           return;
          }

          
        setLoading(true);

         try{
        const response = await fetch("http://localhost:5000/api/auth/signup",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({username,email,password})
        });
        const data = await response.json();
        if (response.ok) {
            toast.success("Signup successful!");
            navigate("/dashboard");
        } else {
            toast.error(data.message || "Signup failed");
        }
     } catch (error) {
        toast.error("An error occurred during Signup");
     } finally {
        setLoading(false);
     }

    

      }
    
    return(
      <div className='signup-page'>
        <h1 className='title'>Zynk</h1>
        <div className='signup-container'>
            <h1>Sign up</h1>
            <form className='signup-form' onSubmit={handleSubmit}>
                 <div className='form-group'>
                    <label htmlFor="username">Name</label>
                    <input type="text"
                     name="username"
                     value={username} 
                     required
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder='Name' />
                 </div>
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
                <div className='form-group'>
                   <label htmlFor="confirmPassword">Confirm Password</label>
                   <input
                     type="password"
                     name="confirmPassword"
                     value={confirmPassword}
                     required
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     placeholder="Confirm Password"
                   />
                 </div>

                <button>{loading? "Loading...":"Sign up"}</button>
            </form>
           <p>
          Already have an account? <Link to="/login">Log in</Link>
           </p>

        </div>
        </div>
     
    );
}

export default Signup;