import { useState } from 'react';
import { Plus, CheckCircle, Activity, IndianRupee, Award, Users, Clock, ArrowLeft, Edit, Trash2, X, Camera, Save, Sun, Moon, AlertTriangle, UserPlus, UserMinus, Search } from 'lucide-react';
import { Trainer, Member } from '@/lib/db';
import { useToast } from '@/components/Toast';

interface TrainersViewProps {
  trainers: Trainer[];
  members: Member[];
  onAddTrainer: (trainer: Trainer) => Promise<any>;
  onUpdateTrainer: (id: string, data: Partial<Trainer>) => Promise<void>;
  onDeleteTrainer: (id: string) => Promise<void>;
  onUpdateMember: (id: string, data: Partial<Member>) => Promise<any>;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

export default function TrainersView({ trainers, members, onAddTrainer, onUpdateTrainer, onDeleteTrainer, onUpdateMember, isLightMode, role }: TrainersViewProps) {
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (selectedTrainer) {
    // Find members assigned to this trainer
    const assignedMembers = members.filter(m => m.trainer && m.trainer.includes(selectedTrainer.name));
    return (
      <TrainerProfile 
        trainer={selectedTrainer} 
        assignedMembers={assignedMembers}
        allMembers={members}
        onBack={() => setSelectedTrainer(null)} 
        onUpdateTrainer={onUpdateTrainer}
        onDeleteTrainer={onDeleteTrainer}
        onUpdateMember={onUpdateMember}
        onTrainerUpdated={(updated: Trainer) => setSelectedTrainer(updated)}
        isLightMode={isLightMode}
        role={role}
      />
    );
  }

  // Calculate live stats
  const activeTrainersCount = trainers.filter(t => t.status === 'Active').length;
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
                    <span className="text-white font-medium">{members.filter(m => m.trainer && m.trainer.includes(trainer.name)).length}</span>
                  </div>
                  {/* Shift display on card */}
                  {trainer.shifts ? (
                    <div className="space-y-1.5 pt-1">
                      {trainer.shifts.morning?.enabled && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><Sun size={14} className="text-amber-400"/> Morning:</span>
                          <span className="text-white font-medium text-xs">{trainer.shifts.morning.start} – {trainer.shifts.morning.end}</span>
                        </div>
                      )}
                      {trainer.shifts.evening?.enabled && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><Moon size={14} className="text-indigo-400"/> Evening:</span>
                          <span className="text-white font-medium text-xs">{trainer.shifts.evening.start} – {trainer.shifts.evening.end}</span>
                        </div>
                      )}
                      {!trainer.shifts.morning?.enabled && !trainer.shifts.evening?.enabled && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><Clock size={15}/> Shift:</span>
                          <span className="text-text-secondary font-medium italic text-xs">Not assigned</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Clock size={15}/> Timings:</span>
                      <span className="text-white font-medium">{trainer.timing}</span>
                    </div>
                  )}
                </div>
             </div>
           </div>
         ))}
      </div>

      <AddTrainerModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={onAddTrainer} />
    </div>
  );
}

// ─── Shift Editor Component ────────────────────────────────────────────────────

