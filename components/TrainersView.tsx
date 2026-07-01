import { useState } from 'react';
import { Plus, CheckCircle, Activity, IndianRupee, Award, Users, Clock, ArrowLeft, Edit, FileText, RefreshCw, X, Camera, Contact } from 'lucide-react';
import { Trainer, Member } from '@/lib/db';
import { useToast } from '@/components/Toast';

interface TrainersViewProps {
  trainers: Trainer[];
  members: Member[];
  onAddTrainer: (trainer: Trainer) => Promise<any>;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

export default function TrainersView({ trainers, members, onAddTrainer, isLightMode, role }: TrainersViewProps) {
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (selectedTrainer) {
    // Find members assigned to this trainer
    const assignedMembers = members.filter(m => m.trainer && m.trainer.includes(selectedTrainer.name));
    return (
      <TrainerProfile 
        trainer={selectedTrainer} 
        assignedMembers={assignedMembers}
        onBack={() => setSelectedTrainer(null)} 
        isLightMode={isLightMode}
        role={role}
      />
    );
  }

  // Calculate live stats
  const activeTrainersCount = trainers.filter(t => t.status === 'Active').length;
  // Pt sessions/revenue can be derived or real data
  const ptSessionsCount = "N/A";
  const ptRevenueGenerated = "N/A";

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Trainers Dashboard
        </h1>
        <div className="flex gap-3">
          {role === 'admin' && (
          <button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
            <Plus size={16} /> Add Trainer
          </button>
          )}
        </div>
      </header>

      {/* Overview Stats */}
      <div className={`grid grid-cols-1 ${role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>
        <div className="bg-surface border border-border-color rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><CheckCircle size={20} /></div>
             <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Active Trainers</h3>
           </div>
           <div className={`text-3xl font-heading font-black ${isLightMode ? 'text-black' : 'text-white'} pl-12 tracking-tight`}>{activeTrainersCount}</div>
        </div>
        <div className="bg-surface border border-border-color rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><Activity size={20} /></div>
             <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">PT Sessions (Month)</h3>
           </div>
           <div className={`text-3xl font-heading font-black ${isLightMode ? 'text-black' : 'text-white'} pl-12 tracking-tight`}>{ptSessionsCount}</div>
        </div>
        {role === 'admin' && (
          <div className="bg-surface border border-border-color rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><IndianRupee size={20} /></div>
               <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">PT Revenue</h3>
             </div>
             <div className={`text-3xl font-heading font-black ${isLightMode ? 'text-black' : 'text-white'} pl-12 tracking-tight`}>{ptRevenueGenerated}</div>
          </div>
        )}
      </div>

      <h2 className={`font-semibold mb-4 text-[15px] uppercase tracking-wider font-heading ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Our Trainers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {trainers.map(trainer => (
           <div 
             key={trainer.id} 
             onClick={() => setSelectedTrainer(trainer)}
             className={`bg-[#0D0D0D] border-x border-b border-t-2 rounded-xl overflow-hidden hover:bg-surface/50 transition-all cursor-pointer relative ${
               trainer.status === 'Active' ? 'border-primary/50 border-t-primary shadow-[0_0_15px_rgba(255,51,51,0.05)]' : 'border-border-color border-t-text-secondary/50'
             }`}
           >
             <div className="absolute top-4 right-4 flex items-center justify-center">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                      trainer.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-[#fff] text-[#000]'
                    }`}>
                      {trainer.status}
                  </span>
             </div>
             <div className="p-6">
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border-color/50">
                  <div className={`w-16 h-16 rounded-full bg-surface border-2 flex items-center justify-center font-heading font-bold text-2xl shrink-0 ${
                    trainer.status === 'Active' ? 'border-primary text-white' : 'border-border-color text-text-secondary'
                  }`}>
                    {trainer.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-lg">{trainer.name}</h3>
                    <div className="text-primary text-sm font-medium mt-0.5">{trainer.specialization}</div>
                  </div>
                </div>
                
                <div className="space-y-3 text-[13px] text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Award size={15}/> Experience:</span>
                    <span className="text-white font-medium">{trainer.experience}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Users size={15}/> Members Assigned:</span>
                    <span className="text-white font-medium">{trainer.membersCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Clock size={15}/> Timings:</span>
                    <span className="text-white font-medium">{trainer.timing}</span>
                  </div>
                </div>
             </div>
           </div>
         ))}
      </div>

      <AddTrainerModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={onAddTrainer} />
    </div>
  );
}

function TrainerProfile({ trainer, assignedMembers, onBack, isLightMode, role }: any) {
  return (
    <div className="w-full pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm mb-6 font-semibold">
        <ArrowLeft size={16} /> Back to Trainers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
            {/* Header Profile Card */}
            <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden relative shadow-md`}>
              <div className="h-20 bg-primary/20 w-full relative">
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface"></div>
              </div>
              <div className="px-6 pb-6 relative pt-12">
                 <div className="absolute -top-12 left-6 w-24 h-24 rounded-full bg-[#0D0D0D] border-4 border-surface flex items-center justify-center font-heading text-3xl font-bold text-primary shrink-0">
                   {trainer.name.split(' ').map((n: string) => n[0]).join('')}
                 </div>
                 <h2 className={`font-heading text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'} mt-2`}>{trainer.name}</h2>
                 <p className="text-primary text-sm font-medium mt-0.5">{trainer.specialization}</p>
                 <p className="text-xs text-text-secondary mt-3">{trainer.bio}</p>
                 
                 <div className="mt-5 space-y-2.5 text-sm border-t border-border-color pt-4 text-text-secondary">
                    <div className="flex justify-between">
                       <span>Phone</span>
                       <span className="text-white font-medium">{trainer.phone}</span>
                    </div>
                    {role === 'admin' && (
                      <div className="flex justify-between">
                         <span>Salary</span>
                         <span className="text-white font-medium">{trainer.salary}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                       <span>Shift</span>
                       <span className="text-white font-medium">{trainer.timing}</span>
                    </div>
                 </div>
              </div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
             <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
                 <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Assigned Members</h3>
                 <span className="text-xs text-primary font-semibold">{assignedMembers.length} Members</span>
             </div>
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-medium">Member Name</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {assignedMembers.map((m: Member, i: number) => (
                    <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                      <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'} flex items-center gap-3`}>
                         <div className="w-6 h-6 rounded-full bg-surface border border-border-color text-primary flex items-center justify-center font-heading font-bold text-[10px] uppercase">
                           {m.name[0]}
                         </div>
                         {m.name}
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{m.phone}</td>
                      <td className="px-5 py-3 text-text-secondary">{m.plan}</td>
                      <td className="px-5 py-3 text-right">
                         <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${
                            m.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-primary'
                          }`}>
                            {m.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {assignedMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-text-secondary">No members assigned to this trainer yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}

function AddTrainerModal({ isOpen, onClose, onAdd }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('Weight Training');
  const [experience, setExperience] = useState('3');
  const [salary, setSalary] = useState('30000');
  const [timing, setTiming] = useState('06:00 AM - 02:00 PM');
  const [bio, setBio] = useState('');

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await onAdd({
        name,
        phone,
        specialization,
        experience: `${experience} Years`,
        membersCount: 0,
        status: 'Active',
        salary: `₹${parseInt(salary).toLocaleString('en-IN')}`,
        timing,
        bio
      });
      setName('');
      setPhone('');
      setBio('');
      onClose();
      showToast('Trainer added successfully', 'success');
    } catch (err) {
      showToast('Failed to add trainer', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-color rounded-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Plus size={20} className="text-primary"/> Add New Trainer
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-6">
          <form id="add-trainer-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2 text-center flex flex-col items-center gap-3 mb-2">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-border-color bg-[#0D0D0D] flex flex-col items-center justify-center text-text-secondary cursor-pointer hover:text-primary hover:border-primary/50 transition-all">
                     <Camera size={24} className="mb-1" />
                     <span className="text-[10px] uppercase font-bold tracking-wider">Photo</span>
                  </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Full Name</label>
                 <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter trainer name" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Phone Number</label>
                 <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter phone" />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Specialization</label>
                 <select value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   <option>Weight Training</option>
                   <option>Yoga & Pilates</option>
                   <option>CrossFit</option>
                   <option>Cardio</option>
                   <option>General Fitness</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Experience (Years)</label>
                 <input required type="number" value={experience} onChange={e => setExperience(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. 5" />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Monthly Base Salary</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                   <input required type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="0" />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Availability Timing</label>
                 <input required type="text" value={timing} onChange={e => setTiming(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. 06:00 AM - 02:00 PM" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Short Bio / Expertise Profile</label>
                 <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-3 text-sm text-white focus:border-primary/50 focus:outline-none resize-none" rows={3} placeholder="Describe the trainer's background, certifications, and approach..." />
              </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white hover:bg-surface transition-colors">Cancel</button>
          <button type="submit" form="add-trainer-form" className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">Register Trainer</button>
        </div>
      </div>
    </div>
  );
}
