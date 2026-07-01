import { useState } from 'react';
import { 
  Search, Plus, Eye, Edit, Printer, MessageCircle, Trash2, 
  ChevronUp, ChevronDown, ArrowLeft, Calendar, Contact, FileText, 
  RefreshCw, Camera, Fingerprint, X, UserPlus, AlertTriangle, CheckCircle2, Clock,
  Archive, RotateCcw, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Trainer, RemovedMember } from '@/lib/db';
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
            const updated = await onUpdateMember(selectedMember.id, updatedData);
            setSelectedMember({ ...selectedMember, ...updatedData });
          }
        }}
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
                    <td className="px-5 py-3 text-text-secondary">{m.amount}</td>
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white text-black w-full max-w-md rounded-lg shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:bg-white print:m-0">
            <div className="p-6">
               <div className="text-center mb-6">
                 <h2 className="font-heading font-black text-2xl uppercase text-[#0D0D0D]">{settings?.gymName || 'Corenix Club'}</h2>
                 <p className="text-sm text-gray-500">{settings?.address || '123 Fitness Avenue, Body-building District, NY'}</p>
                 <p className="text-sm text-gray-500">{settings?.phone || '+1 987 654 3210'} • {settings?.email || 'contact@corenix.com'}</p>
               </div>
               
               <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                 <div className="flex justify-between text-sm mb-1">
                   <span className="font-semibold">Receipt No:</span>
                   <span>#CRX-{receiptMember.id ? receiptMember.id.slice(-4).toUpperCase() : '8492'}</span>
                 </div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="font-semibold">Date:</span>
                   <span>{new Date().toLocaleDateString('en-US')}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="font-semibold">Member ID:</span>
                   <span>{receiptMember.id ? receiptMember.id.slice(-6).toUpperCase() : 'TEMP'}</span>
                 </div>
               </div>

               <div className="mb-6 space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="font-semibold">Name:</span>
                   <span>{receiptMember.name}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="font-semibold">Phone:</span>
                   <span>+{receiptMember.phone}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="font-semibold">Plan Details:</span>
                   <span>{receiptMember.plan}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="font-semibold">Validity:</span>
                   <span>{receiptMember.startDate} to {receiptMember.expiryDate}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="font-semibold">Payment Mode:</span>
                   <span>{receiptMember.paymentMode || 'UPI'}</span>
                 </div>
               </div>

               <div className="border-t-2 border-black pt-2 mb-6">
                 <div className="flex justify-between items-center">
                   <span className="font-bold text-lg uppercase">Total Paid</span>
                   <span className="font-bold text-xl">{receiptMember.amount}</span>
                 </div>
               </div>

               <div className="text-center text-xs text-gray-500 mt-8 italic">
                 &quot;Thank you for choosing Corenix Club. Let&apos;s get fit together!&quot;<br/>
                 Keep this receipt for your records. (No refunds)
               </div>
            </div>
            
            <div className="bg-gray-100 p-4 flex justify-end gap-3 print:hidden">
              <button onClick={() => setReceiptMember(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  window.print();
                  setTimeout(() => setReceiptMember(null), 1000); 
                }} 
                className="px-4 py-2 text-sm bg-[#0D0D0D] text-white font-bold rounded shadow-lg hover:bg-black transition-colors flex items-center gap-2">
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMemberModal({ isOpen, onClose, onAdd, trainers, isLightMode, settings }: any) {
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
  const [amount, setAmount] = useState(plans[0]?.price?.toString() || '999');

  if (!isOpen) return null;

  const handlePlanChange = (e: any) => {
    const val = e.target.value;
    setPlanSelection(val);
    const selectedPlan = plans.find((p: any) => val.startsWith(p.name));
    if (selectedPlan) {
      setAmount(selectedPlan.price.toString());
    }
  };

  const calculateExpiryDate = (start: string, plan: string) => {
    const date = new Date(start);
    if (plan.includes('Monthly')) {
      date.setMonth(date.getMonth() + 1);
    } else if (plan.includes('Quarterly')) {
      date.setMonth(date.getMonth() + 3);
    } else if (plan.includes('Half-Yearly')) {
      date.setMonth(date.getMonth() + 6);
    } else if (plan.includes('Annual')) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const expiryDate = calculateExpiryDate(startDate, planSelection);
      const planName = planSelection.split(' - ')[0];
      await onAdd({
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
        paymentMode
      });
      // Reset states
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      onClose();
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
                 </select>
               </div>
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
                 <label className="text-xs font-semibold text-text-secondary uppercase">Amount Paid</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                   <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="0" />
                 </div>
               </div>
             </div>
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

function MemberProfile({ member, onBack, onUpdate, isLightMode, settings }: any) {
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
      const date = new Date(todayStr);
      if (renewPlan.includes('Monthly')) date.setMonth(date.getMonth() + 1);
      else if (renewPlan.includes('Quarterly')) date.setMonth(date.getMonth() + 3);
      else if (renewPlan.includes('Half-Yearly')) date.setMonth(date.getMonth() + 6);
      else if (renewPlan.includes('Annual')) date.setFullYear(date.getFullYear() + 1);

      await onUpdate({
        plan: renewPlan.split(' - ')[0],
        amount: `₹${renewAmount}`,
        startDate: todayStr,
        expiryDate: date.toISOString().slice(0, 10),
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
             <div className="mt-3 flex items-center gap-2">
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
             </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
        </div>
      </div>

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
