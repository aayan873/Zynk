import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import './Signup.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const Signup = () => {
    const { login } = useAuth();
    const navigate = useNavigate(); 

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('Student');
    const [institution, setInstitution] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    
    const [loading, setLoading] = useState(false);

    let handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (!termsAccepted) {
            toast.error("You must accept the Terms of Service.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password, role, institution: institution || 'Independent' })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Signup successful!");
                login(data.user, data.token); // Auto login
                // It's a new signup, profileCompleted is definitely false.
                navigate("/profile-setup");
            } else {
                toast.error(data.message || "Signup failed");
            }
        } catch (error) {
            toast.error("An error occurred during Signup");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='signup-page'>
            <h1 className='title'>Zynk</h1>
            <div className='signup-container'>
                <h1>Sign up</h1>
                <form className='signup-form' onSubmit={handleSubmit}>
                    <div className='form-group'>
                        <label htmlFor="email">Email</label>
                        <input type="email"
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
                    <div className='form-group'>
                        <label htmlFor="role">I am a</label>
                        <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="Student">Student</option>
                            <option value="Teacher">Teacher</option>
                        </select>
                    </div>
                     <div className='form-group'>
                        <label htmlFor="institution">Institution</label>
                        <input type="text"
                            name="institution"
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder='e.g., Harvard Univ (Optional)' />
                    </div>
                    <div className='form-group checkbox-group' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                        <label htmlFor="terms" style={{ margin: 0, fontSize: '0.9rem' }}>I accept the Terms of Service</label>
                    </div>

                    <button>{loading ? "Loading..." : "Sign up"}</button>
                </form>
                <p>
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
