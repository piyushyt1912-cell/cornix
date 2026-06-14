'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Contact, Clock, CheckCircle2, XCircle, X, UserPlus, Search,
  Edit, Trash2, Phone, Calendar, IndianRupee, Shield, Briefcase,
  ChevronDown, ChevronUp, AlertTriangle, Save, UserX, Coffee,
  Eye, ArrowLeft, MessageCircle, Users, FileText, Download, Activity, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Staff, DailyStaffAttendance, Payslip, 
  getStaffMonthlyAttendance, getPayslips, generatePayslip, updatePayslipStatus 
} from '@/lib/db';

interface StaffViewProps {
  staff: Staff[];
  onAddStaff: (member: Staff) => Promise<any>;
  onUpdateStaff: (id: string, data: Partial<Staff>) => Promise<any>;
  onDeleteStaff: (id: string) => Promise<any>;
  onUpdateStaffStatus: (id: string, status: string) => Promise<any>;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

type StaffStatusType = 'Present' | 'Absent' | 'On Leave' | 'Half Day';

const STATUS_CONFIG: Record<StaffStatusType, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  'Present': { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 },
  'Absent': { color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  'On Leave': { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Coffee },
  'Half Day': { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
};

const ROLE_COLORS: Record<string, string> = {
  'Manager': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Receptionist': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Security': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Cleaning': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Maintenance': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function StaffView({ staff, onAddStaff, onUpdateStaff, onDeleteStaff, onUpdateStaffStatus, isLightMode, role }: StaffViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [removeStaff, setRemoveStaff] = useState<Staff | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(staff.map(s => s.role))).filter(Boolean);

  // Filter staff
  const filteredStaff = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    const matchRole = filterRole === 'All' || s.role === filterRole;
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  // Stats
  const totalStaff = staff.length;
  const presentCount = staff.filter(s => s.status === 'Present').length;
  const absentCount = staff.filter(s => s.status === 'Absent').length;
  const onLeaveCount = staff.filter(s => s.status === 'On Leave' || s.status === 'Half Day').length;
  const totalSalary = staff.reduce((sum, s) => {
    const num = parseInt(s.salary?.replace(/[^\d]/g, '') || '0');
    return sum + num;
  }, 0);

  // Staff profile view
  if (selectedStaff) {
    return (
      <StaffProfile
        staff={selectedStaff}
        onBack={() => setSelectedStaff(null)}
        onUpdate={async (data: any) => {
          if (selectedStaff.id) {
            await onUpdateStaff(selectedStaff.id, data);
            setSelectedStaff({ ...selectedStaff, ...data });
          }
        }}
        onStatusChange={async (status: string) => {
          if (selectedStaff.id) {
            await onUpdateStaffStatus(selectedStaff.id, status);
            setSelectedStaff({ ...selectedStaff, status });
          }
        }}
        isLightMode={isLightMode}
        isAdmin={role === 'admin'}
      />
    );
  }

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
            Staff Management <span className="text-[12px] text-text-secondary ml-2 font-normal font-sans">(स्टाफ)</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {totalStaff} staff members • {presentCount} present today
          </p>
        </div>
        <div className="flex gap-3">
          {role === 'admin' && (
            <button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
              <Plus size={16} /> Add Staff
            </button>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Staff', value: totalStaff, color: 'text-white', icon: Users, bg: 'bg-primary/10 border-primary/20' },
          { label: 'Present', value: presentCount, color: 'text-green-400', icon: CheckCircle2, bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Absent', value: absentCount, color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'On Leave', value: onLeaveCount, color: 'text-orange-400', icon: Coffee, bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Monthly Payroll', value: `₹${totalSalary.toLocaleString('en-IN')}`, color: 'text-emerald-400', icon: IndianRupee, bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">{stat.label}</p>
              <p className={`text-lg font-bold font-heading ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full bg-surface border ${isLightMode ? 'border-gray-200 text-black' : 'border-border-color text-white'} rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50`}
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className={`bg-surface border ${isLightMode ? 'border-gray-200 text-black' : 'border-border-color text-text-secondary'} rounded-md py-2 px-3 text-sm focus:outline-none focus:border-primary/50`}
        >
          <option value="All">All Roles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={`bg-surface border ${isLightMode ? 'border-gray-200 text-black' : 'border-border-color text-text-secondary'} rounded-md py-2 px-3 text-sm focus:outline-none focus:border-primary/50`}
        >
          <option value="All">All Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="On Leave">On Leave</option>
          <option value="Half Day">Half Day</option>
        </select>
        {/* View toggle */}
        <div className="flex border border-border-color rounded-md overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'cards' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-white'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-white'}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Staff Display */}
      {viewMode === 'cards' ? (
        /* ─── Cards View ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
          {filteredStaff.map(s => {
            const statusConfig = STATUS_CONFIG[(s.status as StaffStatusType)] || STATUS_CONFIG['Absent'];
            const roleColor = ROLE_COLORS[s.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden hover:border-primary/30 transition-all group`}
              >
                {/* Card Header with status bar */}
                <div className={`h-1 ${s.status === 'Present' ? 'bg-green-500' : s.status === 'On Leave' ? 'bg-orange-500' : s.status === 'Half Day' ? 'bg-yellow-500' : 'bg-red-500'}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#0D0D0D] border border-border-color flex items-center justify-center font-heading font-bold text-lg text-primary shrink-0">
                        {s.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm ${isLightMode ? 'text-black' : 'text-white'} leading-tight`}>{s.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1 inline-block font-semibold uppercase tracking-wider ${roleColor}`}>
                          {s.role}
                        </span>
                      </div>
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedStaff(s)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors text-text-secondary" title="View Profile">
                        <Eye size={14} />
                      </button>
                      {role === 'admin' && (
                        <>
                          <button onClick={() => setEditStaff(s)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors text-text-secondary" title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setRemoveStaff(s)} className="p-1.5 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors text-text-secondary" title="Remove">
                            <UserX size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4 text-xs text-text-secondary">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Phone size={12} /> Phone</span>
                      <span className={`${isLightMode ? 'text-black' : 'text-white'} font-medium`}>{s.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Clock size={12} /> Shift</span>
                      <span className={`${isLightMode ? 'text-black' : 'text-white'} font-medium`}>{s.shiftStart} – {s.shiftEnd}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><IndianRupee size={12} /> Salary</span>
                      <span className="text-emerald-400 font-mono font-medium">{s.salary}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined</span>
                      <span className={`${isLightMode ? 'text-black' : 'text-white'} font-medium`}>{s.joinDate}</span>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="pt-3 border-t border-border-color/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-text-secondary tracking-wider">Status</span>
                      {role === 'admin' ? (
                        <select
                          value={s.status}
                          onChange={async (e) => {
                            if (s.id) await onUpdateStaffStatus(s.id, e.target.value);
                          }}
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded cursor-pointer border ${statusConfig.bg} ${statusConfig.color} bg-transparent focus:outline-none`}
                        >
                          <option value="Present">✅ Present</option>
                          <option value="Absent">❌ Absent</option>
                          <option value="On Leave">🟠 On Leave</option>
                          <option value="Half Day">🟡 Half Day</option>
                        </select>
                      ) : (
                        <span className={`flex items-center gap-1 ${statusConfig.color} ${statusConfig.bg} px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider`}>
                          <StatusIcon size={12} /> {s.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-secondary">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No staff members found.</p>
              {role === 'admin' && (
                <button onClick={() => setIsAddOpen(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
                  + Add your first staff member
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── Table View ─── */
        <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden mb-8`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className={`bg-[#0D0D0D]/50 border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-text-secondary text-[11px] uppercase tracking-wider`}>
                <tr>
                  <th className="px-5 py-3 font-medium">Staff Member</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Shift</th>
                  <th className="px-5 py-3 font-medium">Salary</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium text-center">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredStaff.map(s => {
                  const statusConfig = STATUS_CONFIG[(s.status as StaffStatusType)] || STATUS_CONFIG['Absent'];
                  const roleColor = ROLE_COLORS[s.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                  return (
                    <tr key={s.id} className="hover:bg-[#0D0D0D]/50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0D0D0D] border border-border-color text-primary flex items-center justify-center font-heading font-bold text-xs">
                            {s.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className={`font-medium ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${roleColor}`}>{s.role}</span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{s.phone}</td>
                      <td className="px-5 py-3 text-text-secondary">{s.shiftStart} – {s.shiftEnd}</td>
                      <td className="px-5 py-3 text-emerald-400 font-mono">{s.salary}</td>
                      <td className="px-5 py-3 text-text-secondary">{s.joinDate}</td>
                      <td className="px-5 py-3 text-center">
                        {role === 'admin' ? (
                          <select
                            value={s.status}
                            onChange={async (e) => { if (s.id) await onUpdateStaffStatus(s.id, e.target.value); }}
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded cursor-pointer border ${statusConfig.bg} ${statusConfig.color} bg-transparent focus:outline-none`}
                          >
                            <option value="Present">✅ Present</option>
                            <option value="Absent">❌ Absent</option>
                            <option value="On Leave">🟠 On Leave</option>
                            <option value="Half Day">🟡 Half Day</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 ${statusConfig.color} ${statusConfig.bg} px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider`}>
                            {s.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-text-secondary">
                          <button onClick={() => setSelectedStaff(s)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          {role === 'admin' && (
                            <>
                              <button onClick={() => setEditStaff(s)} className="p-1.5 hover:text-white hover:bg-border-color rounded transition-colors" title="Edit">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => setRemoveStaff(s)} className="p-1.5 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Remove">
                                <UserX size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-text-secondary">No staff members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddStaffModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={onAddStaff} isLightMode={isLightMode} />

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {editStaff && (
          <EditStaffModal
            staff={editStaff}
            onClose={() => setEditStaff(null)}
            onSave={async (data) => {
              if (editStaff.id) {
                await onUpdateStaff(editStaff.id, data);
                setEditStaff(null);
              }
            }}
            isLightMode={isLightMode}
          />
        )}
      </AnimatePresence>

      {/* Remove Staff Confirmation */}
      <AnimatePresence>
        {removeStaff && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border-color rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-border-color bg-[#0D0D0D]/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <UserX size={20} className="text-red-400" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-white">Remove Staff Member</h2>
                  <p className="text-xs text-text-secondary">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className={`p-3 rounded-lg border ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-[#0D0D0D] border-border-color'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm">
                      {removeStaff.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{removeStaff.name}</p>
                      <p className="text-xs text-text-secondary">{removeStaff.role} • {removeStaff.salary}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">
                    This will permanently remove <strong>{removeStaff.name}</strong> from the staff list. All their data will be deleted.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/30 flex justify-end gap-3">
                <button
                  onClick={() => setRemoveStaff(null)}
                  className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!removeStaff.id) return;
                    setRemoveLoading(true);
                    try {
                      await onDeleteStaff(removeStaff.id);
                      setRemoveStaff(null);
                    } catch {
                      alert('Failed to remove staff member.');
                    } finally {
                      setRemoveLoading(false);
                    }
                  }}
                  disabled={removeLoading}
                  className="px-5 py-2 rounded-md text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {removeLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Remove Staff
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Staff Profile View ─────────────────────────────────────────────────────

function StaffProfile({ staff, onBack, onUpdate, onStatusChange, isLightMode, isAdmin }: {
  staff: Staff;
  onBack: () => void;
  onUpdate: (data: Partial<Staff>) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  isLightMode: boolean;
  isAdmin: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payslips'>('overview');
  const [attMonth, setAttMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendance, setAttendance] = useState<DailyStaffAttendance[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const statusConfig = STATUS_CONFIG[(staff.status as StaffStatusType)] || STATUS_CONFIG['Absent'];

  // Fetch data
  useEffect(() => {
    if (!staff.id) return;
    async function load() {
      setIsLoading(true);
      const [att, slips] = await Promise.all([
        getStaffMonthlyAttendance(staff.id!, attMonth),
        getPayslips()
      ]);
      setAttendance(att);
      setPayslips(slips.filter(s => s.staffId === staff.id));
      setIsLoading(false);
    }
    load();
  }, [staff.id, attMonth]);

  const handleGeneratePayslip = async () => {
    if (!staff.id || !isAdmin) return;
    setIsLoading(true);
    try {
      const salary = parseFloat(staff.salary?.replace(/[^\d]/g, '') || '0');
      await generatePayslip(staff.id, 'staff', staff.name, salary, attMonth, 26);
      const slips = await getPayslips();
      setPayslips(slips.filter(s => s.staffId === staff.id));
      alert('Payslip generated successfully');
    } catch (err) {
      alert('Error generating payslip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePayslipStatus = async (id: string, newStatus: 'approved' | 'paid') => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      await updatePayslipStatus(id, newStatus);
      const slips = await getPayslips();
      setPayslips(slips.filter(s => s.staffId === staff.id));
    } catch (err) {
      alert('Error updating status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm mb-6 font-semibold">
        <ArrowLeft size={16} /> Back to Staff
      </button>

      {/* Header */}
      <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6`}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-[#0D0D0D] border border-border-color flex items-center justify-center font-heading text-3xl font-bold text-primary shrink-0">
            {staff.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{staff.name}</h1>
            <div className="text-sm text-text-secondary mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5"><Briefcase size={14} /> {staff.role}</span>
              <span className="flex items-center gap-1.5"><Phone size={14} /> {staff.phone}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> Since {staff.joinDate}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {isAdmin ? (
                <select
                  value={staff.status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className={`text-[11px] uppercase font-bold tracking-wider px-3 py-1 rounded-md cursor-pointer border ${statusConfig.bg} ${statusConfig.color} bg-transparent focus:outline-none`}
                >
                  <option value="Present">✅ Present</option>
                  <option value="Absent">❌ Absent</option>
                  <option value="On Leave">🟠 On Leave</option>
                  <option value="Half Day">🟡 Half Day</option>
                </select>
              ) : (
                <span className={`${statusConfig.color} ${statusConfig.bg} px-3 py-1 rounded-md text-[11px] uppercase font-bold tracking-wider`}>
                  {staff.status}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={`https://wa.me/${staff.phone}?text=Hello ${staff.name}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-500/20 transition-colors">
            <MessageCircle size={16} /> WhatsApp
          </a>
          <a href={`tel:${staff.phone}`}
            className="flex items-center gap-2 bg-surface border border-border-color text-text-secondary px-4 py-2 rounded-md text-sm font-semibold hover:text-white transition-colors">
            <Phone size={16} /> Call
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border rounded-lg overflow-hidden shrink-0 mb-6 w-max`}>
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-primary/10 text-primary' : `text-text-secondary ${isLightMode ? 'hover:text-gray-900' : 'hover:text-white'}`}`}>
          <Eye size={16} /> Overview
        </button>
        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-primary/10 text-primary' : `text-text-secondary ${isLightMode ? 'hover:text-gray-900' : 'hover:text-white'}`}`}>
          <Calendar size={16} /> Attendance
        </button>
        <button onClick={() => setActiveTab('payslips')} className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'payslips' ? 'bg-primary/10 text-primary' : `text-text-secondary ${isLightMode ? 'hover:text-gray-900' : 'hover:text-white'}`}`}>
          <FileText size={16} /> Payslips
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-5`}>
            <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Employment Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Role', value: staff.role },
                { label: 'Type', value: staff.type },
                { label: 'Shift', value: `${staff.shiftStart} – ${staff.shiftEnd}` },
                { label: 'Monthly Salary', value: staff.salary },
                { label: 'Join Date', value: staff.joinDate },
              ].map((item, i) => (
                <div key={i} className="flex justify-between border-b border-border-color/50 pb-2">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className={`font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{item.value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl p-5`}>
              <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Salary Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] border border-border-color rounded-lg p-4 text-center">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Monthly</p>
                  <p className="text-lg font-bold font-mono text-emerald-400">{staff.salary}</p>
                </div>
                <div className="bg-[#0D0D0D] border border-border-color rounded-lg p-4 text-center">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Daily Rate</p>
                  <p className="text-lg font-bold font-mono text-white">
                    ₹{Math.round(parseInt(staff.salary?.replace(/[^\d]/g, '') || '0') / 30).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-[#0D0D0D] border border-border-color rounded-lg p-4 text-center">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Annual (Est.)</p>
                  <p className="text-lg font-bold font-mono text-white">
                    ₹{(parseInt(staff.salary?.replace(/[^\d]/g, '') || '0') * 12).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'} flex justify-between items-center`}>
            <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Monthly Attendance</h3>
            <input 
              type="month" 
              value={attMonth}
              onChange={(e) => setAttMonth(e.target.value)}
              className={`bg-[#0D0D0D] border border-border-color rounded-md px-3 py-1.5 text-sm text-white focus:outline-none [color-scheme:dark]`}
            />
          </div>
          {isLoading ? (
            <div className="p-12 text-center text-text-secondary"><Activity className="animate-spin mx-auto mb-3" /> Loading...</div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['S','M','T','W','T','F','S'].map((d,i) => (
                  <div key={i} className="text-center text-[10px] text-text-secondary font-bold uppercase">{d}</div>
                ))}
                {(() => {
                  const [y, m] = attMonth.split('-').map(Number);
                  const daysInMonth = new Date(y, m, 0).getDate();
                  const firstDay = new Date(y, m - 1, 1).getDay();
                  const cells = [];
                  
                  // Empty cells
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`e-${i}`} className="aspect-square opacity-0"></div>);
                  }
                  
                  // Days
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${attMonth}-${String(d).padStart(2, '0')}`;
                    const att = attendance.find(a => a.date === dateStr);
                    let color = 'bg-[#0D0D0D] border-border-color';
                    if (att?.status === 'Present') color = 'bg-green-500/20 border-green-500/30 text-green-400';
                    if (att?.status === 'Absent') color = 'bg-red-500/20 border-red-500/30 text-red-400';
                    if (att?.status === 'Late') color = 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
                    if (att?.status === 'On Leave' || att?.status === 'Half Day') color = 'bg-orange-500/20 border-orange-500/30 text-orange-400';

                    cells.push(
                      <div key={d} className={`aspect-square border rounded-md flex flex-col items-center justify-center text-xs font-semibold ${color}`} title={att ? `${att.status} (${att.checkInTime || 'No check-in'})` : 'No data'}>
                        {d}
                        {att?.lateByMinutes ? <span className="text-[9px] mt-0.5 opacity-80">+{att.lateByMinutes}m</span> : null}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex flex-wrap gap-4 justify-center text-[11px] uppercase font-bold tracking-wider mt-6">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded" /> Present ({attendance.filter(a => a.status === 'Present').length})</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" /> Absent ({attendance.filter(a => a.status === 'Absent').length})</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500/30 rounded" /> Late ({attendance.filter(a => a.status === 'Late').length})</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500/20 border border-orange-500/30 rounded" /> Leave ({attendance.filter(a => a.status === 'On Leave' || a.status === 'Half Day').length})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payslips' && (
        <div className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'} flex justify-between items-center`}>
            <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Payslip History</h3>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <input 
                  type="month" 
                  value={attMonth}
                  onChange={(e) => setAttMonth(e.target.value)}
                  className={`bg-[#0D0D0D] border border-border-color rounded-md px-3 py-1.5 text-sm text-white focus:outline-none [color-scheme:dark]`}
                />
                <button onClick={handleGeneratePayslip} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-1.5 rounded-md text-xs transition-colors">
                  Generate Payslip
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="p-12 text-center text-text-secondary"><Activity className="animate-spin mx-auto mb-3" /> Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`bg-[#0D0D0D] border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-text-secondary text-[11px] uppercase tracking-wider`}>
                  <tr>
                    <th className="px-5 py-3 font-medium">Month</th>
                    <th className="px-5 py-3 font-medium">Generated On</th>
                    <th className="px-5 py-3 font-medium">Net Salary</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    {isAdmin && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLightMode ? 'divide-gray-100' : 'divide-border-color'}`}>
                  {payslips.map(slip => (
                    <tr key={slip.id} className="hover:bg-[#0D0D0D]/50 transition-colors">
                      <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{slip.month}</td>
                      <td className="px-5 py-3 text-text-secondary">{slip.generatedDate}</td>
                      <td className="px-5 py-3 font-mono text-emerald-400 font-medium">₹{slip.netSalary.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          slip.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                          slip.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-orange-500/10 text-orange-400'
                        }`}>
                          {slip.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {slip.status === 'draft' && (
                              <button onClick={() => handleUpdatePayslipStatus(slip.id!, 'approved')} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded">Approve</button>
                            )}
                            {slip.status === 'approved' && (
                              <button onClick={() => handleUpdatePayslipStatus(slip.id!, 'paid')} className="text-[11px] font-semibold text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded">Mark Paid</button>
                            )}
                            <button className="text-[11px] font-semibold text-text-secondary hover:text-white bg-surface border border-border-color px-2 py-1 rounded flex items-center gap-1">
                              <Download size={12} /> PDF
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {payslips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-text-secondary">
                        <FileText size={32} className="mx-auto mb-3 opacity-30" />
                        <p>No payslips generated for this staff member.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Staff Modal ─────────────────────────────────────────────────────────

function AddStaffModal({ isOpen, onClose, onAdd, isLightMode }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Receptionist');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState('09:00 AM');
  const [shiftEnd, setShiftEnd] = useState('06:00 PM');
  const [salary, setSalary] = useState('18000');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd({
        name,
        phone,
        role,
        joinDate,
        shiftStart,
        shiftEnd,
        salary: `₹${parseInt(salary).toLocaleString('en-IN')}`,
        status: 'Absent',
        type: (role === 'Manager' || role === 'Receptionist') ? 'Admin' : 'Support'
      });
      setName('');
      setPhone('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface border border-border-color rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <UserPlus size={20} className="text-primary"/> Add New Staff
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-4">
          <form id="add-staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Full Name</label>
                 <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter full name" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Phone Number</label>
                 <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="Enter phone" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Job Role</label>
                 <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   <option>Receptionist</option>
                   <option>Manager</option>
                   <option>Cleaning</option>
                   <option>Security</option>
                   <option>Maintenance</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Joining Date</label>
                 <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Shift Start Time</label>
                 <input type="text" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. 09:00 AM" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Shift End Time</label>
                 <input type="text" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. 06:00 PM" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Salary Per Month</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                   <input required type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="0" />
                 </div>
              </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white hover:bg-surface transition-colors">Cancel</button>
          <button type="submit" form="add-staff-form" disabled={loading} className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Staff
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Staff Modal ────────────────────────────────────────────────────────

function EditStaffModal({ staff, onClose, onSave, isLightMode }: {
  staff: Staff;
  onClose: () => void;
  onSave: (data: Partial<Staff>) => Promise<void>;
  isLightMode: boolean;
}) {
  const [name, setName] = useState(staff.name);
  const [phone, setPhone] = useState(staff.phone);
  const [role, setRole] = useState(staff.role);
  const [shiftStart, setShiftStart] = useState(staff.shiftStart);
  const [shiftEnd, setShiftEnd] = useState(staff.shiftEnd);
  const [salary, setSalary] = useState(staff.salary?.replace(/[^\d]/g, '') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        name,
        phone,
        role,
        shiftStart,
        shiftEnd,
        salary: `₹${parseInt(salary).toLocaleString('en-IN')}`,
        type: (role === 'Manager' || role === 'Receptionist') ? 'Admin' : 'Support'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-border-color rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Edit size={20} className="text-primary"/> Edit Staff — {staff.name}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-4">
          <form id="edit-staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Full Name</label>
                 <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Phone Number</label>
                 <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Job Role</label>
                 <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-text-secondary focus:border-primary/50 focus:outline-none">
                   <option>Receptionist</option>
                   <option>Manager</option>
                   <option>Cleaning</option>
                   <option>Security</option>
                   <option>Maintenance</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Shift Start</label>
                 <input type="text" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Shift End</label>
                 <input type="text" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-text-secondary uppercase">Salary (₹)</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">₹</span>
                   <input required type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md pl-7 pr-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" />
                 </div>
              </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border-color bg-[#0D0D0D]/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-text-secondary hover:text-white transition-colors">Cancel</button>
          <button type="submit" form="edit-staff-form" disabled={loading} className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
