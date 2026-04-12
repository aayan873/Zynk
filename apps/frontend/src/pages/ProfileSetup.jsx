import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import './Signup.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ProfileSetup = () => {
    const { auth, login } = useAuth();
    const navigate = useNavigate();
    
    const role = auth?.user?.role;

    // Common
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    // Teacher specific
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [bio, setBio] = useState('');

    // Student specific
    const [rollNumber, setRollNumber] = useState('');
    const [programme, setProgramme] = useState('');
    const [branch, setBranch] = useState('');
    const [semester, setSemester] = useState('');
    const [batchYear, setBatchYear] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = { fullName };

        if (role === 'Teacher') {
            Object.assign(payload, { department, designation, employeeId, bio });
        } else if (role === 'Student') {
            Object.assign(payload, { rollNumber, programme, branch, semester, batchYear });
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/profiles/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${auth?.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Profile creation successful!");
                // Re-sync local auth state so protected routes consider them verified
                if (auth && auth.user) {
                    login({ ...auth.user, profileCompleted: true }, auth.token);
                }
                navigate("/home");
            } else {
                toast.error(data.message || "Failed to complete profile");
            }
        } catch (error) {
            toast.error("An error occurred during profile setup");
        } finally {
            setLoading(false);
        }
    };

    if (!auth?.user) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading user state...</div>;
    }

    return (
        <div className='signup-page'>
            <h1 className='title'>Zynk Profile Setup</h1>
            <div className='signup-container' style={{ maxWidth: '500px', width: '90%' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Complete Your {role} Profile</h1>
                <p style={{ marginBottom: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                    You must complete this step to discover your classrooms.
                </p>

                <form className='signup-form' onSubmit={handleSubmit}>
                    <div className='form-group'>
                        <label htmlFor="fullName">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder='Full Name' />
                    </div>

                    {role === 'Teacher' && (
                        <>
                            <div className='form-group'>
                                <label htmlFor="department">Department</label>
                                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} required placeholder='e.g. Computer Science' />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="designation">Designation</label>
                                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} required placeholder='e.g. Assistant Professor' />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="employeeId">Employee ID (Optional)</label>
                                <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder='Employee ID' />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="bio">Bio (Optional)</label>
                                <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder='Short bio...' />
                            </div>
                        </>
                    )}

                    {role === 'Student' && (
                        <>
                            <div className='form-group'>
                                <label htmlFor="rollNumber">Roll Number / Student ID</label>
                                <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required placeholder='Roll Number' />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="programme">Programme</label>
                                <select value={programme} onChange={(e) => setProgramme(e.target.value)} required style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white'}}>
                                    <option value="" disabled hidden>Select Programme</option>
                                    {['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BBA', 'MBA', 'B.Sc', 'M.Sc'].map(deg => (
                                        <option key={deg} value={deg}>{deg}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="branch">Branch / Department</label>
                                <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} required placeholder='e.g. Computer Science' />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="semester">Semester</label>
                                <select value={semester} onChange={(e) => setSemester(e.target.value)} required style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white'}}>
                                    <option value="" disabled hidden>Select Semester</option>
                                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                                        <option key={sem} value={sem}>{sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="batchYear">Batch Year</label>
                                <input type="text" value={batchYear} onChange={(e) => setBatchYear(e.target.value)} required placeholder='e.g. 2022-2026' />
                            </div>
                        </>
                    )}

                    <button style={{ marginTop: '10px' }}>{loading ? "Saving..." : "Finish Profile"}</button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;
