'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, Download, RefreshCw, Check, AlertTriangle, CheckCircle2, 
  Fingerprint, Usb, Calendar, LogOut, Clock, Users, Activity,
  BarChart3, TrendingUp, XCircle, Coffee, Timer, Wifi, WifiOff,
  ChevronDown, Filter, ArrowRight
} from 'lucide-react';
import { 
  Member, Staff, Trainer, Attendance, AttendanceRecord,
  DailyStaffAttendance,
  markCheckIn, markCheckOut, subscribeToAttendance,
  getAttendanceRecords, getStaffAttendanceByDate,
  saveStaffAttendance, updateStaffAttendance
} from '@/lib/db';
import { biometricService } from '@/lib/biometric';

interface AttendanceViewProps {
  members: Member[];
  staff: Staff[];
  trainers: Trainer[];
  attendance: AttendanceRecord[];
  onAttendanceUpdate: (records: AttendanceRecord[]) => void;
  onUpdateStaffStatus: (id: string, status: string) => void;
  onUpdateTrainerStatus: (id: string, status: string) => void;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

type TabType = 'live' | 'staff' | 'analytics' | 'history';

const TABS: { id: TabType; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: 'Live Check-in', icon: Activity },
  { id: 'staff', label: 'Staff & Trainers', icon: Users },
  { id: 'analytics', label: 'Member Analytics', icon: BarChart3 },
  { id: 'history', label: 'History & Export', icon: Calendar },
];

