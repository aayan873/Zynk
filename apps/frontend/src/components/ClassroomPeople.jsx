import React from 'react';
import { ShieldAlert, GraduationCap } from 'lucide-react';

export default function ClassroomPeople({ classroom }) {
    if (!classroom) return null;

    const teachers = classroom.teachers || [];
    const students = classroom.students || [];

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const renderPersonRow = (person, role) => {
        const isTeacher = role === 'Teacher';
        const name = person.fullName || 'Unknown User';
        const email = person.email || 'No email provided';
        const rollNumber = isTeacher ? '-' : (person.rollNumber || '-');
        
        return (
            <div key={person._id} className="flex items-center justify-between p-4 bg-[#0e0e11] border border-gray-800/80 rounded-xl mb-3 hover:border-gray-700 transition duration-200">
                <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isTeacher 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                        {getInitials(name)}
                    </div>
                    <div>
                        <p className="text-white font-medium">{name}</p>
                        <p className="text-gray-500 text-xs">{email}</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                    {!isTeacher && (
                        <div className="hidden md:flex flex-col items-end w-32">
                            <span className="text-gray-500 text-xs">Roll No</span>
                            <span className="text-gray-300 font-medium">{rollNumber}</span>
                        </div>
                    )}
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                        isTeacher 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                        {isTeacher ? <ShieldAlert size={12} /> : <GraduationCap size={12} />}
                        <span>{role}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 h-full w-full overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Teachers Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between pb-2 border-b border-gray-800/80">
                        <div className="flex items-center">
                            <ShieldAlert className="mr-2 text-indigo-400" size={20} />
                            Teachers
                        </div>
                        <span className="px-3 py-1 bg-[#14151a] border border-gray-800 text-gray-400 rounded-full text-xs">
                            {teachers.length}
                        </span>
                    </h2>
                    
                    <div className="space-y-1">
                        {teachers.length > 0 ? (
                            teachers.map(teacher => renderPersonRow(teacher, 'Teacher'))
                        ) : (
                            <p className="text-gray-500 text-sm italic py-4">No teachers assigned to this classroom.</p>
                        )}
                    </div>
                </section>

                {/* Students Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between pb-2 border-b border-gray-800/80">
                        <div className="flex items-center">
                            <GraduationCap className="mr-2 text-emerald-400" size={20} />
                            Students
                        </div>
                        <span className="px-3 py-1 bg-[#14151a] border border-gray-800 text-gray-400 rounded-full text-xs">
                            {students.length}
                        </span>
                    </h2>
                    
                    <div className="space-y-1">
                        {students.length > 0 ? (
                            students.map(student => renderPersonRow(student, 'Student'))
                        ) : (
                            <p className="text-gray-500 text-sm italic py-4">No students enrolled yet.</p>
                        )}
                    </div>
                </section>
                
            </div>
        </div>
    );
}
