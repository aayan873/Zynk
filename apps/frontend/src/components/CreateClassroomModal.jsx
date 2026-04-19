import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { X, PlusCircle, Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRANCHES, PROGRAMMES } from '../utils/constants.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const MultiSelect = ({ label, options, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label} *</label>
            <div 
                onClick={() => setOpen(!open)}
                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 cursor-pointer flex justify-between items-center transition"
            >
                <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : `Select ${label}`}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {open && (
                <div className="absolute z-35 w-full mt-1 bg-[#1a1b23] border border-gray-800 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                    {options.map(opt => {
                        const isSelected = selected.includes(opt.value);
                        return (
                            <div 
                                key={opt.value}
                                onClick={() => {
                                    if(isSelected) {
                                        onChange(selected.filter(val => val !== opt.value));
                                    } else {
                                        onChange([...selected, opt.value]);
                                    }
                                }}
                                className="flex items-center px-4 py-2.5 hover:bg-[#20212a] cursor-pointer"
                            >
                                <div className={`w-4 h-4 mr-3 flex items-center justify-center rounded border ${isSelected ? 'bg-white border-white' : 'border-gray-600'}`}>
                                    {isSelected && <Check size={12} className="text-black" />}
                                </div>
                                <span className="text-sm text-gray-300">{opt.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function CreateClassroomModal({ isOpen, onClose, onSuccess }) {
    const { auth } = useAuth();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        programmes: [],
        semester: '',
        branches: []
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData
            };

            const res = await axios.post(`${BACKEND_URL}/api/classrooms`, payload, {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            });

            if (res.data.success) {
                toast.success('Classroom created successfully!');
                onSuccess(res.data.data);
                onClose();
                setFormData({ name: '', description: '', programmes: [], semester: '', branches: [] });
            }
        } catch (error) {
            console.error("Failed to create classroom:", error);
            toast.error(error.response?.data?.message || 'Failed to create classroom');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#14151a] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>
                
                <div className="p-8 pb-6 border-b border-gray-800/80">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <PlusCircle className="text-gray-200" /> 
                        Create New Classroom
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Setup a new learning environment for your students.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Classroom Name *</label>
                        <input 
                            required 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            placeholder="e.g. Data Structures & Algorithms" 
                            className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-gray-600 transition"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            placeholder="Optional short detail about this class..."
                            className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-gray-600 transition h-20 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5 z-20">
                        <div className="relative">
                            <MultiSelect 
                                label="Programmes"
                                options={PROGRAMMES}
                                selected={formData.programmes}
                                onChange={(val) => handleSelectChange('programmes', val)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Semester *</label>
                            <select 
                                required 
                                name="semester" 
                                value={formData.semester} 
                                onChange={handleChange} 
                                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-white transition appearance-none"
                            >
                                <option value="" disabled hidden>Select Semester</option>
                                {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <MultiSelect 
                            label="Branches"
                            options={BRANCHES}
                            selected={formData.branches}
                            onChange={(val) => handleSelectChange('branches', val)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-100 text-black text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                            {loading ? 'Creating...' : 'Create Classroom'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
