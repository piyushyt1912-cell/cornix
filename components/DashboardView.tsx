import { IndianRupee, Banknote, CreditCard, Users, UserPlus, RefreshCw, Gift, MessageCircle, ShieldCheck, ClipboardList, Clock, AlertTriangle, CalendarClock, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { Member, AttendanceRecord, Staff, Trainer, DailyStaffAttendance } from '@/lib/db';

interface DashboardViewProps {
  members: Member[];
  attendance: AttendanceRecord[];
  staff: Staff[];
  trainers: Trainer[];
  staffAttendance: DailyStaffAttendance[];
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

export default function DashboardView({ members, attendance, staff, trainers, staffAttendance, isLightMode, role }: DashboardViewProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const today = new Date();
  const todayDateStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayMonthDay = today.toISOString().slice(5, 10); // "MM-DD"

  // 1. Birthdays Today
  const birthdays = members.filter(m => m.dob && m.dob.slice(5) === todayMonthDay);

  // Expiring Soon (within 10 days)
  const expiringSoon = members.filter(m => {
    if (!m.expiryDate || m.status === 'Expired') return false;
    const expiry = new Date(m.expiryDate + 'T00:00:00');
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiry.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 10;
  }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // 2. Today's Visits (from attendance log)
  const recentVisits = attendance
    .filter(a => a.date === todayDateStr)
    .sort((a, b) => (b.checkInTimestamp ?? 0) - (a.checkInTimestamp ?? 0)); // Sort newest check-ins first

  // Staff present today
  const staffPresentCount = staffAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const totalStaffCount = staff.length + trainers.length;

  // Today's registrations by actual creation timestamp (not start date)
  const todayRegistrationsByCreatedAt = members.filter(m => {
    if (m.createdAt) {
      return m.createdAt.slice(0, 10) === todayDateStr;
    }
    // Fallback for older members without createdAt: use startDate
    return m.startDate === todayDateStr;
  });

  const todaySales = todayRegistrationsByCreatedAt.reduce((sum, m) => {
    const val = parseInt(m.amount.replace(/[^0-9]/g, '')) || 0;
    return sum + val;
  }, 0);

  // Cash collected
  const cashCollected = todayRegistrationsByCreatedAt
    .filter(m => m.paymentMode === 'Cash')
    .reduce((sum, m) => {
      const val = parseInt(m.amount.replace(/[^0-9]/g, '')) || 0;
      return sum + val;
    }, 0);

  // Online collected
  const onlineCollected = todaySales - cashCollected;

  // Active members today (checked in today)
  const activeTodayCount = recentVisits.length;

  // Total members
  const totalMembers = members.length;

  // New today
  const newToday = todayRegistrationsByCreatedAt.length;

  // Renewals today
  const RENEWAL_THRESHOLD = 2000;
  const renewalsToday = todayRegistrationsByCreatedAt.filter(m => parseInt(m.amount.replace(/[^0-9]/g, '')) > RENEWAL_THRESHOLD).length;

  return (
    <div className="w-full pb-8">
      <header className="mb-6">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Dashboard <span className="text-[12px] text-text-secondary ml-2 font-normal font-sans">(डैशबोर्ड)</span>
        </h1>
      </header>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {role === 'admin' ? (
          <>
            {/* ROW 1 - 4 Stat Cards for Admin */}
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard 
                title="Today's Total Sales" 
                value={`₹ ${todaySales.toLocaleString('en-IN')}`} 
                valueColor="text-primary"
                trendLabel="Today's revenue" 
                trendColor="text-green-500" 
                icon={IndianRupee} 
              />
              <StatCard 
                title="Cash Collected" 
                value={`₹ ${cashCollected.toLocaleString('en-IN')}`} 
                valueColor="text-green-500"
                trendLabel="Across registrations" 
                trendColor="text-text-secondary" 
                icon={Banknote} 
              />
              <StatCard 
                title="Online Collected" 
                value={`₹ ${onlineCollected.toLocaleString('en-IN')}`} 
                valueColor="text-blue-500"
                trendLabel="UPI & Cards" 
                trendColor="text-text-secondary" 
                icon={CreditCard} 
              />
              <StatCard 
                title="Active Members Today" 
                value={activeTodayCount.toString()} 
                trendLabel="Checked in so far" 
                trendColor="text-text-secondary" 
                icon={Users} 
              />
            </motion.div>

            {/* ROW 2 - 3 Stat Cards for Admin */}
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard title="Total Members" value={totalMembers.toLocaleString('en-IN')} trendLabel="All registered members" trendColor="text-green-500" icon={Users} />
              <StatCard title="New Today" value={newToday.toString()} trendLabel="Fresh enrollments" trendColor="text-primary" icon={UserPlus} />
              <StatCard title="Renewals Today" value={renewalsToday.toString()} trendLabel="Expiring soon saved" trendColor="text-green-500" icon={RefreshCw} />
            </motion.div>

            {/* ROW 3 - Staff Attendance Card for Admin */}
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard 
                title="Staff Present" 
                value={`${staffPresentCount} / ${totalStaffCount}`} 
                valueColor="text-purple-500"
                trendLabel="Staff & trainers on duty" 
                trendColor="text-text-secondary" 
                icon={ShieldCheck} 
                iconColorClass="bg-purple-500/10 text-purple-500"
              />
            </motion.div>
          </>
        ) : (
          /* Operational grid for Receptionist (hides financial data) */
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
              title="Active Members Today" 
              value={activeTodayCount.toString()} 
              trendLabel="Checked in so far" 
              trendColor="text-text-secondary" 
              icon={Users} 
            />
            <StatCard 
              title="Total Members" 
              value={totalMembers.toLocaleString('en-IN')} 
              trendLabel="All registered members" 
              trendColor="text-green-500" 
              icon={Users} 
            />
            <StatCard 
              title="New Today" 
              value={newToday.toString()} 
              trendLabel="Fresh enrollments" 
              trendColor="text-primary" 
              icon={UserPlus} 
            />
            <StatCard 
              title="Renewals Today" 
              value={renewalsToday.toString()} 
              trendLabel="Expiring soon saved" 
              trendColor="text-green-500" 
              icon={RefreshCw} 
            />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Birthdays Section */}
          <motion.div variants={item} className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl flex flex-col overflow-hidden`}>
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-primary/5">
              <h3 className="font-heading font-semibold text-[15px] text-primary uppercase tracking-tight flex items-center gap-2">
                <Gift size={18} /> Birthdays Today
              </h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-bold">{birthdays.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
              {birthdays.map((user, i) => {
                const message = encodeURIComponent(`Happy Birthday ${user.name}! 🎉 Wishing you great health and gains! - Corenix Team`);
                const whatsappUrl = `https://wa.me/${user.phone}?text=${message}`;
                return (
                  <div key={i} className={`bg-[#0D0D0D] border ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-border-color'} p-4 rounded-lg flex flex-col gap-3`}>
                    <div>
                      <strong className={`${isLightMode ? 'text-black' : 'text-white'} text-sm block`}>{user.name}</strong>
                      <span className="text-[11px] text-text-secondary mt-1">{user.plan}</span>
                    </div>
                    <a 
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 rounded-md transition-colors"
                    >
                      <MessageCircle size={14} /> Send Wish
                    </a>
                  </div>
                );
              })}
              {birthdays.length === 0 && (
                <div className="text-center text-text-secondary text-sm py-8">
                  No birthdays today.
                </div>
              )}
            </div>
          </motion.div>

          {/* Expiring Soon Section */}
          <motion.div variants={item} className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl flex flex-col overflow-hidden`}>
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-orange-500/5">
              <h3 className="font-heading font-semibold text-[15px] text-orange-500 uppercase tracking-tight flex items-center gap-2">
                <CalendarClock size={18} /> Expiring Soon
              </h3>
              <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-md font-bold">{expiringSoon.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 max-h-[350px]">
              {expiringSoon.map((m, i) => {
                const expiry = new Date(m.expiryDate + 'T00:00:00');
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil((expiry.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                const message = encodeURIComponent(`Hi ${m.name}, your ${m.plan} membership at Corenix Club is expiring on ${m.expiryDate}. Would you like to renew? Contact us for special offers! 💪`);
                const whatsappUrl = `https://wa.me/${m.phone}?text=${message}`;
                return (
                  <div key={m.id || i} className={`bg-[#0D0D0D] border ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-border-color'} p-3 rounded-lg`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-heading font-bold text-[10px] uppercase shrink-0">
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{m.name}</p>
                          <p className="text-text-secondary text-[11px] flex items-center gap-1"><Phone size={10} /> {m.phone}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          daysLeft <= 2 ? 'bg-red-500/15 text-red-500' :
                          daysLeft <= 5 ? 'bg-orange-500/15 text-orange-500' :
                          'bg-yellow-500/15 text-yellow-500'
                        }`}>
                          {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                        <span>{m.plan}</span>
                        <span>Exp: {m.expiryDate}</span>
                      </div>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-green-500 hover:text-green-400 transition-colors">
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
              {expiringSoon.length === 0 && (
                <div className="text-center text-text-secondary text-sm py-8">
                  No memberships expiring soon. 🎉
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Visit Log Table - Full Width */}
        <motion.div variants={item} className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl flex flex-col overflow-hidden mt-6`}>
          <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
            <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Today&apos;s Visit Log</h3>
            <span className="text-[10px] bg-surface border border-border-color px-2 py-1 rounded text-text-secondary">Checked-ins</span>
          </div>
          
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className={`bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10`}>
                <tr>
                  <th className="px-5 py-3 font-medium">Member Name</th>
                  <th className="px-5 py-3 font-medium">Time In</th>
                  <th className="px-5 py-3 font-medium">Check-Out</th>
                  <th className="px-5 py-3 font-medium">Membership Type</th>
                  <th className="px-5 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {recentVisits.map((visit, i) => (
                  <tr key={i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                    <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{visit.name}</td>
                    <td className="px-5 py-3 text-text-secondary">{visit.checkInTime}</td>
                    <td className="px-5 py-3 text-text-secondary">{visit.checkOutTime || '—'}</td>
                    <td className="px-5 py-3 text-text-secondary text-[12px]">{visit.plan}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        visit.status === 'Active' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-red-500/10 text-primary'
                      }`}>
                        {visit.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentVisits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-text-secondary">No check-ins yet today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Today's Registrations Section */}
        {role === 'admin' && (
          <motion.div variants={item} className={`bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl flex flex-col overflow-hidden mt-6`}>
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                <ClipboardList size={16} /> Today&apos;s Registrations
              </h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-bold">{todayRegistrationsByCreatedAt.length} entries</span>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Member Name</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Amount Paid</th>
                    <th className="px-5 py-3 font-medium">Due</th>
                    <th className="px-5 py-3 font-medium">Start Date</th>
                    <th className="px-5 py-3 font-medium">Payment Mode</th>
                    <th className="px-5 py-3 font-medium text-right">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {todayRegistrationsByCreatedAt.map((m, i) => {
                    const regTime = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
                    const due = m.dueAmount ?? 0;
                    return (
                      <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                        <td className="px-5 py-3 text-text-secondary text-xs font-mono">{i + 1}</td>
                        <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#0D0D0D] border border-border-color text-primary flex items-center justify-center font-heading font-bold text-[10px] uppercase">
                              {m.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {m.name}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary">{m.phone}</td>
                        <td className="px-5 py-3 text-text-secondary">{m.plan}</td>
                        <td className="px-5 py-3 text-green-500 font-mono font-semibold">{m.amount}</td>
                        <td className="px-5 py-3">
                          {due > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-500/15 text-orange-500">
                              <AlertTriangle size={10} /> ₹{due}
                            </span>
                          ) : (
                            <span className="text-green-500 text-xs font-semibold">Paid ✓</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {m.startDate !== todayDateStr ? (
                            <span className="text-orange-400 text-xs" title={`Start date differs from registration date`}>{m.startDate} ⚠</span>
                          ) : (
                            <span>{m.startDate}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            m.paymentMode === 'Cash' ? 'bg-yellow-500/10 text-yellow-500' :
                            m.paymentMode === 'UPI' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-purple-500/10 text-purple-500'
                          }`}>
                            {m.paymentMode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-text-secondary text-xs flex items-center justify-end gap-1">
                            <Clock size={12} /> {regTime}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {todayRegistrationsByCreatedAt.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-text-secondary">No registrations today yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            {todayRegistrationsByCreatedAt.length > 0 && (
              <div className="px-5 py-3 border-t border-border-color bg-[#0D0D0D]/30 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-text-secondary">Total: <strong className={`${isLightMode ? 'text-black' : 'text-white'}`}>{todayRegistrationsByCreatedAt.length} registrations</strong></span>
                <span className="text-text-secondary">Collected: <strong className="text-green-500">₹{todaySales.toLocaleString('en-IN')}</strong></span>
                {todayRegistrationsByCreatedAt.some(m => (m.dueAmount ?? 0) > 0) && (
                  <span className="text-text-secondary">Pending Dues: <strong className="text-orange-500">₹{todayRegistrationsByCreatedAt.reduce((s, m) => s + (m.dueAmount ?? 0), 0).toLocaleString('en-IN')}</strong></span>
                )}
              </div>
            )}
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}

function StatCard({ title, value, valueColor = "text-white", trendLabel, trendColor, icon: Icon, iconColorClass }: any) {
  return (
    <div className="bg-surface p-5 rounded-xl border border-border-color hover:border-border-color/80 transition-colors">
      <div className="text-[12px] text-text-secondary uppercase mb-3 flex justify-between items-center">
        <span className="font-semibold tracking-wide">{title}</span>
        <Icon size={18} className={iconColorClass || 'text-text-secondary opacity-50'} />
      </div>
      <div className={`font-heading text-3xl font-bold leading-tight ${valueColor}`}>{value}</div>
      <div className={`text-[11px] mt-2 font-medium ${trendColor}`}>
        {trendLabel}
      </div>
    </div>
  );
}
