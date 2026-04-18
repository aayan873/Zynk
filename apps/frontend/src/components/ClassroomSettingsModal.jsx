import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { X, Settings as SettingsIcon, Check, ChevronDown, Trash2 } from 'lucide-react';
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
                                <div className={`w-4 h-4 mr-3 flex items-center justify-center rounded border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600'}`}>
                                    {isSelected && <Check size={12} className="text-white" />}
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

export default function ClassroomSettingsModal({ isOpen, onClose, onSuccessUpdate, classroom, onDeleteRedirect }) {
    const { auth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        programmes: [],
        semester: '',
        branches: []
    });

    useEffect(() => {
        if (classroom) {
            setFormData({
                name: classroom.name || '',
                description: classroom.description || '',
                programmes: classroom.programmes || [],
                semester: classroom.semester || '',
                branches: classroom.branches || []
            });
        }
    }, [classroom]);

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
            const res = await axios.patch(`${BACKEND_URL}/api/classrooms/${classroom._id}`, formData, {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            });

            if (res.data.success) {
                toast.success('Classroom updated successfully!');
                onSuccessUpdate(res.data.data);
                onClose();
            }
        } catch (error) {
            console.error("Failed to update classroom:", error);
            toast.error(error.response?.data?.message || 'Failed to update classroom');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this classroom? This action cannot be undone.");
        if (!confirmDelete) return;

        setDeleting(true);
        try {
            const res = await axios.delete(`${BACKEND_URL}/api/classrooms/${classroom._id}`, {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            });

            if (res.data.success) {
                toast.success('Classroom deleted successfully!');
                onDeleteRedirect();
            }
        } catch (error) {
            console.error("Failed to delete classroom:", error);
            toast.error(error.response?.data?.message || 'Failed to delete classroom');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#14151a] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 text-gray-500 hover:text-white transition z-10"
                >
                    <X size={20} />
                </button>
                
                <div className="p-8 pb-6 border-b border-gray-800/80 shrink-0">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <SettingsIcon className="text-indigo-500" /> 
                        Classroom Settings
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Update settings and boundaries for this classroom.</p>
                </div>
                
                <div className="overflow-y-auto w-full p-8 space-y-6">
                    <form id="settingsForm" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Classroom Name *</label>
                            <input 
                                required 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="e.g. Data Structures & Algorithms" 
                                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-600 transition"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder="Optional short detail about this class..."
                                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-600 transition h-20 resize-none"
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
                                    className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white transition appearance-none"
                                >
                                    <option value="" disabled hidden>Select Semester</option>
                                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                                        <option key={sem} value={sem}>{sem}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative z-10 w-full mb-4">
                            <MultiSelect 
                                label="Branches"
                                options={BRANCHES}
                                selected={formData.branches}
                                onChange={(val) => handleSelectChange('branches', val)}
                            />
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-red-900/30">
                        <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2 mb-2">
                            <Trash2 size={18} /> Danger Zone
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Once you delete a classroom, it cannot be undone. All related materials and conversations will no longer be accessible.
                        </p>
                        <button 
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-semibold transition flex items-center justify-center"
                        >
                            {deleting ? 'Deleting...' : 'Delete Classroom'}
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800/80 bg-[#14151a] shrink-0 flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition">Cancel</button>
                    <button type="submit" form="settingsForm" disabled={loading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