export default function AttendanceView({ 
  members, staff, trainers, attendance, onAttendanceUpdate, 
  onUpdateStaffStatus, onUpdateTrainerStatus, isLightMode, role 
}: AttendanceViewProps) {
  const [tab, setTab] = useState<TabType>('live');
  const [search, setSearch] = useState('');
  const [checkInMember, setCheckInMember] = useState<Member | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<'none' | 'success' | 'already'>('none');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastScans, setLastScans] = useState<{ name: string; time: string; type: string }[]>([]);

  // Staff attendance tab state
  const [staffDate, setStaffDate] = useState(new Date().toISOString().slice(0, 10));
  const [staffAttendance, setStaffAttendance] = useState<DailyStaffAttendance[]>([]);
  const [staffView, setStaffView] = useState<'roster' | 'calendar'>('roster');

  // Analytics tab state
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date().toISOString().slice(0, 7));

  // History tab state
  const [historyFrom, setHistoryFrom] = useState(new Date().toISOString().slice(0, 10));
  const [historyTo, setHistoryTo] = useState(new Date().toISOString().slice(0, 10));
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'member' | 'staff' | 'trainer'>('all');
  const [historyLoading, setHistoryLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = attendance.filter(a => a.date === todayStr);

  // Real-time subscription for today's attendance
  useEffect(() => {
    const unsub = subscribeToAttendance(todayStr, (records) => {
      onAttendanceUpdate(records);
    });
    return () => unsub();
  }, [todayStr]);

  // Biometric service listeners
  useEffect(() => {
    setBiometricStatus(biometricService.getStatus());

    biometricService.onDeviceStatus((status) => {
      setBiometricStatus(status as any);
    });

    biometricService.onScan(async (fingerprintId, timestamp) => {
      // In production, the fingerprintId maps to a member/staff/trainer
      // For now, this is the integration point
      console.log('Biometric scan received:', fingerprintId, timestamp);
    });

    return () => {
      biometricService.removeAllListeners();
    };
  }, []);

  // Load staff attendance when date changes
  useEffect(() => {
    if (tab === 'staff') {
      getStaffAttendanceByDate(staffDate).then(setStaffAttendance);
    }
  }, [staffDate, tab]);

  // Search handler with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setCheckInStatus('none');
    if (val.length > 2) {
      const match = members.find((m) => 
        m.name.toLowerCase().includes(val.toLowerCase()) || 
        m.phone.includes(val)
      );
      setCheckInMember(match || null);
    } else {
      setCheckInMember(null);
    }
  }, [members]);

  // Check if member already checked in today
  const isAlreadyCheckedIn = (memberId: string) => {
    return todayVisits.some(v => v.personId === memberId && !v.checkOutTime);
  };

  // Get the active check-in record for a person
  const getActiveCheckIn = (personId: string) => {
    return todayVisits.find(v => v.personId === personId && !v.checkOutTime);
  };

  const handleCheckIn = async () => {
    if (!checkInMember || !checkInMember.id) return;

    if (isAlreadyCheckedIn(checkInMember.id)) {
      setCheckInStatus('already');
      setTimeout(() => setCheckInStatus('none'), 3000);
      return;
    }

    setIsCheckingIn(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toISOString().slice(0, 10);

    const record: Omit<AttendanceRecord, 'id'> = {
      personId: checkInMember.id,
      personType: 'member',
      name: checkInMember.name,
      phone: checkInMember.phone,
      date: dateStr,
      checkInTime: timeStr,
      checkInTimestamp: now.getTime(),
      method: 'manual',
      plan: checkInMember.plan,
      status: checkInMember.status,
    };

    try {
      await markCheckIn(record);
      setCheckInStatus('success');
      setLastScans(prev => [{ name: checkInMember.name, time: timeStr, type: 'Member' }, ...prev].slice(0, 5));
      setSearch('');
      setTimeout(() => { setCheckInMember(null); setCheckInStatus('none'); }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (recordId: string) => {
    try {
      await markCheckOut(recordId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBiometricConnect = () => {
    if (biometricService.getStatus() === 'connected' || biometricService.isSimulation()) {
      biometricService.disconnect();
      biometricService.disableSimulation();
    } else {
      // Try real connection first, fall back to simulation
      try {
        biometricService.connect();
      } catch (err) {
        biometricService.enableSimulation();
        setBiometricStatus('connected');
      }
    }
  };

  // Staff check-in handler
  const handleStaffCheckIn = async (person: Staff | Trainer, type: 'staff' | 'trainer') => {
    if (!person.id) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toISOString().slice(0, 10);

    // Check if already has attendance record today
    const existing = staffAttendance.find(a => a.staffId === person.id);
    if (existing && existing.status !== 'Absent') return;

    const shiftStart = type === 'staff' 
      ? (person as Staff).shiftStart 
      : (person as Trainer).timing?.split('-')[0]?.trim() || '09:00';
    const shiftEnd = type === 'staff' 
      ? (person as Staff).shiftEnd 
      : (person as Trainer).timing?.split('-')[1]?.trim() || '18:00';

    // Calculate if late (30 min grace period)
    const [shiftH, shiftM] = shiftStart.split(':').map(Number);
    const graceMinutes = (shiftH * 60 + (shiftM || 0)) + 30;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isLate = currentMinutes > graceMinutes;
    const lateByMinutes = isLate ? currentMinutes - (shiftH * 60 + (shiftM || 0)) : 0;

    const record: Omit<DailyStaffAttendance, 'id'> = {
      staffId: person.id,
      staffType: type,
      name: person.name,
      date: dateStr,
      status: isLate ? 'Late' : 'Present',
      checkInTime: timeStr,
      expectedShiftStart: shiftStart,
      expectedShiftEnd: shiftEnd,
      isLate,
      lateByMinutes,
      method: 'manual',
    };

    if (existing) {
      // Update existing absent record
      await updateStaffAttendance(existing.id!, { 
        ...record, 
        status: isLate ? 'Late' : 'Present' 
      });
    } else {
      await saveStaffAttendance(record);
    }

    // Also create an attendance record for the live feed
    await markCheckIn({
      personId: person.id,
      personType: type,
      name: person.name,
      phone: person.phone,
      date: dateStr,
      checkInTime: timeStr,
      checkInTimestamp: now.getTime(),
      method: 'manual',
      status: isLate ? 'Late' : 'Present',
    });

    // Update the global state so it's marked as present "all over the application"
    if (type === 'staff') {
      onUpdateStaffStatus(person.id, isLate ? 'Late' : 'Present');
    } else {
      onUpdateTrainerStatus(person.id, isLate ? 'Late' : 'Present');
    }

    // Refresh staff attendance
    const updated = await getStaffAttendanceByDate(dateStr);
    setStaffAttendance(updated);
  };

  const handleMarkLeave = async (staffId: string) => {
    const existing = staffAttendance.find(a => a.staffId === staffId);
    if (existing) {
      await updateStaffAttendance(existing.id!, { status: 'On Leave', method: 'manual' });
    } else {
      const person = [...staff, ...trainers].find(p => p.id === staffId);
      if (!person) return;
      const isStaffMember = staff.some(s => s.id === staffId);
      await saveStaffAttendance({
        staffId,
        staffType: isStaffMember ? 'staff' : 'trainer',
        name: person.name,
        date: staffDate,
        status: 'On Leave',
        expectedShiftStart: isStaffMember ? (person as Staff).shiftStart : '09:00',
        expectedShiftEnd: isStaffMember ? (person as Staff).shiftEnd : '18:00',
        isLate: false,
        lateByMinutes: 0,
        method: 'manual',
      });
    }
    const updated = await getStaffAttendanceByDate(staffDate);
    setStaffAttendance(updated);
    
    // Update global application state
    const isStaffMember = staff.some(s => s.id === staffId);
    if (isStaffMember) {
      onUpdateStaffStatus(staffId, 'On Leave');
    } else {
      onUpdateTrainerStatus(staffId, 'On Leave');
    }
  };

  // History search
  const handleHistorySearch = async () => {
    setHistoryLoading(true);
    try {
      const allRecords = await getAttendanceRecords();
      const filtered = allRecords.filter(r => {
        const inRange = r.date >= historyFrom && r.date <= historyTo;
        const matchType = historyFilter === 'all' || r.personType === historyFilter;
        return inRange && matchType;
      });
      setHistoryRecords(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const data = historyRecords.length > 0 ? historyRecords : todayVisits;
    if (data.length === 0) return;

    const headers = ['Date', 'Name', 'Type', 'Phone', 'Check-In', 'Check-Out', 'Duration (min)', 'Method', 'Status'];
    const rows = data.map(r => [
      r.date, r.name, r.personType, r.phone, r.checkInTime, 
      r.checkOutTime || '-', r.duration?.toString() || '-', r.method, r.status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${historyFrom}_${historyTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Analytics calculations
  const getMonthlyHeatmapData = () => {
    const monthRecords = attendance.filter(a => a.date.startsWith(analyticsMonth) && a.personType === 'member');
    const dayCounts: Record<number, number> = {};
    monthRecords.forEach(r => {
      const day = parseInt(r.date.split('-')[2]);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const year = parseInt(analyticsMonth.split('-')[0]);
    const month = parseInt(analyticsMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

    return { dayCounts, daysInMonth, firstDayOfWeek };
  };

  const getPeakHoursData = () => {
    const hourCounts: Record<number, number> = {};
    const monthRecords = attendance.filter(a => a.date.startsWith(analyticsMonth) && a.personType === 'member');
    monthRecords.forEach(r => {
      const timeParts = r.checkInTime?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeParts) {
        let hour = parseInt(timeParts[1]);
        const ampm = timeParts[3].toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    return hourCounts;
  };

  const getTopMembers = () => {
    const monthRecords = attendance.filter(a => a.date.startsWith(analyticsMonth) && a.personType === 'member');
    const memberCounts: Record<string, { name: string; count: number }> = {};
    monthRecords.forEach(r => {
      if (!memberCounts[r.personId]) {
        memberCounts[r.personId] = { name: r.name, count: 0 };
      }
      memberCounts[r.personId].count++;
    });
    return Object.values(memberCounts).sort((a, b) => b.count - a.count).slice(0, 15);
  };

  const cardClass = `${isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color'} border rounded-xl`;
  const textPrimary = isLightMode ? 'text-gray-900' : 'text-white';
  const textSecondary = isLightMode ? 'text-gray-500' : 'text-text-secondary';
  const inputClass = `w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400' : 'bg-[#0D0D0D] border-border-color text-white placeholder:text-text-secondary/70'} border rounded-md text-sm focus:outline-none focus:border-primary/50`;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${textPrimary}`}>
          Attendance <span className={`text-[12px] ${textSecondary} ml-2 font-normal font-sans`}>(उपस्थिति)</span>
        </h1>
        <div className={`flex ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border rounded-lg overflow-hidden shrink-0`}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button 
                key={t.id}
                onClick={() => setTab(t.id)} 
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  tab === t.id 
                    ? 'bg-primary/10 text-primary' 
                    : `${textSecondary} ${isLightMode ? 'hover:text-gray-900' : 'hover:text-white'}`
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: LIVE CHECK-IN                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'live' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-5">

            {/* Quick Check-in Panel */}
            <div className={`${cardClass} p-5`}>
              <h2 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight mb-4`}>Quick Check-in</h2>
              <div className="relative mb-4">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} size={18} />
                <input 
                  type="text" 
                  placeholder="Enter Member Name or Phone..." 
                  value={search}
                  onChange={handleSearchChange}
                  className={`${inputClass} py-3 pl-10 pr-4`}
                />
              </div>
              
              {checkInMember && checkInStatus === 'none' && (
                <div className={`mt-4 p-4 border ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-border-color bg-[#0D0D0D]'} rounded-lg`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-surface border-border-color'} border text-primary flex items-center justify-center font-heading font-bold text-lg uppercase shrink-0`}>
                      {checkInMember.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <strong className={`${textPrimary} block`}>{checkInMember.name}</strong>
                      <span className={`text-xs ${textSecondary}`}>{checkInMember.phone} • {checkInMember.plan}</span>
                    </div>
                  </div>
                  
                  {checkInMember.status === 'Expired' ? (
                    <div className="bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold leading-relaxed p-3 rounded-md flex items-start gap-2 mb-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>Membership expired on {checkInMember.expiryDate}. Please renew.</span>
                    </div>
                  ) : checkInMember.id && isAlreadyCheckedIn(checkInMember.id) ? (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold p-3 rounded-md flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        <span>Already checked in today</span>
                      </div>
                      <button 
                        onClick={() => {
                          const active = getActiveCheckIn(checkInMember.id!);
                          if (active?.id) handleCheckOut(active.id);
                        }}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition-colors text-xs"
                      >
                        <LogOut size={14} /> Check Out
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleCheckIn} 
                      disabled={isCheckingIn}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingIn ? (
                        <RefreshCw size={18} strokeWidth={3} className="animate-spin" />
                      ) : (
                        <Check size={18} strokeWidth={3} />
                      )}
                      {isCheckingIn ? 'Processing...' : 'Mark Attendance'}
                    </button>
                  )}
                </div>
              )}

              {checkInStatus === 'success' && checkInMember && (
                <div className="mt-4 p-5 border border-green-500/30 rounded-lg bg-green-500/10 text-center flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-green-500 mb-2" />
                  <p className={`${textPrimary} font-semibold mb-1`}>Welcome, {checkInMember.name}!</p>
                  <p className="text-green-500 text-sm">Have a great workout 💪</p>
                </div>
              )}

              {checkInStatus === 'already' && (
                <div className="mt-4 p-4 border border-orange-500/30 rounded-lg bg-orange-500/10 text-center">
                  <AlertTriangle size={24} className="text-orange-400 mx-auto mb-2" />
                  <p className="text-orange-400 text-sm font-semibold">Already checked in today</p>
                </div>
              )}
            </div>

            {/* Biometric Panel */}
            <div className={`${cardClass} p-5`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border rounded-lg shrink-0`}>
                  <Fingerprint size={24} className={biometricStatus === 'connected' ? 'text-green-500' : textSecondary} />
                </div>
                <div>
                  <h2 className={`font-heading font-semibold text-[14px] ${textPrimary} uppercase tracking-tight`}>Biometric System</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      biometricStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                      biometricStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                      'bg-orange-500'
                    }`}></div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      biometricStatus === 'connected' ? 'text-green-500' :
                      biometricStatus === 'connecting' ? 'text-yellow-500' :
                      'text-orange-500'
                    }`}>
                      {biometricStatus === 'connected' ? (biometricService.isSimulation() ? 'Simulation Mode' : 'Connected') :
                       biometricStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              <p className={`text-[13px] ${textSecondary} leading-relaxed`}>
                {biometricStatus === 'connected' 
                  ? 'Fingerprint scanner is active. Members can scan to auto check-in.'
                  : 'Connect USB fingerprint scanner to enable auto check-in.'}
              </p>
              <button 
                onClick={handleBiometricConnect}
                className={`mt-4 w-full ${
                  biometricStatus === 'connected' 
                    ? 'bg-red-600/20 border-red-500/30 hover:bg-red-600/30 text-red-400' 
                    : `${isLightMode ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' : 'bg-[#0D0D0D] border-border-color hover:bg-[#1a1a1a]'} ${textPrimary}`
                } border text-[13px] font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors`}
              >
                {biometricStatus === 'connected' ? (
                  <><WifiOff size={16} /> Disconnect</>
                ) : (
                  <><Usb size={16} /> Connect Device</>
                )}
              </button>
            </div>

            {/* Recent Scans Mini-Log */}
            {lastScans.length > 0 && (
              <div className={`${cardClass} p-5`}>
                <h3 className={`font-heading font-semibold text-[12px] ${textSecondary} uppercase tracking-tight mb-3`}>Recent Check-ins</h3>
                <div className="space-y-2">
                  {lastScans.map((scan, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 ${i > 0 ? `border-t ${isLightMode ? 'border-gray-100' : 'border-border-color'}` : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span className={`text-sm ${textPrimary}`}>{scan.name}</span>
                      </div>
                      <span className={`text-[11px] ${textSecondary}`}>{scan.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's Live Feed Table */}
          <div className="xl:col-span-2">
            <div className={`${cardClass} flex flex-col h-[700px]`}>
              <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'} flex justify-between items-center shrink-0`}>
                <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight`}>Today&apos;s Live Feed</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-500">LIVE</span>
                  </div>
                  <span className={`text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-md`}>
                    {todayVisits.length} visitors
                  </span>
                  {role === 'admin' && (
                    <button 
                      onClick={handleExportCSV}
                      className={`flex items-center gap-1.5 text-xs font-semibold ${isLightMode ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200' : 'text-white bg-surface hover:bg-[#222] border-border-color'} border px-3 py-1.5 rounded-md transition-colors`}
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto no-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className={`${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border-b text-[11px] uppercase tracking-wider sticky top-0 z-10 ${textSecondary}`}>
                    <tr>
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">In Time</th>
                      <th className="px-5 py-3 font-medium">Out Time</th>
                      <th className="px-5 py-3 font-medium">Duration</th>
                      <th className="px-5 py-3 font-medium">Method</th>
                      <th className="px-5 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-gray-100' : 'divide-border-color'}`}>
                    {todayVisits.map((visit, index) => (
                      <tr key={visit.id || index} className={`${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/50'} transition-colors ${!visit.checkOutTime ? '' : 'opacity-60'}`}>
                        <td className={`px-5 py-3 ${textSecondary}`}>{index + 1}</td>
                        <td className={`px-5 py-3 font-medium ${textPrimary}`}>{visit.name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            visit.personType === 'member' ? 'bg-blue-500/10 text-blue-400' :
                            visit.personType === 'staff' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-teal-500/10 text-teal-400'
                          }`}>{visit.personType}</span>
                        </td>
                        <td className={`px-5 py-3 ${textSecondary} font-mono text-xs`}>{visit.phone}</td>
                        <td className={`px-5 py-3 font-medium ${textPrimary}`}>{visit.checkInTime}</td>
                        <td className={`px-5 py-3 ${visit.checkOutTime ? textPrimary : textSecondary}`}>
                          {visit.checkOutTime || '—'}
                        </td>
                        <td className={`px-5 py-3 ${textSecondary}`}>
                          {visit.duration ? `${visit.duration} min` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-semibold ${visit.method === 'biometric' ? 'text-green-500' : textSecondary}`}>
                            {visit.method === 'biometric' ? '🔒' : '✋'} {visit.method}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {!visit.checkOutTime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> IN
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400">
                              OUT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {todayVisits.length === 0 && (
                      <tr>
                        <td colSpan={9} className={`px-5 py-12 text-center ${textSecondary}`}>
                          <Activity size={32} className="mx-auto mb-3 opacity-30" />
                          <p>No check-ins recorded today yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: STAFF & TRAINERS                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'staff' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className={textSecondary} />
              <input 
                type="date" 
                value={staffDate}
                onChange={(e) => setStaffDate(e.target.value)}
                className={`${inputClass} px-3 py-2 w-44 [color-scheme:dark]`} 
              />
            </div>
            <div className={`flex ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border rounded-md overflow-hidden`}>
              <button 
                onClick={() => setStaffView('roster')}
                className={`px-3 py-1.5 text-xs font-semibold ${staffView === 'roster' ? 'bg-primary/10 text-primary' : textSecondary}`}
              >Roster View</button>
              <button 
                onClick={() => setStaffView('calendar')}
                className={`px-3 py-1.5 text-xs font-semibold ${staffView === 'calendar' ? 'bg-primary/10 text-primary' : textSecondary}`}
              >Calendar View</button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Present', count: staffAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Absent', count: staffAttendance.filter(a => a.status === 'Absent').length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
              { label: 'Late', count: staffAttendance.filter(a => a.status === 'Late').length, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
              { label: 'On Leave', count: staffAttendance.filter(a => a.status === 'On Leave').length, icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${cardClass} p-4 flex items-center gap-3`}>
                  <div className={`p-2.5 ${stat.bg} rounded-lg`}>
                    <Icon size={18} className={stat.color} />
                  </div>
                  <div>
                    <p className={`text-2xl font-heading font-bold ${textPrimary}`}>{stat.count}</p>
                    <p className={`text-[11px] ${textSecondary} uppercase tracking-wider font-semibold`}>{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staff Roster */}
          {staffView === 'roster' && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'}`}>
                <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight`}>
                  Daily Roster — {new Date(staffDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <div className="overflow-auto no-scrollbar max-h-[500px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className={`${isLightMode ? 'bg-gray-50' : 'bg-[#0D0D0D]'} border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-[11px] uppercase tracking-wider sticky top-0 z-10 ${textSecondary}`}>
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Expected Shift</th>
                      <th className="px-5 py-3 font-medium">Check-In</th>
                      <th className="px-5 py-3 font-medium">Check-Out</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      {role === 'admin' && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-gray-100' : 'divide-border-color'}`}>
                    {/* Staff */}
                    {staff.filter(s => s.status !== 'Inactive').map(s => {
                      const att = staffAttendance.find(a => a.staffId === s.id);
                      const statusConfig = {
                        'Present': { color: 'text-green-500', bg: 'bg-green-500/10', icon: '✅' },
                        'Absent': { color: 'text-red-500', bg: 'bg-red-500/10', icon: '❌' },
                        'Late': { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: '⏰' },
                        'On Leave': { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: '🏖️' },
                        'Half Day': { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: '🕐' },
                      };
                      const status = att?.status || 'Not marked';
                      const config = statusConfig[status as keyof typeof statusConfig];

                      return (
                        <tr key={s.id} className={`${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/50'} transition-colors`}>
                          <td className={`px-5 py-3 font-medium ${textPrimary}`}>{s.name}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400">
                              {s.role}
                            </span>
                          </td>
                          <td className={`px-5 py-3 ${textSecondary} text-xs`}>{s.shiftStart} - {s.shiftEnd}</td>
                          <td className={`px-5 py-3 ${att?.checkInTime ? textPrimary : textSecondary}`}>
                            {att?.checkInTime || '—'}
                          </td>
                          <td className={`px-5 py-3 ${att?.checkOutTime ? textPrimary : textSecondary}`}>
                            {att?.checkOutTime || '—'}
                          </td>
                          <td className="px-5 py-3">
                            {config ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
                                {config.icon} {status}
                                {att?.lateByMinutes ? ` (${att.lateByMinutes}m)` : ''}
                              </span>
                            ) : (
                              <span className={`text-[11px] ${textSecondary} italic`}>Not marked</span>
                            )}
                          </td>
                          {role === 'admin' && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(!att || att.status === 'Absent') && staffDate === todayStr && (
                                  <button 
                                    onClick={() => handleStaffCheckIn(s, 'staff')}
                                    className="text-[11px] font-semibold text-green-500 hover:text-green-400 bg-green-500/10 px-2.5 py-1 rounded transition-colors"
                                  >Check In</button>
                                )}
                                {(!att || att.status !== 'On Leave') && (
                                  <button 
                                    onClick={() => s.id && handleMarkLeave(s.id)}
                                    className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 px-2.5 py-1 rounded transition-colors"
                                  >Leave</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {/* Trainers */}
                    {trainers.filter(t => t.status === 'Active').map(t => {
                      const att = staffAttendance.find(a => a.staffId === t.id);
                      const statusConfig = {
                        'Present': { color: 'text-green-500', bg: 'bg-green-500/10', icon: '✅' },
                        'Absent': { color: 'text-red-500', bg: 'bg-red-500/10', icon: '❌' },
                        'Late': { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: '⏰' },
                        'On Leave': { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: '🏖️' },
                        'Half Day': { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: '🕐' },
                      };
                      const status = att?.status || 'Not marked';
                      const config = statusConfig[status as keyof typeof statusConfig];

                      return (
                        <tr key={t.id} className={`${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/50'} transition-colors`}>
                          <td className={`px-5 py-3 font-medium ${textPrimary}`}>{t.name}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400">
                              Trainer
                            </span>
                          </td>
                          <td className={`px-5 py-3 ${textSecondary} text-xs`}>{t.timing || '—'}</td>
                          <td className={`px-5 py-3 ${att?.checkInTime ? textPrimary : textSecondary}`}>
                            {att?.checkInTime || '—'}
                          </td>
                          <td className={`px-5 py-3 ${att?.checkOutTime ? textPrimary : textSecondary}`}>
                            {att?.checkOutTime || '—'}
                          </td>
                          <td className="px-5 py-3">
                            {config ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
                                {config.icon} {status}
                                {att?.lateByMinutes ? ` (${att.lateByMinutes}m)` : ''}
                              </span>
                            ) : (
                              <span className={`text-[11px] ${textSecondary} italic`}>Not marked</span>
                            )}
                          </td>
                          {role === 'admin' && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(!att || att.status === 'Absent') && staffDate === todayStr && (
                                  <button 
                                    onClick={() => handleStaffCheckIn(t, 'trainer')}
                                    className="text-[11px] font-semibold text-green-500 hover:text-green-400 bg-green-500/10 px-2.5 py-1 rounded transition-colors"
                                  >Check In</button>
                                )}
                                {(!att || att.status !== 'On Leave') && (
                                  <button 
                                    onClick={() => t.id && handleMarkLeave(t.id)}
                                    className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 px-2.5 py-1 rounded transition-colors"
                                  >Leave</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {staffView === 'calendar' && (
            <div className={`${cardClass} p-6`}>
              <p className={`text-center ${textSecondary} py-8`}>
                <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                Monthly calendar view requires selecting a specific staff member from the Staff tab.
                <br />
                <span className="text-xs">Navigate to Staff → Select Profile → View Attendance Calendar</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: MEMBER ANALYTICS                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <Calendar size={16} className={textSecondary} />
            <input 
              type="month" 
              value={analyticsMonth}
              onChange={(e) => setAnalyticsMonth(e.target.value)}
              className={`${inputClass} px-3 py-2 w-48 [color-scheme:dark]`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap */}
            <div className={`${cardClass} p-6`}>
              <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight mb-4`}>Monthly Footfall Heatmap</h3>
              {(() => {
                const { dayCounts, daysInMonth, firstDayOfWeek } = getMonthlyHeatmapData();
                const maxCount = Math.max(...Object.values(dayCounts), 1);
                return (
                  <>
                    <div className="grid grid-cols-7 gap-1.5">
                      {['S','M','T','W','T','F','S'].map((d,i) => (
                        <div key={i} className={`text-center text-[10px] ${textSecondary} font-bold uppercase pb-1`}>{d}</div>
                      ))}
                      {/* Empty cells for days before first day */}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const count = dayCounts[day] || 0;
                        const intensity = count === 0 ? 0 : Math.min(Math.ceil((count / maxCount) * 4), 4);
                        const colors = [
                          isLightMode ? 'bg-gray-100' : 'bg-[#0D0D0D]', 
                          'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'
                        ];
                        return (
                          <div 
                            key={day} 
                            className={`aspect-square rounded-[3px] border ${isLightMode ? 'border-gray-200/50' : 'border-border-color/50'} ${colors[intensity]} cursor-default`} 
                            title={`Day ${day}: ${count} visitor${count !== 1 ? 's' : ''}`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className={`flex items-center justify-between text-[10px] ${textSecondary} uppercase font-semibold mt-4`}>
                      <span>Less</span>
                      <div className="flex gap-1">
                        {[isLightMode ? 'bg-gray-100' : 'bg-[#0D0D0D]', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'].map((c, i) => (
                          <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`}></div>
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Peak Hours */}
            <div className={`${cardClass} p-6`}>
              <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight mb-4`}>Peak Hours</h3>
              {(() => {
                const hourCounts = getPeakHoursData();
                const hours = Object.entries(hourCounts)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b));
                const maxH = Math.max(...hours.map(([, c]) => c), 1);

                if (hours.length === 0) {
                  return (
                    <div className={`text-center py-8 ${textSecondary}`}>
                      <Clock size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No data for this month</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {hours.map(([hour, count]) => {
                      const h = parseInt(hour);
                      const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`;
                      const width = (count / maxH) * 100;
                      return (
                        <div key={hour} className="flex items-center gap-2">
                          <span className={`text-[11px] ${textSecondary} w-12 text-right font-mono`}>{label}</span>
                          <div className={`flex-1 h-5 ${isLightMode ? 'bg-gray-100' : 'bg-[#0D0D0D]'} rounded overflow-hidden`}>
                            <div 
                              className="h-full bg-gradient-to-r from-primary/60 to-primary rounded transition-all duration-500"
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                          <span className={`text-[11px] ${textSecondary} w-8 font-mono`}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Facility Usage Stats */}
            <div className={`${cardClass} p-6 space-y-4`}>
              <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight mb-2`}>Facility Usage</h3>
              {(() => {
                const monthRecords = attendance.filter(a => a.date.startsWith(analyticsMonth) && a.personType === 'member');
                const uniqueMembers = new Set(monthRecords.map(r => r.personId)).size;
                const totalVisits = monthRecords.length;
                const { daysInMonth } = getMonthlyHeatmapData();
                const daysWithData = new Set(monthRecords.map(r => r.date)).size;
                const avgDaily = daysWithData > 0 ? Math.round(totalVisits / daysWithData) : 0;
                const avgVisitsPerMember = uniqueMembers > 0 ? (totalVisits / uniqueMembers).toFixed(1) : '0';

                // Busiest day of week
                const dayOfWeekCounts: Record<string, number> = {};
                monthRecords.forEach(r => {
                  const dow = new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
                  dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
                });
                const busiestDay = Object.entries(dayOfWeekCounts).sort(([,a],[,b]) => b - a)[0]?.[0] || '—';

                return (
                  <>
                    {[
                      { label: 'Unique Visitors', value: uniqueMembers, icon: Users },
                      { label: 'Total Visits', value: totalVisits, icon: Activity },
                      { label: 'Avg Daily Footfall', value: avgDaily, icon: TrendingUp },
                      { label: 'Avg Visits / Member', value: avgVisitsPerMember, icon: BarChart3 },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className={`flex items-center gap-3 p-3 rounded-lg ${isLightMode ? 'bg-gray-50' : 'bg-[#0D0D0D]'}`}>
                          <Icon size={16} className="text-primary shrink-0" />
                          <div className="flex-1">
                            <p className={`text-[11px] ${textSecondary} uppercase tracking-wider`}>{s.label}</p>
                            <p className={`text-lg font-heading font-bold ${textPrimary}`}>{s.value}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${isLightMode ? 'bg-gray-50' : 'bg-[#0D0D0D]'}`}>
                      <Calendar size={16} className="text-primary shrink-0" />
                      <div className="flex-1">
                        <p className={`text-[11px] ${textSecondary} uppercase tracking-wider`}>Busiest Day</p>
                        <p className={`text-lg font-heading font-bold ${textPrimary}`}>{busiestDay}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Top Members */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'}`}>
              <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight`}>
                Most Consistent Members — {new Date(analyticsMonth + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="p-5">
              {(() => {
                const topMembers = getTopMembers();
                if (topMembers.length === 0) {
                  return (
                    <p className={`text-center py-6 ${textSecondary}`}>No member attendance data for this month.</p>
                  );
                }
                const maxCount = topMembers[0]?.count || 1;
                return (
                  <div className="space-y-2">
                    {topMembers.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-[11px] ${textSecondary} w-6 text-right font-mono`}>#{i + 1}</span>
                        <span className={`text-sm ${textPrimary} w-40 truncate`}>{m.name}</span>
                        <div className={`flex-1 h-4 ${isLightMode ? 'bg-gray-100' : 'bg-[#0D0D0D]'} rounded overflow-hidden`}>
                          <div 
                            className="h-full bg-gradient-to-r from-green-600/60 to-green-500 rounded transition-all duration-500"
                            style={{ width: `${(m.count / maxCount) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-semibold ${textPrimary} w-16 text-right`}>{m.count} visits</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: HISTORY & EXPORT                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className={`${cardClass} p-5`}>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className={`text-[11px] ${textSecondary} uppercase tracking-wider font-semibold block mb-1.5`}>From</label>
                <input 
                  type="date" 
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                  className={`${inputClass} px-3 py-2 w-44 [color-scheme:dark]`}
                />
              </div>
              <div>
                <label className={`text-[11px] ${textSecondary} uppercase tracking-wider font-semibold block mb-1.5`}>To</label>
                <input 
                  type="date" 
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                  className={`${inputClass} px-3 py-2 w-44 [color-scheme:dark]`}
                />
              </div>
              <div>
                <label className={`text-[11px] ${textSecondary} uppercase tracking-wider font-semibold block mb-1.5`}>Type</label>
                <select 
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className={`${inputClass} px-3 py-2 w-36 [color-scheme:dark]`}
                >
                  <option value="all">All Types</option>
                  <option value="member">Members</option>
                  <option value="staff">Staff</option>
                  <option value="trainer">Trainers</option>
                </select>
              </div>
              <button 
                onClick={handleHistorySearch}
                disabled={historyLoading}
                className="bg-primary hover:bg-primary/90 text-white font-semibold px-5 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {historyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
              {role === 'admin' && historyRecords.length > 0 && (
                <button 
                  onClick={handleExportCSV}
                  className={`flex items-center gap-1.5 text-sm font-semibold ${isLightMode ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200' : 'text-white bg-surface hover:bg-[#222] border-border-color'} border px-4 py-2 rounded-md transition-colors`}
                >
                  <Download size={16} /> Export CSV ({historyRecords.length})
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className={`${cardClass} flex flex-col h-[550px]`}>
            <div className={`px-5 py-4 border-b ${isLightMode ? 'border-gray-200 bg-gray-50/50' : 'border-border-color bg-[#0D0D0D]/30'} flex justify-between items-center shrink-0`}>
              <h3 className={`font-heading font-semibold text-[14px] ${textSecondary} uppercase tracking-tight`}>
                {historyRecords.length > 0 ? `${historyRecords.length} Records Found` : 'Historical Attendance Log'}
              </h3>
            </div>
            <div className="flex-1 overflow-auto no-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`${isLightMode ? 'bg-gray-50' : 'bg-[#0D0D0D]'} border-b ${isLightMode ? 'border-gray-200' : 'border-border-color'} text-[11px] uppercase tracking-wider sticky top-0 z-10 ${textSecondary}`}>
                  <tr>
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">In</th>
                    <th className="px-5 py-3 font-medium">Out</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium text-right">Method</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLightMode ? 'divide-gray-100' : 'divide-border-color'}`}>
                  {(historyRecords.length > 0 ? historyRecords : attendance).map((r, i) => (
                    <tr key={r.id || i} className={`${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/50'} transition-colors`}>
                      <td className={`px-5 py-3 ${textSecondary}`}>{i + 1}</td>
                      <td className={`px-5 py-3 ${textPrimary} font-mono text-xs`}>{r.date}</td>
                      <td className={`px-5 py-3 font-medium ${textPrimary}`}>{r.name}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.personType === 'member' ? 'bg-blue-500/10 text-blue-400' :
                          r.personType === 'staff' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-teal-500/10 text-teal-400'
                        }`}>{r.personType}</span>
                      </td>
                      <td className={`px-5 py-3 ${textSecondary} font-mono text-xs`}>{r.phone}</td>
                      <td className={`px-5 py-3 ${textPrimary}`}>{r.checkInTime}</td>
                      <td className={`px-5 py-3 ${r.checkOutTime ? textPrimary : textSecondary}`}>{r.checkOutTime || '—'}</td>
                      <td className={`px-5 py-3 ${textSecondary}`}>{r.duration ? `${r.duration}m` : '—'}</td>
                      <td className={`px-5 py-3 text-right text-[10px] font-semibold ${r.method === 'biometric' ? 'text-green-500' : textSecondary}`}>
                        {r.method === 'biometric' ? '🔒' : '✋'} {r.method}
                      </td>
                    </tr>
                  ))}
                  {(historyRecords.length === 0 && attendance.length === 0) && (
                    <tr>
                      <td colSpan={9} className={`px-5 py-12 text-center ${textSecondary}`}>
                        <Search size={32} className="mx-auto mb-3 opacity-30" />
                        <p>Select a date range and click Search to view historical attendance.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