function ShiftEditor({ shifts, onChange, disabled }: { 
  shifts: Trainer['shifts']; 
  onChange: (shifts: Trainer['shifts']) => void;
  disabled?: boolean;
}) {
  const currentShifts = shifts || {
    morning: { enabled: false, start: '06:00', end: '12:00' },
    evening: { enabled: false, start: '16:00', end: '22:00' },
  };

  const updateShift = (shiftType: 'morning' | 'evening', field: string, value: any) => {
    const updated = { ...currentShifts };
    if (!updated[shiftType]) {
      updated[shiftType] = { enabled: false, start: shiftType === 'morning' ? '06:00' : '16:00', end: shiftType === 'morning' ? '12:00' : '22:00' };
    }
    (updated[shiftType] as any)[field] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Morning Shift */}
      <div className={`border rounded-lg p-4 transition-all ${currentShifts.morning?.enabled ? 'border-amber-500/40 bg-amber-500/5' : 'border-border-color bg-[#0D0D0D]/50 opacity-60'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-white">Morning Shift</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={currentShifts.morning?.enabled || false} 
              onChange={e => updateShift('morning', 'enabled', e.target.checked)}
              disabled={disabled}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
        {currentShifts.morning?.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-secondary uppercase">Start Time</label>
              <input 
                type="time" value={currentShifts.morning.start} 
                onChange={e => updateShift('morning', 'start', e.target.value)}
                disabled={disabled}
                className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-secondary uppercase">End Time</label>
              <input 
                type="time" value={currentShifts.morning.end} 
                onChange={e => updateShift('morning', 'end', e.target.value)}
                disabled={disabled}
                className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Evening Shift */}
      <div className={`border rounded-lg p-4 transition-all ${currentShifts.evening?.enabled ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-border-color bg-[#0D0D0D]/50 opacity-60'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white">Evening Shift</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={currentShifts.evening?.enabled || false} 
              onChange={e => updateShift('evening', 'enabled', e.target.checked)}
              disabled={disabled}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>
        {currentShifts.evening?.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-secondary uppercase">Start Time</label>
              <input 
                type="time" value={currentShifts.evening.start} 
                onChange={e => updateShift('evening', 'start', e.target.value)}
                disabled={disabled}
                className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-secondary uppercase">End Time</label>
              <input 
                type="time" value={currentShifts.evening.end} 
                onChange={e => updateShift('evening', 'end', e.target.value)}
                disabled={disabled}
                className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trainer Profile ────────────────────────────────────────────────────────────

function TrainerProfile({ trainer, assignedMembers, allMembers, onBack, onUpdateTrainer, onDeleteTrainer, onUpdateMember, onTrainerUpdated, isLightMode, role }: any) {
  const { showToast } = useToast();
  const [isEditingShifts, setIsEditingShifts] = useState(false);
  const [editShifts, setEditShifts] = useState<Trainer['shifts']>(trainer.shifts);
  const [savingShifts, setSavingShifts] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const handleSaveShifts = async () => {
    setSavingShifts(true);
    try {
      // Build a timing string from the shifts for backward compatibility
      const parts: string[] = [];
      if (editShifts?.morning?.enabled) parts.push(`${editShifts.morning.start} - ${editShifts.morning.end}`);
      if (editShifts?.evening?.enabled) parts.push(`${editShifts.evening.start} - ${editShifts.evening.end}`);
      const timing = parts.join(' | ') || 'Not assigned';

      await onUpdateTrainer(trainer.id, { shifts: editShifts, timing });
      onTrainerUpdated({ ...trainer, shifts: editShifts, timing });
      setIsEditingShifts(false);
      showToast('Shifts updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update shifts', 'error');
    } finally {
      setSavingShifts(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDeleteTrainer(trainer.id);
      showToast('Trainer removed successfully', 'success');
      onBack();
    } catch (err) {
      showToast('Failed to remove trainer', 'error');
    }
  };

  const handleAssignMember = async (member: Member) => {
    if (!member.id) return;
    setAssigningId(member.id);
    try {
      const trainerValue = `${trainer.name} (${trainer.specialization || trainer.specialty || ''})`;
      await onUpdateMember(member.id, { trainer: trainerValue });
      showToast(`${member.name} assigned to ${trainer.name}`, 'success');
    } catch (err) {
      showToast('Failed to assign member', 'error');
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassignMember = async (member: Member) => {
    if (!member.id) return;
    setUnassigningId(member.id);
    try {
      await onUpdateMember(member.id, { trainer: 'None' });
      showToast(`${member.name} unassigned from ${trainer.name}`, 'success');
    } catch (err) {
      showToast('Failed to unassign member', 'error');
    } finally {
      setUnassigningId(null);
    }
  };

  // Members not assigned to any trainer or assigned to a different trainer
  const unassignedMembers = allMembers.filter((m: Member) => {
    if (!m.trainer || m.trainer === 'None') return true;
    return false;
  });

  const filteredUnassigned = unassignedMembers.filter((m: Member) => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.phone.includes(memberSearch)
  );

  const formatShiftDisplay = () => {
    if (!trainer.shifts) return trainer.timing;
    const parts: string[] = [];
    if (trainer.shifts.morning?.enabled) parts.push(`Morning: ${trainer.shifts.morning.start} – ${trainer.shifts.morning.end}`);
    if (trainer.shifts.evening?.enabled) parts.push(`Evening: ${trainer.shifts.evening.start} – ${trainer.shifts.evening.end}`);
    return parts.length > 0 ? parts.join('  •  ') : 'Not assigned';
  };

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
                       <span>Experience</span>
                       <span className="text-white font-medium">{trainer.experience}</span>
                    </div>
                    <div className="flex justify-between">
                       <span>Status</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${trainer.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{trainer.status}</span>
                    </div>
                    <div className="flex justify-between">
                       <span>Assigned Members</span>
                       <span className="text-primary font-bold">{assignedMembers.length}</span>
                    </div>
                 </div>

                 {/* Admin Actions */}
                 {role === 'admin' && (
                   <div className="mt-4 pt-4 border-t border-border-color flex gap-2">
                     <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                       <Trash2 size={14} /> Remove Trainer
                     </button>
                   </div>
                 )}
              </div>
            </div>

            {/* Shift Schedule Card */}
            <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden shadow-md`}>
              <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
                <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                  <Clock size={15} /> Shift Schedule
                </h3>
                {role === 'admin' && !isEditingShifts && (
                  <button onClick={() => { setEditShifts(trainer.shifts); setIsEditingShifts(true); }} className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1 font-semibold">
                    <Edit size={12} /> Edit
                  </button>
                )}
              </div>
              <div className="p-5">
                {isEditingShifts ? (
                  <div className="space-y-4">
                    <ShiftEditor shifts={editShifts} onChange={setEditShifts} />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setIsEditingShifts(false)} className="flex-1 px-3 py-2 rounded-md text-xs font-semibold text-text-secondary hover:text-white hover:bg-surface transition-colors border border-border-color">
                        Cancel
                      </button>
                      <button onClick={handleSaveShifts} disabled={savingShifts} className="flex-1 px-3 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                        <Save size={13} /> {savingShifts ? 'Saving...' : 'Save Shifts'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trainer.shifts?.morning?.enabled ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Sun size={18} className="text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Morning Shift</div>
                          <div className="text-white text-sm font-medium mt-0.5">{trainer.shifts.morning.start} – {trainer.shifts.morning.end}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0D0D0D]/50 border border-border-color/50">
                        <Sun size={18} className="text-text-secondary shrink-0 opacity-40" />
                        <div>
                          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Morning Shift</div>
                          <div className="text-text-secondary text-sm italic mt-0.5">{trainer.shifts ? 'Disabled' : (trainer.timing || 'Not set')}</div>
                        </div>
                      </div>
                    )}
                    {trainer.shifts?.evening?.enabled ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                        <Moon size={18} className="text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Evening Shift</div>
                          <div className="text-white text-sm font-medium mt-0.5">{trainer.shifts.evening.start} – {trainer.shifts.evening.end}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0D0D0D]/50 border border-border-color/50">
                        <Moon size={18} className="text-text-secondary shrink-0 opacity-40" />
                        <div>
                          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Evening Shift</div>
                          <div className="text-text-secondary text-sm italic mt-0.5">Disabled</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Assigned Members Section */}
           <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
             <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
                 <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                   <Users size={15} /> Assigned Members
                 </h3>
                 <div className="flex items-center gap-3">
                   <span className="text-xs text-primary font-semibold">{assignedMembers.length} Members</span>
                   {role === 'admin' && (
                     <button 
                       onClick={() => setShowAssignModal(true)} 
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                     >
                       <UserPlus size={13} /> Assign Member
                     </button>
                   )}
                 </div>
             </div>

             {assignedMembers.length > 0 ? (
               <div className="divide-y divide-border-color/50">
                 {assignedMembers.map((m: Member, i: number) => (
                   <div key={m.id || i} className="px-5 py-4 hover:bg-[#0D0D0D]/30 transition-colors">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm uppercase shrink-0 ${
                           m.status === 'Active' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface border border-border-color text-text-secondary'
                         }`}>
                           {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                         </div>
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2">
                             <span className={`font-semibold text-sm truncate ${isLightMode ? 'text-black' : 'text-white'}`}>{m.name}</span>
                             <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                               m.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'
                             }`}>
                               {m.status}
                             </span>
                           </div>
                           <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                             <span>{m.phone}</span>
                             <span>•</span>
                             <span>{m.plan}</span>
                             <span>•</span>
                             <span>Expires: {m.expiryDate || 'N/A'}</span>
                           </div>
                         </div>
                       </div>
                       {role === 'admin' && (
                         <button 
                           onClick={() => handleUnassignMember(m)}
                           disabled={unassigningId === m.id}
                           className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                         >
                           <UserMinus size={13} /> {unassigningId === m.id ? 'Removing...' : 'Unassign'}
                         </button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="px-5 py-12 text-center">
                 <Users size={32} className="mx-auto text-text-secondary/30 mb-3" />
                 <p className="text-text-secondary text-sm">No members assigned to this trainer yet.</p>
                 {role === 'admin' && (
                   <button onClick={() => setShowAssignModal(true)} className="mt-3 text-xs text-primary font-semibold hover:underline">
                     + Assign a member
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Assign Member Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={20} className="text-primary"/> Assign Member to {trainer.name}
              </h2>
              <button onClick={() => { setShowAssignModal(false); setMemberSearch(''); }} className="text-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-border-color">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text" 
                  value={memberSearch} 
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-9 pr-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 no-scrollbar">
              {filteredUnassigned.length > 0 ? (
                <div className="divide-y divide-border-color/50">
                  {filteredUnassigned.map((m: Member) => (
                    <div key={m.id} className="px-6 py-3 hover:bg-[#0D0D0D]/30 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border-color text-primary flex items-center justify-center font-heading font-bold text-[10px] uppercase shrink-0">
                          {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{m.name}</div>
                          <div className="text-xs text-text-secondary">{m.phone} • {m.plan}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssignMember(m)}
                        disabled={assigningId === m.id}
                        className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <UserPlus size={12} /> {assigningId === m.id ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-text-secondary text-sm">
                    {memberSearch ? 'No matching unassigned members found.' : 'All members are currently assigned to a trainer.'}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-border-color bg-[#0D0D0D]/50 text-xs text-text-secondary">
              {unassignedMembers.length} unassigned member{unassignedMembers.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
              <h3 className="font-heading text-lg font-bold text-white">Remove Trainer</h3>
            </div>
            <p className="text-text-secondary text-sm mb-6">
              Are you sure you want to remove <span className="text-white font-semibold">{trainer.name}</span>? 
              {assignedMembers.length > 0 && (
                <span className="text-amber-400"> This trainer has {assignedMembers.length} assigned member{assignedMembers.length !== 1 ? 's' : ''} who will be unassigned.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white hover:bg-[#0D0D0D] transition-colors border border-border-color">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Trainer Modal ──────────────────────────────────────────────────────────

function AddTrainerModal({ isOpen, onClose, onAdd }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('Weight Training');
  const [experience, setExperience] = useState('3');
  const [salary, setSalary] = useState('30000');
  const [bio, setBio] = useState('');
  const [shifts, setShifts] = useState<Trainer['shifts']>({
    morning: { enabled: true, start: '06:00', end: '12:00' },
    evening: { enabled: false, start: '16:00', end: '22:00' },
  });

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      // Build timing string from shifts for backward compatibility
      const parts: string[] = [];
      if (shifts?.morning?.enabled) parts.push(`${shifts.morning.start} - ${shifts.morning.end}`);
      if (shifts?.evening?.enabled) parts.push(`${shifts.evening.start} - ${shifts.evening.end}`);
      const timing = parts.join(' | ') || 'Not assigned';

      await onAdd({
        name,
        phone,
        specialization,
        experience: `${experience} Years`,
        membersCount: 0,
        status: 'Active',
        salary: `₹${parseInt(salary).toLocaleString('en-IN')}`,
        timing,
        bio,
        shifts
      });
      setName('');
      setPhone('');
      setBio('');
      setShifts({
        morning: { enabled: true, start: '06:00', end: '12:00' },
        evening: { enabled: false, start: '16:00', end: '22:00' },
      });
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
                 {/* Empty cell for grid alignment */}
              </div>

              {/* Shift Schedule Section */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-2">
                  <Clock size={13} /> Shift Schedule
                </label>
                <ShiftEditor shifts={shifts} onChange={setShifts} />
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
