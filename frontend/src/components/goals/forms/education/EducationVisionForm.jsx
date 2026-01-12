import React, { useState, useEffect } from 'react';
import { 
    GraduationCap, 
    BookOpen, 
    School,
    Users,
    Calendar,
    Plane,
    Baby,
    MapPin,
    Home,
    Building2
} from 'lucide-react';

const EducationVisionForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Education Fund',
        student_type: initialValues.goal_details?.student_type || 'child', // 'self' or 'child'
        student_name: initialValues.goal_details?.student_name || '',
        current_age: initialValues.goal_details?.current_age || 5, // if child
        start_year: initialValues.goal_details?.start_year || new Date().getFullYear() + 13,
        institution_type: initialValues.goal_details?.institution_type || 'university_local',
        living_situation: initialValues.goal_details?.living_situation || 'home', // 'home', 'renting', 'campus'
        duration_years: initialValues.goal_details?.duration_years || 3,
        target_amount: initialValues.target_amount || 50000, 
        due_date: initialValues.due_date || ''
    });

    const INSTITUTION_TYPES = {
        university_local: { label: 'Local University', icon: GraduationCap, desc: 'NZ Public Uni (Fees + Living)' },
        university_overseas: { label: 'Overseas Uni', icon: Plane, desc: 'Intl Fees + Travel + Living' },
        private_school: { label: 'Private School', icon: School, desc: 'Secondary School Fees' },
        polytech: { label: 'Polytech / Trade', icon: BookOpen, desc: 'Vocational Training' }
    };

    const LIVING_SITUATIONS = {
        home: { label: 'Live at Home', icon: Home, desc: 'Low cost (food & transport)' },
        renting: { label: 'Flatting / Renting', icon: Building2, desc: 'Moderate cost (rent + utilities)' },
        campus: { label: 'Halls of Residence', icon: School, desc: 'High cost (catered + social)' }
    };

    // Sync with initialValues
    useEffect(() => {
        if (initialValues.goal_details || initialValues.goal_name) {
            setFormData(prev => {
                const newVal = {
                    goal_name: initialValues.goal_name || prev.goal_name,
                    student_type: initialValues.goal_details?.student_type || prev.student_type,
                    student_name: initialValues.goal_details?.student_name || prev.student_name,
                    current_age: initialValues.goal_details?.current_age || prev.current_age,
                    start_year: initialValues.goal_details?.start_year || prev.start_year,
                    institution_type: initialValues.goal_details?.institution_type || prev.institution_type,
                    living_situation: initialValues.goal_details?.living_situation || prev.living_situation,
                    duration_years: initialValues.goal_details?.duration_years || prev.duration_years,
                    target_amount: initialValues.target_amount || prev.target_amount,
                    due_date: initialValues.due_date || prev.due_date
                };

                // Strict Equality Check to Avoid Loop
                if (JSON.stringify(newVal) === JSON.stringify(prev)) return prev;

                return newVal;
            });
        }
    }, [initialValues]);

    // Auto-calculate Start Year based on Age
    useEffect(() => {
        if (formData.student_type === 'child') {
            // Assume University starts at 18, Private School starts at 13 (Year 9)
            const targetAge = formData.institution_type === 'private_school' ? 13 : 18;
            const yearsUntilStart = Math.max(0, targetAge - formData.current_age);
            const autoStartYear = new Date().getFullYear() + yearsUntilStart;
            
            if (autoStartYear !== formData.start_year) {
                setFormData(prev => ({ ...prev, start_year: autoStartYear }));
            }
        }
    }, [formData.current_age, formData.student_type, formData.institution_type]);

    // Propagate changes
    useEffect(() => {
        onChange?.({
            goal_name: formData.goal_name,
            target_amount: formData.target_amount, 
            due_date: formData.due_date,
            goal_details: {
                student_type: formData.student_type,
                student_name: formData.student_name,
                current_age: formData.current_age,
                start_year: formData.start_year,
                institution_type: formData.institution_type,
                living_situation: formData.living_situation,
                duration_years: formData.duration_years
            }
        });
    }, [formData]);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-violet-50 to-purple-100/50 rounded-3xl p-6 border border-violet-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                        <GraduationCap size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Define Education Vision</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Who is this for? Where will they study? Let's build the picture.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Left Col: Who & When */}
                 <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                            placeholder="e.g. Jack's University Fund"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Student Profile</label>
                        <div className="bg-slate-50 rounded-2xl p-2 flex gap-2 border border-slate-200">
                            {['child', 'self'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, student_type: type }))}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                        formData.student_type === type 
                                        ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-100' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {type === 'child' ? <Baby size={18}/> : <Users size={18}/>}
                                    {type === 'child' ? 'My Child' : 'Myself'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {formData.student_type === 'child' && (
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-2 gap-4 shadow-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Child's Name</label>
                                <input 
                                    type="text" 
                                    value={formData.student_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                                    className="w-full font-bold text-slate-700 border-b border-slate-200 focus:border-violet-500 outline-none py-1"
                                    placeholder="Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Age</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min={0} max={18}
                                        value={formData.current_age}
                                        onChange={(e) => setFormData(prev => ({ ...prev, current_age: Number(e.target.value) }))}
                                        className="w-full font-bold text-slate-700 border-b border-slate-200 focus:border-violet-500 outline-none py-1"
                                    />
                                    <span className="text-xs text-slate-400">years</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-2xl flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg text-violet-400 shadow-sm">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-violet-500 uppercase tracking-wider">Estimated Start</div>
                            <div className="text-xl font-black text-slate-900">{formData.start_year}</div>
                        </div>
                         <div className="ml-auto text-xs text-slate-400 text-right">
                             Target Date<br/>
                             <strong>Feb {formData.start_year}</strong>
                         </div>
                    </div>
                 </div>

                 {/* Right Col: What & Where */}
                 <div className="space-y-6">
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Institution</label>
                         <div className="grid grid-cols-2 gap-3">
                            {Object.entries(INSTITUTION_TYPES).map(([id, type]) => (
                                <div
                                    key={id}
                                    onClick={() => setFormData(prev => ({ ...prev, institution_type: id }))}
                                    className={`cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md ${
                                        formData.institution_type === id 
                                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' 
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg shrink-0 ${formData.institution_type === id ? 'bg-violet-200 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                                        <type.icon size={16} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900 leading-tight mb-1">{type.label}</div>
                                        <div className="text-[10px] text-slate-500 leading-tight">{type.desc}</div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* Only show living situation for tertiary */}
                    {formData.institution_type !== 'private_school' && (
                        <div className="animate-fade-in">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Living Situation</label>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                {Object.entries(LIVING_SITUATIONS).map(([id, type]) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, living_situation: id }))}
                                        className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                                            formData.living_situation === id
                                            ? 'bg-white text-violet-700 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <type.icon size={14} />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-slate-700">Course Duration</label>
                            <span className="text-xl font-bold text-violet-600">{formData.duration_years} Years</span>
                        </div>
                        <input 
                            type="range" min={1} max={7} step={1}
                            value={formData.duration_years}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration_years: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                         <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>1y (Cert)</span>
                            <span>3y (Bach)</span>
                            <span>6y (Med/Law)</span>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200">
                    Save & Continue
                </button>
            </div>
        </form>
    );
};

export default EducationVisionForm;