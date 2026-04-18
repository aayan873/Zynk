import React from 'react';
import { ShieldAlert, GraduationCap } from 'lucide-react';

export default function ClassroomPeople({ classroom }) {
    if (!classroom) return null;

    const teachers = classroom.teachers || [];
    const students = classroom.students || [];

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const renderPersonRow = (person, role) => {
        const isTeacher = role === 'Teacher';
        const name = person.fullName || 'Unknown User';
        const email = person.email || 'No email provided';
        const rollNumber = isTeacher ? null : (person.rollNumber || '-');

        return (
            <div
                key={person._id}
                className="flex items-center justify-between p-3 sm:p-4 bg-[#0e0e11] border border-gray-800/80 rounded-xl mb-3 hover:border-gray-700 transition duration-200 gap-3"
            >
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border ${
                        isTeacher
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                        {getInitials(name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{name}</p>
                        <p className="text-gray-500 text-xs truncate">{email}</p>
                        {/* Roll number shown inline on mobile */}
                        {!isTeacher && rollNumber && (
                            <p className="text-gray-400 text-xs font-medium mt-0.5 sm:hidden">#{rollNumber}</p>
                        )}
                    </div>
                </div>

                {/* Right: Roll + Badge */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {/* Roll number — hidden on mobile (shown inline above) */}
                    {!isTeacher && (
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-gray-500 text-[10px]">Roll No</span>
                            <span className="text-gray-300 font-medium text-sm">{rollNumber}</span>
                        </div>
                    )}
                    <div className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 ${
                        isTeacher
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                        {isTeacher ? <ShieldAlert size={11} /> : <GraduationCap size={11} />}
                        <span className="hidden xs:inline">{role}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="px-4 sm:px-6 py-4 h-[65vh] sm:h-[70vh] w-full overflow-y-auto custom-scrollbar">
            <div className="space-y-6 sm:space-y-8">

                {/* Teachers */}
                <section>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center justify-between pb-2 border-b border-gray-800/80">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-indigo-400" size={18} />
                            <span>Teachers</span>
                        </div>
                        <span className="px-2.5 py-1 bg-[#14151a] border border-gray-800 text-gray-400 rounded-full text-xs">
                            {teachers.length}
                        </span>
                    </h2>
                    {teachers.length > 0
                        ? teachers.map(t => renderPersonRow(t, 'Teacher'))
                        : <p className="text-gray-500 text-sm italic py-4">No teachers assigned to this classroom.</p>
                    }
                </section>

                {/* Students */}
                <section>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center justify-between pb-2 border-b border-gray-800/80">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-emerald-400" size={18} />
                            <span>Students</span>
                        </div>
                        <span className="px-2.5 py-1 bg-[#14151a] border border-gray-800 text-gray-400 rounded-full text-xs">
                            {students.length}
                        </span>
                    </h2>
                    {students.length > 0
                        ? students.map(s => renderPersonRow(s, 'Student'))
                        : <p className="text-gray-500 text-sm italic py-4">No students enrolled yet.</p>
                    }
                </section>
            </div>
        </div>
    );
}