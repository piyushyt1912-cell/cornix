import { IndianRupee, Banknote, CreditCard, Users, UserPlus, RefreshCw, Gift, MessageCircle, ShieldCheck } from 'lucide-react';
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

  // 2. Today's Visits (from attendance log)
  const recentVisits = attendance
    .filter(a => a.date === todayDateStr)
    .sort((a, b) => (b.checkInTimestamp ?? 0) - (a.checkInTimestamp ?? 0)); // Sort newest check-ins first

  // Staff present today
  const staffPresentCount = staffAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const totalStaffCount = staff.length + trainers.length;

  // 3. Stats calculations
  // Today's total sales
  const todayRegistrations = members.filter(m => m.startDate === todayDateStr);
  
  const todaySales = todayRegistrations.reduce((sum, m) => {
    const val = parseInt(m.amount.replace(/[^0-9]/g, '')) || 0;
    return sum + val;
  }, 0);

  // Cash collected
  const cashCollected = todayRegistrations
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
  const newToday = todayRegistrations.length;

  // Renewals today
  const renewalsToday = todayRegistrations.filter(m => parseInt(m.amount.replace(/[^0-9]/g, '')) > 2000).length;

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
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

          {/* Visit Log Table */}
          <motion.div variants={item} className={`lg:col-span-2 bg-surface border ${isLightMode ? 'border-gray-200' : 'border-border-color'} rounded-xl flex flex-col overflow-hidden`}>
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

        </div>
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
