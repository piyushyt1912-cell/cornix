import { useState, useEffect } from 'react';
import { 
  Search, Plus, Eye, Edit, Printer, MessageCircle, Trash2, 
  ChevronUp, ChevronDown, ArrowLeft, Calendar, Contact, FileText, 
  RefreshCw, Camera, Fingerprint, X, UserPlus, AlertTriangle, CheckCircle2, Clock,
  Archive, RotateCcw, UserX, Send, Download, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Trainer, RemovedMember, Receipt, addReceipt, getReceiptsByMember } from '@/lib/db';
import { useToast } from '@/components/Toast';

interface MembersViewProps {
  members: Member[];
  trainers: Trainer[];
  onAddMember: (member: any) => Promise<any>;
  onUpdateMember: (id: string, member: any) => Promise<any>;
  onDeleteMember: (id: string) => Promise<any>;
  onRemoveMember: (member: Member, reason: string) => Promise<any>;
  removedMembers: RemovedMember[];
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
  settings?: any;
}

export default function MembersView({ members, trainers, onAddMember, onUpdateMember, onDeleteMember, onRemoveMember, removedMembers, isLightMode, role, settings }: MembersViewProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [receiptMember, setReceiptMember] = useState<Member | null>(null);
  const [showRemovedMembers, setShowRemovedMembers] = useState(false);

  // Removal reason modal state
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeLoading, setRemoveLoading] = useState(false);

  if (selectedMember) {
    // We pass dynamic updates so renewals and updates also work on profile
    return (
      <MemberProfile 
        member={selectedMember} 
        onBack={() => setSelectedMember(null)} 
        onUpdate={async (updatedData: any) => {
          if (selectedMember.id) {
            await onUpdateMember(selectedMember.id, updatedData);
            setSelectedMember({ ...selectedMember, ...updatedData });
          }
        }}
        trainers={trainers}
        isLightMode={isLightMode}
        settings={settings}
      />
    );
  }

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sort.key === key && sort.direction === 'asc') direction = 'desc';
    setSort({ key, direction });
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    const matchFilter = filter === 'All' || m.status === filter;
    return matchSearch && matchFilter;
  }).sort((a: any, b: any) => {
    let aVal = a[sort.key] || '';
    let bVal = b[sort.key] || '';
    if (sort.key === 'expiryDate') {
      aVal = new Date(aVal || '1970-01-01').getTime();
      bVal = new Date(bVal || '1970-01-01').getTime();
    }
    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Members <span className="text-[12px] text-text-secondary ml-2 font-normal font-sans">(सदस्य)</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`bg-surface border ${isLightMode ? 'border-gray-200 text-black' : 'border-border-color text-white'} rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50 w-[200px] lg:w-[250px]`}
            />
          </div>
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className={`bg-surface border ${isLightMode ? 'border-gray-200 text-black' : 'border-border-color text-text-secondary'} rounded-md py-2 px-3 text-sm focus:outline-none focus:border-primary/50`}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Paused">Paused</option>
          </select>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </header>

      {/* Table */}
      <div className={`flex-1 bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden flex flex-col`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`bg-[#0D0D0D]/50 border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-text-secondary text-[11px] uppercase tracking-wider`}>
              <tr>
                <th className="px-5 py-4 font-medium" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    Member {sort.key === 'name' && (sort.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                  </div>
                </th>
                <th className="px-5 py-4 font-medium">Contact</th>
                <th className="px-5 py-4 font-medium">Plan</th>
                <th className="px-5 py-4 font-medium">Joined</th>
                <th className="px-5 py-4 font-medium" onClick={() => handleSort('expiryDate')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    Expires {sort.key === 'expiryDate' && (sort.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                  </div>
                </th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium text-center">Status</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
               {filteredMembers.map((m: Member) => (
                 <tr key={m.id} className="hover:bg-[#0D0D0D]/50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0D0D0D] border border-border-color text-primary flex items-center justify-center font-heading font-bold text-xs uppercase">
                          {m.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className={`font-medium ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{m.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{m.phone}</td>
                    <td className="px-5 py-3 text-text-secondary">{m.plan}</td>
                    <td className="px-5 py-3 text-text-secondary">{m.startDate}</td>
                    <td className="px-5 py-3 text-text-secondary">{m.expiryDate}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-secondary">{m.amount}</span>
                        {(m.dueAmount ?? 0) > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-500/15 text-orange-500 tracking-wide">
                            Due ₹{m.dueAmount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        m.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                        m.status === 'Expired' ? 'bg-red-500/10 text-primary' :
                        'bg-orange-500/10 text-orange-500'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-text-secondary">
                        <button onClick={() => setSelectedMember(m)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors" title="View Profile">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => setSelectedMember(m)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => setReceiptMember(m)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors" title="Generate Receipt">
                          <Printer size={16} />
                        </button>
                        <a href={`https://wa.me/${m.phone}?text=Hello ${m.name}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:text-green-500 hover:bg-border-color rounded transition-colors" title="WhatsApp">
                          <MessageCircle size={16} />
                        </a>
                        {role === 'admin' && (
                        <button 
                          onClick={() => setRemoveMember(m)}
                          className="p-1.5 hover:text-primary hover:bg-border-color rounded transition-colors" title="Remove Member">
                          <UserX size={16} />
                        </button>
                        )}
                      </div>
                    </td>
                 </tr>
               ))}
               {filteredMembers.length === 0 && (
                 <tr>
                   <td colSpan={8} className="px-5 py-8 text-center text-text-secondary">No members found.</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Removed Members History Toggle */}
      {role === 'admin' && (
        <>
          <div className="mt-6">
            <button
              onClick={() => setShowRemovedMembers(!showRemovedMembers)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                showRemovedMembers
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : `${isLightMode ? 'bg-white border-gray-200 text-gray-600 hover:text-gray-900' : 'bg-surface border-border-color text-text-secondary hover:text-white'}`
              }`}
            >
              <Archive size={16} />
              Removed Members ({removedMembers.length})
              <ChevronDown size={14} className={`transition-transform ${showRemovedMembers ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Removed Members Table */}
          <AnimatePresence>
            {showRemovedMembers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-4"
              >
                <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
                  <div className={`px-5 py-3 border-b ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-border-color bg-[#0D0D0D]/30'} flex items-center gap-2`}>
                    <Archive size={16} className="text-primary" />
                    <h3 className={`font-heading text-sm font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Removed Members History</h3>
                  </div>
                  {removedMembers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className={`bg-[#0D0D0D]/50 border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-text-secondary text-[11px] uppercase tracking-wider`}>
                          <tr>
                            <th className="px-5 py-3 font-medium">Member</th>
                            <th className="px-5 py-3 font-medium">Contact</th>
                            <th className="px-5 py-3 font-medium">Plan</th>
                            <th className="px-5 py-3 font-medium">Reason for Removal</th>
                            <th className="px-5 py-3 font-medium">Removed On</th>
                            <th className="px-5 py-3 font-medium">Removed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                          {removedMembers.map((rm) => (
                            <tr key={rm.id} className="hover:bg-[#0D0D0D]/30 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-heading font-bold text-xs uppercase">
                                    {rm.name.split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                  <span className={`font-medium ${isLightMode ? 'text-gray-600 line-through' : 'text-text-secondary line-through'}`}>{rm.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-text-secondary">{rm.phone}</td>
                              <td className="px-5 py-3 text-text-secondary">{rm.plan} ({rm.amount})</td>
                              <td className="px-5 py-3">
                                <span className={`text-xs px-2 py-1 rounded-md ${isLightMode ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'} font-medium max-w-[200px] truncate inline-block`}>
                                  {rm.reason}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-text-secondary">{rm.removedDate}</td>
                              <td className="px-5 py-3 text-text-secondary text-xs">{rm.removedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center text-text-secondary text-sm">
                      No members have been removed yet.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AddMemberModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onAdd={onAddMember}
        trainers={trainers}
        isLightMode={isLightMode}
        settings={settings}
        onShowReceipt={(m: Member) => setReceiptMember(m)}
      />

      {/* Removal Reason Modal */}
      <AnimatePresence>
        {removeMember && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border-color rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-border-color bg-[#0D0D0D]/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <UserX size={20} className="text-red-400" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-white">Remove Member</h2>
                  <p className="text-xs text-text-secondary">This will move the member to removed list</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Member info being removed */}
                <div className={`p-3 rounded-lg border ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-[#0D0D0D] border-border-color'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm">
                      {removeMember.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{removeMember.name}</p>
                      <p className="text-xs text-text-secondary">{removeMember.phone} • {removeMember.plan}</p>
                    </div>
                  </div>
                </div>

                {/* Reason input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Reason for Removal <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={removeReason.startsWith('custom:') ? 'other' : removeReason}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setRemoveReason('custom:');
                      } else {
                        setRemoveReason(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0D0D0D] border border-border-color rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Non-payment / Fee dues">Non-payment / Fee dues</option>
                    <option value="Member requested cancellation">Member requested cancellation</option>
                    <option value="Shifted to another city">Shifted to another city</option>
                    <option value="Health / Medical reasons">Health / Medical reasons</option>
                    <option value="Violation of gym rules">Violation of gym rules</option>
                    <option value="Misbehavior / Misconduct">Misbehavior / Misconduct</option>
                    <option value="Duplicate entry">Duplicate entry</option>
                    <option value="Membership expired - no renewal">Membership expired - no renewal</option>
                    <option value="other">Other (specify below)</option>
                  </select>

                  {/* Custom reason input */}
                  {removeReason.startsWith('custom:') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <textarea
                        value={removeReason.replace('custom:', '')}
                        onChange={(e) => setRemoveReason(`custom:${e.target.value}`)}
                        placeholder="Enter the reason for removal..."
                        rows={3}
                        className="w-full bg-[#0D0D0D] border border-border-color rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder:text-text-secondary/50 mt-2"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-400 leading-relaxed">
                    The member will be removed from the active list and moved to the <strong>Removed Members</strong> archive.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/30 flex justify-end gap-3">
                <button
                  onClick={() => { setRemoveMember(null); setRemoveReason(''); }}
                  className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const finalReason = removeReason.startsWith('custom:') 
                      ? removeReason.replace('custom:', '').trim() 
                      : removeReason;
                    
                    if (!finalReason) {
                      showToast('Please provide a reason for removing this member.', 'error');
                      return;
                    }
                    
                    setRemoveLoading(true);
                    try {
                      await onRemoveMember(removeMember, finalReason);
                      setRemoveMember(null);
                      setRemoveReason('');
                    } catch (err) {
                      showToast('Failed to remove member. Please try again.', 'error');
                    } finally {
                      setRemoveLoading(false);
                    }
                  }}
                  disabled={removeLoading || (!removeReason || (removeReason.startsWith('custom:') && removeReason.replace('custom:', '').trim().length === 0))}
                  className="px-5 py-2 rounded-md text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {removeLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserX size={16} />
                  )}
                  Remove Member
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      {receiptMember && (
        <ReceiptModal 
          member={receiptMember} 
          settings={settings} 
          onClose={() => setReceiptMember(null)} 
        />
      )}
    </div>
  );
}

function calculateDynamicExpiryDate(startDateStr: string, planNameStr: string, allPlans: any[]) {
  const date = new Date(startDateStr);
  const planName = planNameStr.split(' - ')[0];
  const selectedPlan = allPlans.find((p: any) => p.name === planName);
  const durationStr = (selectedPlan?.dur || planName).toLowerCase();
  
  if (durationStr.includes('month')) {
    const match = durationStr.match(/(\d+)\s*month/);
    const months = match ? parseInt(match[1]) : 1;
    date.setMonth(date.getMonth() + months);
  } else if (durationStr.includes('quarterly')) {
    date.setMonth(date.getMonth() + 3);
  } else if (durationStr.includes('half-yearly') || durationStr.includes('half yearly')) {
    date.setMonth(date.getMonth() + 6);
  } else if (durationStr.includes('annual') || durationStr.includes('year')) {
    const match = durationStr.match(/(\d+)\s*year/);
    const years = match ? parseInt(match[1]) : 1;
    date.setFullYear(date.getFullYear() + years);
  }
  return date.toISOString().slice(0, 10);
}

function AddMemberModal({ isOpen, onClose, onAdd, trainers, isLightMode, settings, onShowReceipt }: any) {
  const { showToast } = useToast();
  const defaultPlans = [
    { name: 'Monthly', price: 999 },
    { name: 'Quarterly', price: 2499 },
    { name: 'Half-Yearly', price: 4499 },
    { name: 'Annual', price: 7999 }
  ];
  const plans = settings?.plans || defaultPlans;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [planSelection, setPlanSelection] = useState(`${plans[0]?.name} - ₹${plans[0]?.price}`);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [trainer, setTrainer] = useState('None');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [planPrice, setPlanPrice] = useState(Number(plans[0]?.price) || 999);
  const [amount, setAmount] = useState(plans[0]?.price?.toString() || '999');

  // Custom plan state
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');
  const [customDays, setCustomDays] = useState(30);

  const dueAmount = Math.max(0, planPrice - (Number(amount) || 0));

  if (!isOpen) return null;

  const handlePlanChange = (e: any) => {
    const val = e.target.value;
    setPlanSelection(val);
    if (val === '__custom__') {
      setIsCustomPlan(true);
      setPlanPrice(0);
      setAmount('0');
      setCustomPlanName('');
      setCustomDays(30);
    } else {
      setIsCustomPlan(false);
      const selectedPlan = plans.find((p: any) => val.startsWith(p.name));
      if (selectedPlan) {
        const price = Number(selectedPlan.price);
        setPlanPrice(price);
        setAmount(selectedPlan.price.toString());
      }
    }
  };

  const calculateExpiryDate = (start: string, plan: string) => {
    return calculateDynamicExpiryDate(start, plan, plans);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const planName = isCustomPlan ? (customPlanName || 'Custom') : planSelection.split(' - ')[0];
      const expiryDate = isCustomPlan
        ? (() => { const d = new Date(startDate); d.setDate(d.getDate() + customDays); return d.toISOString().slice(0, 10); })()
        : calculateExpiryDate(startDate, planSelection);
      const saved = await onAdd({
        name,
        phone,
        email,
        dob,
        gender,
        plan: planName,
        amount: `₹${amount}`,
        startDate,
        expiryDate,
        status: 'Active',
        trainer,
        paymentMode,
        totalAmount: planPrice,
        paidAmount: Number(amount) || 0,
        dueAmount: dueAmount
      });
      // Reset states
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      onClose();
      // Auto-show receipt after registration
      if (saved && onShowReceipt) {
        onShowReceipt(saved);
      }
    } catch (err) {
      showToast('Error adding member', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-color rounded-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <UserPlus size={20} className="text-primary"/> Add New Member
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-1">
          <form id="add-member-form" onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Photo & Fingerprint */}
                <div className="md:col-span-3 flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-[#0D0D0D] border-2 border-dashed border-border-color flex flex-col items-center justify-center text-text-secondary hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                    <Camera size={24} className="mb-1" />
                    <span className="text-[10px] uppercase font-semibold">Upload</span>
                  </div>
                  <button type="button" className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-semibold hover:bg-primary/20 transition-colors">
                    <Fingerprint size={16} /> Add Biometric
                  </button>
                  <p className="text-[9px] text-center text-text-secondary">Fingerprint device integration - coming soon</p>
                </div>

                {/* Main Fields */}
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Full Name</label>
                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter full name" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-text-secondary uppercase">Phone Number</label>
                     <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter phone" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-text-secondary uppercase">Email (Optional)</label>
                     <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter email" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-text-secondary uppercase">Date of Birth</label>
                       <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-text-secondary uppercase">Gender</label>
                       <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                         <option>Male</option><option>Female</option><option>Other</option>
                       </select>
                    </div>
                  </div>
                </div>
             </div>

             <hr className="border-border-color" />

             {/* Membership Details */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Membership Plan</label>
                 <select value={planSelection} onChange={handlePlanChange} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   {plans.map((p: any) => (
                     <option key={p.name} value={`${p.name} - ₹${p.price}`}>{p.name} - ₹{p.price}</option>
                   ))}
                   <option value="__custom__">✏️ Custom Plan</option>
                 </select>
               </div>

               {/* Custom Plan Fields */}
               {isCustomPlan && (
                 <>
                   <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-text-secondary uppercase">Custom Plan Name</label>
                     <input type="text" value={customPlanName} onChange={e => setCustomPlanName(e.target.value)} className="w-full bg-[#0D0D0D] border border-primary/30 rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. Special Offer" required />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-text-secondary uppercase">Duration (Days)</label>
                     <input type="number" min="1" value={customDays} onChange={e => setCustomDays(Number(e.target.value) || 1)} className="w-full bg-[#0D0D0D] border border-primary/30 rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
                   </div>
                 </>
               )}
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Start Date</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Trainer Assigned</label>
                 <select value={trainer} onChange={e => setTrainer(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   <option>None</option>
                   {trainers.map((t: Trainer) => (
                     <option key={t.id} value={`${t.name} (${t.specialization})`}>{t.name} ({t.specialization})</option>
                   ))}
                 </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Payment Mode</label>
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                    <option>UPI</option>
                    <option>Cash</option>
                    <option>Card</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Total Plan Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                    <input type="number" value={planPrice} onChange={e => { if (isCustomPlan) { const v = Number(e.target.value) || 0; setPlanPrice(v); setAmount(e.target.value); } }} readOnly={!isCustomPlan} className={`w-full ${isCustomPlan ? 'bg-[#0D0D0D] border-primary/30 text-white' : 'bg-[#0D0D0D]/50 border-border-color text-text-secondary cursor-not-allowed'} border rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Amount Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Due Amount Alert */}
              {dueAmount > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                  <div>
                    <p className="text-orange-500 text-sm font-semibold">Partial Payment — ₹{dueAmount} Due</p>
                    <p className="text-orange-400/70 text-xs mt-0.5">Member is paying ₹{amount || 0} out of ₹{planPrice}. Remaining ₹{dueAmount} will be tracked.</p>
                  </div>
                </div>
              )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white hover:bg-surface transition-colors">Cancel</button>
          <button type="submit" form="add-member-form" className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">Save Member</button>
        </div>
      </div>
    </div>
  );
}

function MemberProfile({ member, onBack, onUpdate, trainers, isLightMode, settings }: any) {
  const { showToast } = useToast();
  const defaultPlans = [
    { name: 'Monthly', price: 999 },
    { name: 'Quarterly', price: 2499 },
    { name: 'Half-Yearly', price: 4499 },
    { name: 'Annual', price: 7999 }
  ];
  const plans = settings?.plans || defaultPlans;

  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewPlan, setRenewPlan] = useState(`${plans[0]?.name} - ₹${plans[0]?.price}`);
  const [renewAmount, setRenewAmount] = useState(plans[0]?.price?.toString() || '999');
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');

  // Edit member state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editPhone, setEditPhone] = useState(member.phone);
  const [editEmail, setEditEmail] = useState(member.email || '');
  const [editDob, setEditDob] = useState(member.dob || '');
  const [editGender, setEditGender] = useState(member.gender || 'Male');
  const [editTrainer, setEditTrainer] = useState(member.trainer || 'None');
  const [editStatus, setEditStatus] = useState(member.status || 'Active');
  const [editPlan, setEditPlan] = useState(member.plan || '');
  const [editStartDate, setEditStartDate] = useState(member.startDate || '');
  const [editExpiryDate, setEditExpiryDate] = useState(member.expiryDate || '');
  const [editAmount, setEditAmount] = useState(member.amount || '');
  const [editPaymentMode, setEditPaymentMode] = useState(member.paymentMode || 'UPI');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (member?.id) {
      setLoadingReceipts(true);
      getReceiptsByMember(member.id)
        .then(data => setReceipts(data.sort((a, b) => b.timestamp - a.timestamp)))
        .finally(() => setLoadingReceipts(false));
    }
  }, [member?.id]);

  const currentDue = member.dueAmount ?? 0;
  const currentTotal = member.totalAmount ?? 0;
  const currentPaid = member.paidAmount ?? 0;
  const paymentPercent = currentTotal > 0 ? Math.min(100, Math.round((currentPaid / currentTotal) * 100)) : 100;

  const handleRecordPayment = async () => {
    const payAmt = Number(paymentAmount);
    if (!payAmt || payAmt <= 0) return;
    try {
      const newPaid = currentPaid + payAmt;
      const newDue = Math.max(0, currentTotal - newPaid);
      await onUpdate({
        paidAmount: newPaid,
        dueAmount: newDue,
        amount: `₹${newPaid}`
      });
      setIsPaymentOpen(false);
      setPaymentAmount('');
      showToast(`₹${payAmt} payment recorded successfully!`, 'success');
    } catch (err) {
      showToast('Error recording payment', 'error');
    }
  };

  const handleRenewPlanChange = (e: any) => {
    const val = e.target.value;
    setRenewPlan(val);
    const selectedPlan = plans.find((p: any) => val.startsWith(p.name));
    if (selectedPlan) {
      setRenewAmount(selectedPlan.price.toString());
    }
  };

  const handleRenewSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Expiry calculation
      const expiryDate = calculateDynamicExpiryDate(todayStr, renewPlan, plans);

      await onUpdate({
        plan: renewPlan.split(' - ')[0],
        amount: `₹${renewAmount}`,
        startDate: todayStr,
        expiryDate: expiryDate,
        status: 'Active'
      });
      setIsRenewOpen(false);
    } catch (err) {
      showToast('Error renewing membership', 'error');
    }
  };

  return (
    <div className="w-full pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm mb-6 font-semibold">
        <ArrowLeft size={16} /> Back to Members
      </button>

      {/* Header Profile Card */}
      <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6`}>
        <div className="flex items-center gap-5">
           <div className="w-20 h-20 rounded-full bg-[#0D0D0D] border border-border-color flex items-center justify-center font-heading text-3xl font-bold text-primary shrink-0">
             {member.name.split(' ').map((n: string) => n[0]).join('')}
           </div>
           <div>
             <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{member.name}</h1>
             <div className="text-sm text-text-secondary mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
               <span className="flex items-center gap-1.5"><Contact size={14}/> {member.phone}</span>
               <span className="flex items-center gap-1.5"><Calendar size={14}/> Joined {member.startDate}</span>
             </div>
             <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${
                    member.status === 'Active' ? 'bg-green-500/10 text-green-500' : 
                    member.status === 'Expired' ? 'bg-red-500/10 text-primary' : 
                    'bg-orange-500/10 text-orange-500'
                  }`}>
                    {member.status}
                </span>
                <span className="text-xs bg-[#0D0D0D] border border-border-color px-2 py-1 rounded text-white font-medium">
                  {member.plan} Plan
                </span>
                {currentDue > 0 && (
                  <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-500 flex items-center gap-1">
                    <AlertTriangle size={11} /> ₹{currentDue} Due
                  </span>
                )}
             </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button onClick={() => {
            setEditName(member.name);
            setEditPhone(member.phone);
            setEditEmail(member.email || '');
            setEditDob(member.dob || '');
            setEditGender(member.gender || 'Male');
            setEditTrainer(member.trainer || 'None');
            setEditStatus(member.status || 'Active');
            setEditPlan(member.plan || '');
            setEditStartDate(member.startDate || '');
            setEditExpiryDate(member.expiryDate || '');
            setEditAmount(member.amount || '');
            setEditPaymentMode(member.paymentMode || 'UPI');
            setIsEditOpen(true);
          }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-surface border border-border-color hover:bg-[#0D0D0D] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
            <Edit size={16} /> Edit Details
          </button>
          <button onClick={() => setIsRenewOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
            <RefreshCw size={16} /> Renew / Upgrade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
           <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-5`}>
             <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Personal Details</h3>
             <div className="space-y-3 text-sm">
               <div className="flex justify-between border-b border-border-color/50 pb-2">
                 <span className="text-text-secondary">Email</span>
                 <span className={`${isLightMode ? 'text-black' : 'text-white'}`}>{member.email || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-border-color/50 pb-2">
                 <span className="text-text-secondary">Date of Birth</span>
                 <span className={`${isLightMode ? 'text-black' : 'text-white'}`}>{member.dob || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-border-color/50 pb-2">
                 <span className="text-text-secondary">Gender</span>
                 <span className={`${isLightMode ? 'text-black' : 'text-white'}`}>{member.gender || 'N/A'}</span>
               </div>
               <div className="flex justify-between pb-2">
                 <span className="text-text-secondary">Trainer</span>
                 <span className={`${isLightMode ? 'text-black' : 'text-white'}`}>{member.trainer || 'None'}</span>
               </div>
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Payment History */}
           <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
             <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
                <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Payment History</h3>
             </div>
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  <tr className="hover:bg-[#0D0D0D]/50 transition-colors">
                    <td className={`${isLightMode ? 'text-black' : 'text-white'} px-5 py-3`}>{member.startDate}</td>
                    <td className="px-5 py-3 text-text-secondary">{member.plan} Plan</td>
                    <td className="px-5 py-3 text-green-500 font-mono">{member.amount}</td>
                    <td className="px-5 py-3 text-text-secondary">{member.paymentMode || 'UPI'}</td>
                  </tr>
                </tbody>
              </table>
           </div>

            {/* Receipt History */}
            <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden mt-6`}>
              <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
                 <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                   <History size={16} /> Receipt History
                 </h3>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0">
                     <tr>
                       <th className="px-5 py-3 font-medium">Receipt No</th>
                       <th className="px-5 py-3 font-medium">Date</th>
                       <th className="px-5 py-3 font-medium">Plan</th>
                       <th className="px-5 py-3 font-medium">Amount</th>
                       <th className="px-5 py-3 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-color">
                     {loadingReceipts ? (
                       <tr><td colSpan={5} className="px-5 py-4 text-center text-text-secondary text-xs">Loading receipts...</td></tr>
                     ) : receipts.length === 0 ? (
                       <tr><td colSpan={5} className="px-5 py-4 text-center text-text-secondary text-xs">No receipts found for this member.</td></tr>
                     ) : (
                       receipts.map((r) => (
                         <tr key={r.id} className="hover:bg-[#0D0D0D]/50 transition-colors">
                           <td className="px-5 py-3 font-mono text-xs">{r.receiptNo}</td>
                           <td className="px-5 py-3 text-text-secondary text-xs">{new Date(r.timestamp).toLocaleDateString()}</td>
                           <td className="px-5 py-3 text-text-secondary text-xs">{r.plan}</td>
                           <td className="px-5 py-3 text-green-500 font-mono text-xs">{r.amount}</td>
                           <td className="px-5 py-3 text-right">
                             <button 
                               onClick={() => setViewReceipt(r)}
                               className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors inline-flex items-center gap-1 text-xs" 
                               title="View Receipt"
                             >
                               <FileText size={14} /> View
                             </button>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
              </div>
            </div>

           {/* Payment Tracking Card */}
           {currentTotal > 0 && (
            <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-5`}>
              <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Payment Tracking</h3>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-text-secondary">Paid</span>
                    <span className={`font-bold ${currentDue > 0 ? 'text-orange-500' : 'text-green-500'}`}>{paymentPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#0D0D0D] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${currentDue > 0 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${paymentPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border-color/50 pb-2">
                    <span className="text-text-secondary">Total Amount</span>
                    <span className={`font-mono font-semibold ${isLightMode ? 'text-black' : 'text-white'}`}>₹{currentTotal}</span>
                  </div>
                  <div className="flex justify-between border-b border-border-color/50 pb-2">
                    <span className="text-text-secondary">Paid</span>
                    <span className="font-mono font-semibold text-green-500">₹{currentPaid}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-text-secondary">Due</span>
                    <span className={`font-mono font-bold ${currentDue > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {currentDue > 0 ? `₹${currentDue}` : 'Fully Paid ✓'}
                    </span>
                  </div>
                </div>

                {currentDue > 0 && (
                  <button 
                    onClick={() => setIsPaymentOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Download size={16} /> Record Payment
                  </button>
                )}
              </div>
            </div>
           )}
        </div>
      </div>
      
      {/* Existing View Receipt modal inside Profile uses standard ReceiptModal with slightly modified props or just a custom view */}
      {viewReceipt && (
        <ReceiptModal 
          member={member} // Pass current member details
          settings={settings}
          onClose={() => setViewReceipt(null)} 
        />
      )}

      {/* Edit Member Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Edit size={20} className="text-primary"/> Edit Member Details
              </h2>
              <button onClick={() => setIsEditOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setEditSaving(true);
              try {
                const updatedFields: any = {};
                if (editName !== member.name) updatedFields.name = editName;
                if (editPhone !== member.phone) updatedFields.phone = editPhone;
                if (editEmail !== (member.email || '')) updatedFields.email = editEmail;
                if (editDob !== (member.dob || '')) updatedFields.dob = editDob;
                if (editGender !== (member.gender || 'Male')) updatedFields.gender = editGender;
                if (editTrainer !== (member.trainer || 'None')) updatedFields.trainer = editTrainer;
                if (editStatus !== (member.status || 'Active')) updatedFields.status = editStatus;
                if (editPlan !== (member.plan || '')) updatedFields.plan = editPlan;
                if (editStartDate !== (member.startDate || '')) updatedFields.startDate = editStartDate;
                if (editExpiryDate !== (member.expiryDate || '')) updatedFields.expiryDate = editExpiryDate;
                if (editAmount !== (member.amount || '')) updatedFields.amount = editAmount;
                if (editPaymentMode !== (member.paymentMode || 'UPI')) updatedFields.paymentMode = editPaymentMode;

                if (Object.keys(updatedFields).length === 0) {
                  showToast('No changes detected', 'info');
                  setIsEditOpen(false);
                  return;
                }

                await onUpdate(updatedFields);
                setIsEditOpen(false);
                showToast('Member details updated successfully!', 'success');
              } catch (err) {
                showToast('Error updating member', 'error');
              } finally {
                setEditSaving(false);
              }
            }} className="p-6 overflow-y-auto no-scrollbar space-y-5">
              {/* Personal Details Section */}
              <div>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2"><Contact size={14} /> Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Full Name</label>
                    <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Phone Number</label>
                    <input required type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Email</label>
                    <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Date of Birth</label>
                    <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Gender</label>
                    <select value={editGender} onChange={e => setEditGender(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Status</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                      <option>Active</option><option>Expired</option><option>Frozen</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-border-color" />

              {/* Registration / Membership Section */}
              <div>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14} /> Membership Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Plan</label>
                    <select value={editPlan} onChange={e => setEditPlan(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                      {plans.map((p: any) => (
                        <option key={p.name} value={p.name}>{p.name} - ₹{p.price}</option>
                      ))}
                      {/* Keep current plan visible even if it's custom */}
                      {!plans.find((p: any) => p.name === editPlan) && editPlan && (
                        <option value={editPlan}>{editPlan}</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Amount Paid</label>
                    <input type="text" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="₹999" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Start Date</label>
                    <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Expiry Date</label>
                    <input type="date" value={editExpiryDate} onChange={e => setEditExpiryDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Payment Mode</label>
                    <select value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                      <option>UPI</option><option>Cash</option><option>Card</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase">Trainer</label>
                    <select value={editTrainer} onChange={e => setEditTrainer(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                      <option>None</option>
                      {(trainers || []).map((t: any) => (
                        <option key={t.id} value={`${t.name} (${t.specialization})`}>{t.name} ({t.specialization})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-border-color rounded-lg p-3 text-xs text-text-secondary">
                <p className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500" /> Only changed fields will be updated. All other records stay untouched.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Download size={20} className="text-orange-500"/> Record Payment
              </h2>
              <button onClick={() => setIsPaymentOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Current Balance Summary */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Total Amount</span>
                  <span className="text-white font-mono font-semibold">₹{currentTotal}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Already Paid</span>
                  <span className="text-green-500 font-mono font-semibold">₹{currentPaid}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-orange-500/20 pt-2">
                  <span className="text-orange-500 font-semibold">Outstanding Due</span>
                  <span className="text-orange-500 font-mono font-bold">₹{currentDue}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                  <input 
                    type="number" 
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)} 
                    max={currentDue}
                    className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none" 
                    placeholder={`Max ₹${currentDue}`} 
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setPaymentAmount(String(Math.round(currentDue / 2)))} className="px-3 py-1 text-xs font-semibold bg-[#0D0D0D] border border-border-color rounded text-text-secondary hover:text-white transition-colors">Half</button>
                  <button type="button" onClick={() => setPaymentAmount(String(currentDue))} className="px-3 py-1 text-xs font-semibold bg-[#0D0D0D] border border-border-color rounded text-text-secondary hover:text-white transition-colors">Full Due</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 text-sm text-text-secondary focus:border-orange-500/50 focus:outline-none">
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Card</option>
                </select>
              </div>

              {/* Remaining after this payment */}
              {Number(paymentAmount) > 0 && (
                <div className={`text-center text-sm font-medium py-2 rounded-lg ${
                  Number(paymentAmount) >= currentDue 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-[#0D0D0D] text-text-secondary'
                }`}>
                  {Number(paymentAmount) >= currentDue 
                    ? '✓ This will clear the full balance!' 
                    : `₹${currentDue - Number(paymentAmount)} will remain due after this payment`
                  }
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPaymentOpen(false)} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors">Cancel</button>
                <button 
                  type="button"
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                  className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record ₹{paymentAmount || '0'} Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {isRenewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <RefreshCw size={20} className="text-primary"/> Renew Membership
              </h2>
              <button onClick={() => setIsRenewOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Plan Selection</label>
                 <select value={renewPlan} onChange={handleRenewPlanChange} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   {plans.map((p: any) => (
                     <option key={p.name} value={`${p.name} - ₹${p.price}`}>{p.name} - ₹{p.price}</option>
                   ))}
                 </select>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Amount Paid (₹)</label>
                 <input type="number" value={renewAmount} onChange={e => setRenewAmount(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
               </div>
               <div className="pt-4 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsRenewOpen(false)} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors">Cancel</button>
                 <button type="submit" className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">Renew Now</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Receipt Modal ──────────────────────────────────────────────────────────

function ReceiptModal({ member, settings, onClose }: { member: Member; settings: any; onClose: () => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const gymName = settings?.gymName || 'Corenix Club';
  const gymAddress = 'Bohra Complex, Gitanjali Greencity, Suncity Sikar Road, Jaipur';
  const gymPhone = '9982260055';
  const gymEmail = 'fitunitedgym@gmail.com';
  const receiptNo = `CRX-${member.id ? member.id.slice(-6).toUpperCase() : 'TEMP00'}`;
  const receiptDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const getReceiptPDFData = () => ({
    gymName,
    gymAddress,
    gymPhone,
    gymEmail,
    receiptNo,
    receiptDate,
    memberName: member.name,
    memberPhone: member.phone,
    memberEmail: member.email,
    memberId: member.id ? member.id.slice(-6).toUpperCase() : 'TEMP',
    plan: member.plan,
    startDate: member.startDate,
    expiryDate: member.expiryDate,
    trainer: member.trainer || 'None',
    paymentMode: member.paymentMode || 'UPI',
    amount: member.amount,
    totalAmount: member.totalAmount,
    paidAmount: member.paidAmount,
    dueAmount: member.dueAmount,
  });

  const saveReceiptToFirestore = async () => {
    if (saved || !member.id) return;
    setSaving(true);
    try {
      const receiptData: Receipt = {
        receiptNo,
        memberId: member.id!,
        memberName: member.name,
        memberPhone: member.phone,
        plan: member.plan,
        amount: member.amount,
        startDate: member.startDate,
        expiryDate: member.expiryDate,
        paymentMode: member.paymentMode || 'UPI',
        trainer: member.trainer || 'None',
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now(),
        gymName,
        gymAddress,
        gymPhone,
        gymEmail,
        sentViaWhatsApp: false
      };
      await addReceipt(receiptData);
      setSaved(true);
      showToast('Receipt saved to records', 'success');
    } catch (err) {
      showToast('Failed to save receipt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { downloadReceiptPDF } = await import('@/lib/receiptPdf');
      downloadReceiptPDF(getReceiptPDFData());
      // Also save to Firestore if not already saved
      if (!saved && member.id) {
        await saveReceiptToFirestore();
      }
      showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  const buildWhatsAppMessage = () => {
    const msg = `━━━━━━━━━━━━━━━━━━
🏋️ *${gymName}*
${gymAddress}
📞 ${gymPhone}
━━━━━━━━━━━━━━━━━━

📄 *MEMBERSHIP RECEIPT*
Receipt No: *#${receiptNo}*
Date: ${receiptDate}

👤 *Member Details*
Name: ${member.name}
Phone: ${member.phone}
Member ID: ${member.id ? member.id.slice(-6).toUpperCase() : 'N/A'}

📋 *Plan Details*
Plan: ${member.plan}
Validity: ${member.startDate} to ${member.expiryDate}
Trainer: ${member.trainer || 'None'}
Payment: ${member.paymentMode || 'UPI'}

💰 *Total Paid: ${member.amount}*
${member.dueAmount && member.dueAmount > 0 ? `⚠️ *Balance Due: ₹${member.dueAmount}*` : ''}
━━━━━━━━━━━━━━━━━━
Thank you for choosing ${gymName}! 💪
Stay fit, stay healthy! 🔥
_This is your official receipt. No refunds._`;

    return encodeURIComponent(msg);
  };

  const handleWhatsAppSend = async () => {
    setSending(true);
    if (!saved && member.id) {
      try {
        const receiptData: Receipt = {
          receiptNo,
          memberId: member.id!,
          memberName: member.name,
          memberPhone: member.phone,
          plan: member.plan,
          amount: member.amount,
          startDate: member.startDate,
          expiryDate: member.expiryDate,
          paymentMode: member.paymentMode || 'UPI',
          trainer: member.trainer || 'None',
          date: new Date().toISOString().slice(0, 10),
          timestamp: Date.now(),
          gymName,
          gymAddress,
          gymPhone,
          gymEmail,
          sentViaWhatsApp: true
        };
        await addReceipt(receiptData);
        setSaved(true);
      } catch (err) {
        // Non-blocking
      }
    }

    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCode}?text=${buildWhatsAppMessage()}`;
    window.open(url, '_blank');
    setSending(false);
    showToast('Opening WhatsApp...', 'success');
  };

  const due = member.dueAmount ?? 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white text-black w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        {/* Receipt Content */}
        <div className="p-6">
          {/* Gym Header */}
          <div className="text-center mb-5 pb-4 border-b-2 border-dashed border-gray-300">
            <h2 className="font-heading font-black text-2xl uppercase text-[#0D0D0D] tracking-wide">{gymName}</h2>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[280px] mx-auto">{gymAddress}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">📞 {gymPhone} • ✉ {gymEmail}</p>
            <div className="mt-3 inline-block bg-[#0D0D0D] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-sm">
              Membership Receipt
            </div>
          </div>
          
          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-4 pb-3 border-b border-gray-200">
            <div className="font-semibold text-gray-600">Receipt No:</div>
            <div className="text-right font-mono font-bold text-[#0D0D0D]">#{receiptNo}</div>
            <div className="font-semibold text-gray-600">Date:</div>
            <div className="text-right">{receiptDate}</div>
            <div className="font-semibold text-gray-600">Member ID:</div>
            <div className="text-right font-mono">{member.id ? member.id.slice(-6).toUpperCase() : 'TEMP'}</div>
          </div>

          {/* Member Details */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Member Details</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <div className="font-semibold text-gray-600">Name:</div>
              <div className="text-right font-medium text-[#0D0D0D]">{member.name}</div>
              <div className="font-semibold text-gray-600">Phone:</div>
              <div className="text-right">{member.phone}</div>
              {member.email && (
                <>
                  <div className="font-semibold text-gray-600">Email:</div>
                  <div className="text-right text-xs">{member.email}</div>
                </>
              )}
            </div>
          </div>

          {/* Plan Details */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Plan Details</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <div className="font-semibold text-gray-600">Plan:</div>
              <div className="text-right font-medium">{member.plan}</div>
              <div className="font-semibold text-gray-600">Start Date:</div>
              <div className="text-right">{member.startDate}</div>
              <div className="font-semibold text-gray-600">Expiry Date:</div>
              <div className="text-right">{member.expiryDate}</div>
              <div className="font-semibold text-gray-600">Trainer:</div>
              <div className="text-right">{member.trainer || 'None'}</div>
              <div className="font-semibold text-gray-600">Payment:</div>
              <div className="text-right">{member.paymentMode || 'UPI'}</div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-[#0D0D0D] text-white rounded-lg px-4 py-3 flex justify-between items-center mb-3">
            <span className="font-bold text-sm uppercase tracking-wider">Total Paid</span>
            <span className="font-black text-xl">{member.amount}</span>
          </div>

          {/* Due Amount */}
          {due > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 flex justify-between items-center mb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Balance Due
              </span>
              <span className="font-black text-lg text-orange-600">₹{due}</span>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-400 italic leading-relaxed">
            Thank you for choosing {gymName}! 💪<br/>
            Stay fit, stay healthy. This is your official receipt.<br/>
            <span className="font-semibold not-italic">No refunds applicable.</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="bg-gray-50 p-4 flex flex-wrap gap-2 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
          <div className="flex-1" />
          <button 
            onClick={saveReceiptToFirestore}
            disabled={saving || saved}
            className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${
              saved 
                ? 'bg-green-50 text-green-600 cursor-default' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {saved ? <><CheckCircle2 size={15} /> Saved</> : saving ? 'Saving...' : <><Download size={15} /> Save Record</>}
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="px-4 py-2 text-sm bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-colors flex items-center gap-2"
          >
            <FileText size={15} /> Download PDF
          </button>
          <button 
            onClick={handleWhatsAppSend}
            disabled={sending}
            className="px-4 py-2 text-sm bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#1eb954] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send size={15} /> {sending ? 'Sending...' : 'WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
