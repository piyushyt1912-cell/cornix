import { useState, useMemo } from 'react';
import { Printer, FileText, FileSpreadsheet, IndianRupee, UserCheck, UserPlus, RefreshCw, AlertTriangle, XCircle, Award, Clock, CalendarDays } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import { Member, AttendanceRecord } from '@/lib/db';

interface ReportsViewProps {
  members: Member[];
  attendance: AttendanceRecord[];
  isLightMode: boolean;
}

export default function ReportsView({ members, attendance, isLightMode }: ReportsViewProps) {
  const [tab, setTab] = useState('monthly');
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Reports <span className="text-[12px] text-text-secondary ml-2 font-normal font-sans">(रिपोर्ट)</span>
        </h1>
        <div className="flex bg-[#0D0D0D] border border-border-color rounded-md overflow-hidden shrink-0">
           <button onClick={() => setTab('monthly')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'monthly' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-white'}`}>Monthly Report</button>
           <button onClick={() => setTab('daily')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'daily' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-white'}`}>Daily Report</button>
           <button onClick={() => setTab('member')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'member' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-white'}`}>Member Report</button>
           <button onClick={() => setTab('attendance')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'attendance' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-white'}`}>Attendance</button>
        </div>
      </header>

      {/* Export Top bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface border border-border-color p-4 rounded-xl mb-6 shadow-sm">
         <div className="flex items-center gap-3">
           {tab === 'monthly' && <input type="month" className="bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" defaultValue={new Date().toISOString().slice(0, 7)} />}
           {tab === 'daily' && <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />}
           {tab === 'attendance' && <input type="month" value={attendanceMonth} onChange={e => setAttendanceMonth(e.target.value)} className="bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />}
         </div>
         <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-[#0D0D0D] hover:bg-[#1a1a1a] border border-border-color text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors">
              <Printer size={16} /> Print
            </button>
         </div>
      </div>

      {tab === 'monthly' && <MonthlyReportTab members={members} isLightMode={isLightMode} />}
      {tab === 'daily' && <DailyReportTab members={members} attendance={attendance} isLightMode={isLightMode} selectedDate={dailyDate} />}
      {tab === 'member' && <MemberReportTab members={members} isLightMode={isLightMode} />}
      {tab === 'attendance' && <AttendanceReportTab attendance={attendance} month={attendanceMonth} isLightMode={isLightMode} />}
    </div>
  );
}

function MonthlyReportTab({ members, isLightMode }: { members: Member[]; isLightMode: boolean }) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthNum = currentMonthStr.slice(5, 7);
  // Aggregate sales
  const totalSales = members.reduce((sum, m) => sum + (parseInt(m.amount.replace(/[^0-9]/g, '')) || 0), 0);
  const cashSales = members
    .filter(m => m.paymentMode === 'Cash')
    .reduce((sum, m) => sum + (parseInt(m.amount.replace(/[^0-9]/g, '')) || 0), 0);
  const onlineSales = totalSales - cashSales;
  const newMembersCount = members.length;
  const totalActive = members.filter(m => m.status === 'Active').length;

  // Chart aggregates
  const planCounts = { Monthly: 0, Quarterly: 0, 'Half-Yearly': 0, Annual: 0 };
  members.forEach(m => {
    if (m.plan.includes('Monthly')) planCounts.Monthly++;
    else if (m.plan.includes('Quarterly')) planCounts.Quarterly++;
    else if (m.plan.includes('Half-Yearly')) planCounts['Half-Yearly']++;
    else if (m.plan.includes('Annual')) planCounts.Annual++;
  });

  const barData = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: Array.from({ length: 30 }, (_, i) => {
          // Compute dynamic daily revenue based on start dates
          const day = String(i + 1).padStart(2, '0');
          const daySales = members
            .filter(m => m.startDate.endsWith(`-${currentMonthNum}-${day}`) || m.startDate.includes(`-${currentMonthNum}-${day}`))
            .reduce((sum, m) => sum + (parseInt(m.amount.replace(/[^0-9]/g, '')) || 0), 0);
          return daySales || 0; // fallback mock variant if no start matches
        }),
        backgroundColor: 'rgba(255, 51, 51, 0.8)',
        borderRadius: 4,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { grid: { color: '#333' } },
      x: { grid: { display: false } },
    }
  };

  const pieData = {
    labels: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'],
    datasets: [
      {
        data: [planCounts.Monthly || 1, planCounts.Quarterly || 1, planCounts['Half-Yearly'] || 1, planCounts.Annual || 1],
        backgroundColor: [
          'rgba(255, 51, 51, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: '#0D0D0D',
        borderWidth: 2,
      }
    ]
  };

  const pieOptions = {
    plugins: {
       legend: { position: 'bottom' as const, labels: { color: '#bbb' } },
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Total Revenue</div>
          <div className={`font-heading text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight`}>₹ {(totalSales/1000).toFixed(1)}K</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Cash Revenue</div>
          <div className="font-heading text-xl font-bold text-green-500 tracking-tight">₹ {(cashSales/1000).toFixed(1)}K</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Online Revenue</div>
          <div className="font-heading text-xl font-bold text-blue-500 tracking-tight">₹ {(onlineSales/1000).toFixed(1)}K</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Total Enrollments</div>
          <div className={`font-heading text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight`}>{newMembersCount}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Renewals</div>
          <div className={`font-heading text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight`}>{members.filter(m => m.status === 'Active' && m.startDate.includes(currentMonthStr)).length}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Total Active</div>
          <div className={`font-heading text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight`}>{totalActive}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border-color p-5 rounded-xl">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Revenue Breakdown</h3>
          <div className="h-[250px] w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
        <div className="bg-surface border border-border-color p-5 rounded-xl flex flex-col">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Membership Types</h3>
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
             <div className="w-[80%] max-w-[250px]">
               <Pie data={pieData} options={pieOptions} />
             </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Member Name</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium text-right">Receipt No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {members.map((m, i) => (
                <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                  <td className="px-5 py-3 text-text-secondary">{m.startDate}</td>
                  <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{m.name}</td>
                  <td className="px-5 py-3 font-mono text-green-500">{m.amount}</td>
                  <td className="px-5 py-3 text-text-secondary">Registration</td>
                  <td className="px-5 py-3 text-text-secondary">{m.paymentMode || 'UPI'}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary">#INV-{m.id ? m.id.slice(-4).toUpperCase() : i}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DailyReportTab({ members, attendance, isLightMode, selectedDate }: { members: Member[]; attendance: AttendanceRecord[]; isLightMode: boolean; selectedDate: string }) {
  const dateStr = selectedDate;
  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  // Registrations for selected date (by createdAt first, fallback to startDate)
  const dayRegistrations = members.filter(m => {
    if (m.createdAt) {
      return m.createdAt.slice(0, 10) === dateStr;
    }
    return m.startDate === dateStr;
  });

  const collectionDay = dayRegistrations.reduce((sum, m) => sum + (parseInt(m.amount.replace(/[^0-9]/g, '')) || 0), 0);
  const dueTotal = dayRegistrations.reduce((sum, m) => sum + (m.dueAmount ?? 0), 0);
  const checkinsDay = attendance.filter(a => a.date === dateStr).length;
  const newDay = dayRegistrations.length;
  const cashDay = dayRegistrations.filter(m => m.paymentMode === 'Cash').reduce((sum, m) => sum + (parseInt(m.amount.replace(/[^0-9]/g, '')) || 0), 0);
  const onlineDay = collectionDay - cashDay;

  return (
    <div className="space-y-6">
      {/* Date heading */}
      <div className="flex items-center gap-3">
        <CalendarDays size={18} className="text-primary" />
        <span className={`font-heading font-semibold text-lg ${isLightMode ? 'text-black' : 'text-white'}`}>{displayDate}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><IndianRupee size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Collection</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>₹{collectionDay.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><UserCheck size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Check-ins</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{checkinsDay}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><UserPlus size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Registrations</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{newDay}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Cash</div>
          <div className={`font-heading text-2xl font-bold text-yellow-500 tracking-tight`}>₹{cashDay.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1">Online</div>
          <div className={`font-heading text-2xl font-bold text-blue-500 tracking-tight`}>₹{onlineDay.toLocaleString('en-IN')}</div>
        </div>
        {dueTotal > 0 && (
          <div className="bg-surface border border-orange-500/30 p-4 rounded-xl relative overflow-hidden group">
            <div className="text-[11px] text-orange-500 uppercase font-semibold mb-1">Dues</div>
            <div className="font-heading text-2xl font-bold text-orange-500 tracking-tight">₹{dueTotal.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Transactions</h3>
          <span className="text-xs bg-surface border border-border-color px-2 py-0.5 rounded text-text-secondary">{dayRegistrations.length} entries</span>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Member Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {dayRegistrations.map((t, i) => {
                const regTime = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
                const due = t.dueAmount ?? 0;
                return (
                  <tr key={t.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                    <td className="px-5 py-3 text-text-secondary text-xs font-mono">{i + 1}</td>
                    <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{t.name}</td>
                    <td className="px-5 py-3 text-text-secondary">{t.phone}</td>
                    <td className="px-5 py-3 text-text-secondary">{t.plan}</td>
                    <td className="px-5 py-3 font-mono text-green-500">{t.amount}</td>
                    <td className="px-5 py-3">
                      {due > 0 ? (
                        <span className="text-orange-500 font-mono font-semibold text-xs">₹{due}</span>
                      ) : (
                        <span className="text-green-500 text-xs">Paid ✓</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        t.paymentMode === 'Cash' ? 'bg-yellow-500/10 text-yellow-500' :
                        t.paymentMode === 'UPI' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {t.paymentMode || 'UPI'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-text-secondary text-xs flex items-center justify-end gap-1">
                      <Clock size={12} /> {regTime}
                    </td>
                  </tr>
                );
              })}
              {dayRegistrations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-text-secondary">No transactions recorded for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Summary footer */}
        {dayRegistrations.length > 0 && (
          <div className="px-5 py-3 border-t border-border-color bg-[#0D0D0D]/30 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-text-secondary">Total: <strong className={isLightMode ? 'text-black' : 'text-white'}>{dayRegistrations.length} registrations</strong></span>
            <span className="text-text-secondary">Collected: <strong className="text-green-500">₹{collectionDay.toLocaleString('en-IN')}</strong></span>
            <span className="text-text-secondary">Cash: <strong className="text-yellow-500">₹{cashDay.toLocaleString('en-IN')}</strong></span>
            <span className="text-text-secondary">Online: <strong className="text-blue-500">₹{onlineDay.toLocaleString('en-IN')}</strong></span>
            {dueTotal > 0 && <span className="text-text-secondary">Dues: <strong className="text-orange-500">₹{dueTotal.toLocaleString('en-IN')}</strong></span>}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberReportTab({ members, isLightMode }: { members: Member[]; isLightMode: boolean }) {
  const expiringMembers = members.filter(m => m.status === 'Expiring Soon');
  const expiredMembers = members.filter(m => m.status === 'Expired');
  
  // Sort members by LTV/amount spent
  const topPaying = [...members]
    .sort((a, b) => {
      const valA = parseInt(a.amount.replace(/[^0-9]/g, '')) || 0;
      const valB = parseInt(b.amount.replace(/[^0-9]/g, '')) || 0;
      return valB - valA;
    })
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       <div className="space-y-6">
         {/* Expiring Soon */}
         <div className="bg-surface border border-orange-500/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.05)]">
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h3 className="font-heading font-semibold text-[14px] text-orange-500 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle size={16} /> Expiring Soon / Expiring This Week
              </h3>
              <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded font-bold">{expiringMembers.length} Members</span>
            </div>
            <div className="p-0 overflow-y-auto max-h-[250px] no-scrollbar">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <tbody className="divide-y divide-border-color">
                    {expiringMembers.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                        <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{m.name}</td>
                        <td className="px-5 py-3 text-text-secondary">{m.phone}</td>
                        <td className="px-5 py-3 text-orange-400 font-medium text-right">Expires {m.expiryDate}</td>
                      </tr>
                    ))}
                    {expiringMembers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-text-secondary">No memberships expiring soon.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Expired */}
         <div className="bg-surface border border-red-500/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,51,51,0.05)]">
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h3 className="font-heading font-semibold text-[14px] text-primary uppercase tracking-tight flex items-center gap-2">
                <XCircle size={16} /> Already Expired
              </h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">{expiredMembers.length} Members</span>
            </div>
            <div className="p-0 overflow-y-auto max-h-[250px] no-scrollbar">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <tbody className="divide-y divide-border-color">
                    {expiredMembers.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                        <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{m.name}</td>
                        <td className="px-5 py-3 text-text-secondary">{m.phone}</td>
                        <td className="px-5 py-3 text-primary font-medium text-right">Expired {m.expiryDate}</td>
                      </tr>
                    ))}
                    {expiredMembers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-text-secondary">No expired memberships.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>
       </div>

       <div className="space-y-6">
         {/* Top Paying */}
         <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                <Award size={16} className="text-green-500"/> Top Paying Members
              </h3>
            </div>
            <div className="p-0">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <tbody className="divide-y divide-border-color">
                    {topPaying.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                        <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{i+1}. {m.name}</td>
                        <td className="px-5 py-3 text-text-secondary text-right font-mono text-green-500">{m.amount} ({m.plan})</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Inactive Members */}
         <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
              <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
                <Clock size={16} /> Inactive Members (Expired & Expiring)
              </h3>
            </div>
            <div className="p-0">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <tbody className="divide-y divide-border-color">
                    {expiredMembers.slice(0, 3).map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                        <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{m.name}</td>
                        <td className="px-5 py-3 text-text-secondary text-right">{m.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>
       </div>
    </div>
  );
}

function AttendanceReportTab({ attendance, month, isLightMode }: { attendance: AttendanceRecord[]; month: string; isLightMode: boolean }) {
  const dailyStats = useMemo(() => {
    // Parse year/month from the selected month string (e.g. "2026-06")
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Filter attendance records for the selected month
    const monthRecords = attendance.filter(a => a.date.startsWith(month));

    const stats: { date: string; dayLabel: string; totalCheckins: number; uniqueVisitors: number; avgDuration: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      const dayRecords = monthRecords.filter(a => a.date === dateStr);
      const totalCheckins = dayRecords.length;
      const uniqueVisitors = new Set(dayRecords.map(a => a.personId || a.phone)).size;
      const durationsWithValues = dayRecords.filter(a => typeof a.duration === 'number' && a.duration > 0);
      const avgDuration = durationsWithValues.length > 0
        ? Math.round(durationsWithValues.reduce((sum, a) => sum + (a.duration || 0), 0) / durationsWithValues.length)
        : 0;

      const dayOfWeek = new Date(year, mon - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
      stats.push({ date: dateStr, dayLabel: `${day} ${dayOfWeek}`, totalCheckins, uniqueVisitors, avgDuration });
    }

    return stats;
  }, [attendance, month]);

  const totals = useMemo(() => {
    const daysWithCheckins = dailyStats.filter(d => d.totalCheckins > 0);
    const totalCheckins = dailyStats.reduce((sum, d) => sum + d.totalCheckins, 0);
    const totalUniquePerDay = dailyStats.reduce((sum, d) => sum + d.uniqueVisitors, 0);
    const daysWithDuration = dailyStats.filter(d => d.avgDuration > 0);
    const avgDuration = daysWithDuration.length > 0
      ? Math.round(daysWithDuration.reduce((sum, d) => sum + d.avgDuration, 0) / daysWithDuration.length)
      : 0;
    const avgCheckinsPerDay = daysWithCheckins.length > 0
      ? Math.round(totalCheckins / daysWithCheckins.length)
      : 0;
    return { totalCheckins, avgCheckinsPerDay, avgUniquePerDay: daysWithCheckins.length > 0 ? Math.round(totalUniquePerDay / daysWithCheckins.length) : 0, avgDuration };
  }, [dailyStats]);

  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const formatDuration = (mins: number) => {
    if (mins === 0) return '—';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><CalendarDays size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Total Check-ins</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{totals.totalCheckins.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><UserCheck size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Avg Check-ins/Day</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{totals.avgCheckinsPerDay}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><UserPlus size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Avg Unique/Day</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{totals.avgUniquePerDay}</div>
        </div>
        <div className="bg-surface border border-border-color p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Clock size={80} /></div>
          <div className="text-[11px] text-text-secondary uppercase font-semibold mb-1 relative">Avg Duration</div>
          <div className={`font-heading text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'} tracking-tight relative`}>{formatDuration(totals.avgDuration)}</div>
        </div>
      </div>

      {/* Daily Attendance Table */}
      <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight flex items-center gap-2">
            <CalendarDays size={16} /> Daily Attendance — {monthLabel}
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Total Check-ins</th>
                <th className="px-5 py-3 font-medium text-right">Unique Visitors</th>
                <th className="px-5 py-3 font-medium text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {dailyStats.map(day => (
                <tr key={day.date} className={`hover:bg-[#0D0D0D]/50 transition-colors ${day.totalCheckins === 0 ? 'opacity-40' : ''}`}>
                  <td className={`px-5 py-3 font-medium ${isLightMode ? 'text-black' : 'text-white'}`}>{day.dayLabel}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary">{day.totalCheckins || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary">{day.totalCheckins > 0 ? day.uniqueVisitors : '—'}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary">{formatDuration(day.avgDuration)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-[#0D0D0D]/60 border-t-2 border-primary/30 font-semibold">
                <td className={`px-5 py-3 font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Total / Average</td>
                <td className="px-5 py-3 text-right font-mono text-primary font-bold">{totals.totalCheckins}</td>
                <td className="px-5 py-3 text-right font-mono text-primary font-bold">{totals.avgUniquePerDay} avg</td>
                <td className="px-5 py-3 text-right font-mono text-primary font-bold">{formatDuration(totals.avgDuration)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
