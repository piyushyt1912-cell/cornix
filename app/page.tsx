'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, UserCheck, Contact, Dumbbell, 
  LineChart, TicketPercent, Ruler, Star, Settings,
  Search, Bell, Menu, X, Sun, Moon, LogOut, ChevronUp, Banknote
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

import { 
  seedDatabaseIfEmpty, clearOldDemoData,
  getMembers, addMember, updateMember, deleteMember,
  getAttendance, markAttendance,
  getStaff, addStaff, updateStaff, deleteStaff, updateStaffStatus,
  getTrainers, addTrainer, updateTrainerStatus, updateTrainer,
  getReviews, addReview,
  getOffers, addOffer,
  getSettings, saveSettings,
  getRemovedMembers, addRemovedMember,
  getAttendanceRecords, getStaffAttendanceByDate, initializeDailyAbsences,
  getPayslips,
  Member, Attendance, AttendanceRecord, DailyStaffAttendance, Payslip,
  Staff, Trainer, Review, Offer, RemovedMember
} from '@/lib/db';
import { useAuth } from '@/components/AuthContext';
import type { UserRole } from '@/components/AuthContext';

// Import our modular view components
import LoginView from '@/components/LoginView';
import DashboardView from '@/components/DashboardView';
import MembersView from '@/components/MembersView';
import AttendanceView from '@/components/AttendanceView';
import StaffView from '@/components/StaffView';
import TrainersView from '@/components/TrainersView';
import ReportsView from '@/components/ReportsView';
import OffersView from '@/components/OffersView';
import MeasurementsView from '@/components/MeasurementsView';
import ReviewsView from '@/components/ReviewsView';
import SettingsView from '@/components/SettingsView';

const allNavItems = [
  { name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist'] },
  { name: 'Members', icon: Users, roles: ['admin', 'receptionist'] },
  { name: 'Attendance', icon: UserCheck, roles: ['admin', 'receptionist'] },
  { name: 'Staff', icon: Contact, roles: ['admin'] },
  { name: 'Trainers', icon: Dumbbell, roles: ['admin', 'receptionist'] },
  { name: 'Reports', icon: LineChart, roles: ['admin'] },
  { name: 'Offers', icon: TicketPercent, roles: ['admin', 'receptionist'] },
  { name: 'Measurements', icon: Ruler, roles: ['admin', 'receptionist'] },
  { name: 'Reviews', icon: Star, roles: ['admin', 'receptionist'] },
  { name: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function CorenixApp() {
  const { user, loading: authLoading, login, logout, resetPassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLightMode, setIsLightMode] = useState(false);

  // Firestore Database States
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<DailyStaffAttendance[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [removedMembers, setRemovedMembers] = useState<RemovedMember[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(true);

  // Initialize and Fetch Firestore database collections (only after auth)
  useEffect(() => {
    if (!user) return;
    
    async function initDb() {
      // Purge any old cached demo data from localStorage
      clearOldDemoData();
      // Verify Firestore connectivity (no seeding)
      await seedDatabaseIfEmpty();
      
      const [fetchedMembers, fetchedAttendance, fetchedAttRecords, fetchedStaff, fetchedTrainers, fetchedReviews, fetchedOffers, fetchedSettings, fetchedRemovedMembers] = await Promise.all([
        getMembers(),
        getAttendance(),
        getAttendanceRecords(),
        getStaff(),
        getTrainers(),
        getReviews(),
        getOffers(),
        getSettings(),
        getRemovedMembers()
      ]);

      setMembers(fetchedMembers);
      setAttendance(fetchedAttendance);
      setAttendanceRecords(fetchedAttRecords);
      setStaff(fetchedStaff);
      setTrainers(fetchedTrainers);
      setReviews(fetchedReviews);
      setOffers(fetchedOffers);
      setRemovedMembers(fetchedRemovedMembers);
      if (fetchedSettings) setSettings(fetchedSettings);

      // Fetch today's staff attendance
      const todayStr = new Date().toISOString().slice(0, 10);
      const fetchedStaffAtt = await getStaffAttendanceByDate(todayStr);
      setStaffAttendance(fetchedStaffAtt);

      // Auto-initialize daily absences for admin (runs only once per day)
      const currentRole = user?.role || 'receptionist';
      if (currentRole === 'admin') {
        await initializeDailyAbsences(fetchedStaff, fetchedTrainers, todayStr, user?.email || 'admin');
      }
      
      setDbLoading(false);
    }
    initDb();
    setMounted(true);
  }, [user]);

  // Database Action Handlers
  const handleAddMember = async (memberData: Member) => {
    const saved = await addMember(memberData);
    setMembers(prev => [...prev, saved]);
    return saved;
  };

  const handleUpdateMember = async (id: string, memberData: Partial<Member>) => {
    await updateMember(id, memberData);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...memberData } : m));
  };

  const handleDeleteMember = async (id: string) => {
    await deleteMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleMarkAttendance = async (visitData: Attendance) => {
    const saved = await markAttendance(visitData);
    setAttendance(prev => [...prev, saved]);
    return saved;
  };

  const handleAddStaff = async (staffData: Staff) => {
    const saved = await addStaff(staffData);
    setStaff(prev => [...prev, saved]);
    return saved;
  };

  const handleUpdateStaffStatus = async (id: string, status: string) => {
    await updateStaffStatus(id, status);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleUpdateStaff = async (id: string, data: Partial<Staff>) => {
    await updateStaff(id, data);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const handleDeleteStaff = async (id: string) => {
    await deleteStaff(id);
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const handleAddTrainer = async (trainerData: Trainer) => {
    const saved = await addTrainer(trainerData);
    setTrainers(prev => [...prev, saved]);
    return saved;
  };

  const handleUpdateTrainerStatus = async (id: string, status: string) => {
    await updateTrainerStatus(id, status);
    setTrainers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const handleUpdateTrainer = async (id: string, data: Partial<Trainer>) => {
    await updateTrainer(id, data);
    setTrainers(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const handleAddReview = async (reviewData: Review) => {
    const saved = await addReview(reviewData);
    setReviews(prev => [...prev, saved]);
    return saved;
  };

  const handleAddOffer = async (offerData: Offer) => {
    const saved = await addOffer(offerData);
    setOffers(prev => [...prev, saved]);
    return saved;
  };

  const handleSaveSettings = async (settingsData: any) => {
    await saveSettings(settingsData);
    setSettings(settingsData);
  };

  const handleRemoveMember = async (member: Member, reason: string) => {
    // Create the removed member record
    const removedRecord: RemovedMember = {
      memberId: member.id || '',
      name: member.name,
      phone: member.phone,
      plan: member.plan,
      amount: member.amount,
      startDate: member.startDate,
      expiryDate: member.expiryDate,
      email: member.email,
      dob: member.dob,
      gender: member.gender,
      trainer: member.trainer,
      paymentMode: member.paymentMode,
      reason,
      removedDate: new Date().toISOString().split('T')[0],
      removedBy: user?.email || 'Unknown',
    };

    // Save to removed_members collection
    const saved = await addRemovedMember(removedRecord);
    setRemovedMembers(prev => [...prev, saved]);

    // Delete from active members
    if (member.id) {
      await deleteMember(member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = mounted ? today.toLocaleDateString('en-US', options) : '';

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Filter nav items based on user role
  const role: UserRole = user?.role || 'receptionist';
  const navItems = allNavItems.filter(item => item.roles.includes(role));

  // Global search filters
  const searchedMembers = globalSearch.length > 1
    ? members.filter(m => m.name.toLowerCase().includes(globalSearch.toLowerCase()) || m.phone.includes(globalSearch))
    : [];

  const searchedTransactions = globalSearch.length > 1
    ? members.filter(m => m.name.toLowerCase().includes(globalSearch.toLowerCase()) && m.amount)
    : [];

  // Expiring members count for notifications
  const expiringCount = members.filter(m => m.status === 'Expiring Soon').length;

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D0D0D] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="font-heading text-lg tracking-wider uppercase">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={login} onResetPassword={resetPassword} />;
  }

  // Database loading state
  if (dbLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D0D0D] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="font-heading text-lg tracking-wider uppercase">Loading Corenix Club database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen overflow-hidden text-sm transition-colors duration-300 ${isLightMode ? 'bg-[#f0f2f5] text-gray-900' : 'bg-[#0D0D0D] text-white'}`}>
      
      {/* Sidebar Overlay (Mobile) — shows when sidebar is OPEN on mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative z-50 h-screen transition-all duration-300 flex flex-col shrink-0 ${
          isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color' 
        } border-r ${
          sidebarOpen ? 'w-[240px] translate-x-0' : 'w-[240px] -translate-x-full lg:w-[80px] lg:translate-x-0'
        }`}
      >
        <div className="flex px-6 py-[30px] items-center justify-between lg:justify-center border-b border-border-color shrink-0">
          {sidebarOpen ? (
            <h1 className="font-heading font-black text-[22px] tracking-[1px] text-primary uppercase flex items-center gap-2">
              {settings.gymName}
            </h1>
          ) : (
            <h1 className="font-heading font-black text-[22px] text-primary uppercase">C</h1>
          )}
          
          <button className="lg:hidden text-text-secondary hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 flex flex-col no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 group text-[14px] border-l-[3px] ${
                  isActive 
                    ? `bg-gradient-to-r ${isLightMode ? 'from-primary/20' : 'from-primary/10'} to-transparent border-l-primary ${isLightMode ? 'text-black font-bold' : 'text-white'}` 
                    : `border-l-transparent ${isLightMode ? 'text-gray-600 hover:text-black' : 'text-text-secondary hover:text-white'}`
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <div className={`flex items-center justify-center ${isActive ? 'text-primary opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                {sidebarOpen && <span className="">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Topbar */}
        <header className={`h-[64px] border-b ${isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color'} z-30 flex items-center justify-between px-6 shrink-0`}>
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={toggleSidebar}
              className={`p-2 -ml-2 rounded-md ${isLightMode ? 'hover:bg-gray-100 text-gray-500 hover:text-black' : 'hover:bg-[#0D0D0D] text-text-secondary hover:text-white'} transition-colors lg:hidden`}
            >
              <Menu size={20} />
            </button>
            <div className={`relative hidden sm:flex items-center w-[300px] ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-[#0D0D0D] border-border-color'} border rounded-md px-3 py-2 transition-all focus-within:ring-1 focus-within:ring-primary`}>
              <Search className={isLightMode ? 'text-gray-400 shrink-0' : 'text-text-secondary shrink-0'} size={16} />
              <input 
                type="text" 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={`Search across ${settings.gymName}...`} 
                className={`bg-transparent border-none text-[13px] ${isLightMode ? 'text-black placeholder:text-gray-400' : 'text-white placeholder:text-text-secondary'} focus:outline-none w-full ml-2`}
              />
            </div>

            {/* Global Search Results Dropdown */}
            {globalSearch.length > 1 && (
              <div className={`absolute top-12 left-0 sm:left-10 w-[320px] rounded-lg shadow-xl shadow-black/50 border ${isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color'} z-50 overflow-hidden`}>
                <div className={`px-4 py-2 border-b ${isLightMode ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-border-color bg-[#0D0D0D] text-text-secondary'} text-xs font-bold uppercase`}>Members</div>
                {searchedMembers.slice(0, 3).map((m) => (
                  <div key={m.id} onClick={() => { setActiveTab('Members'); setGlobalSearch(''); }} className={`px-4 py-3 cursor-pointer flex items-center justify-between ${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{m.name[0]}</div>
                      <div>
                        <div className={`text-sm ${isLightMode ? 'text-black font-semibold' : 'text-white'}`}>{m.name}</div>
                        <div className="text-xs text-text-secondary">{m.phone} • {m.plan}</div>
                      </div>
                    </div>
                    <ChevronUp className="rotate-90 text-text-secondary" size={16} />
                  </div>
                ))}
                {searchedMembers.length === 0 && <div className="px-4 py-3 text-xs text-text-secondary">No members match.</div>}

                {role === 'admin' && (
                  <>
                    <div className={`px-4 py-2 border-b border-t ${isLightMode ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-border-color bg-[#0D0D0D] text-text-secondary'} text-xs font-bold uppercase`}>Transactions</div>
                    {searchedTransactions.slice(0, 2).map((m) => (
                      <div key={m.id} onClick={() => { setActiveTab('Reports'); setGlobalSearch(''); }} className={`px-4 py-3 cursor-pointer flex items-center justify-between ${isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#0D0D0D]/80'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-green-500/20 flex items-center justify-center text-green-500"><Banknote size={16}/></div>
                          <div>
                            <div className={`text-sm ${isLightMode ? 'text-black font-semibold' : 'text-white'}`}>INV-{m.id?.slice(-4).toUpperCase()}</div>
                            <div className="text-xs text-text-secondary">{m.amount} • {m.name}</div>
                          </div>
                        </div>
                        <ChevronUp className="rotate-90 text-text-secondary" size={16} />
                      </div>
                    ))}
                    {searchedTransactions.length === 0 && <div className="px-4 py-3 text-xs text-text-secondary">No matching payments.</div>}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className={`hidden md:block text-[12px] ${isLightMode ? 'text-gray-500' : 'text-text-secondary'} uppercase tracking-[0.5px]`}>
              {dateStr}
            </div>
            
            <button 
              onClick={() => setIsLightMode(!isLightMode)}
              className={`relative ${isLightMode ? 'text-gray-500 hover:text-black' : 'text-text-secondary hover:text-white'} transition-colors cursor-pointer`}
              title="Toggle Theme"
            >
              {isLightMode ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
            </button>

            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative ${isLightMode ? 'text-gray-500 hover:text-black' : 'text-text-secondary hover:text-white'} transition-colors cursor-pointer`}
            >
              <Bell size={24} strokeWidth={2} />
              {expiringCount > 0 && (
                <div className={`absolute top-0 right-0 w-2 h-2 bg-primary rounded-full animate-pulse ring-2 ${isLightMode ? 'ring-white' : 'ring-[#0D0D0D]'}`}></div>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={`absolute top-[60px] right-6 w-[340px] rounded-xl shadow-2xl shadow-black/80 border ${isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color'} z-50 overflow-hidden transform origin-top-right transition-all`}>
                <div className={`px-4 py-3 border-b ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-border-color bg-[#0D0D0D]/50'} flex justify-between items-center`}>
                  <h3 className={`font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Notifications ({expiringCount})</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-primary hover:underline">Dismiss</button>
                </div>
                <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                  {members.filter(m => m.status === 'Expiring Soon').map((m) => (
                    <div key={m.id} className={`p-4 border-b ${isLightMode ? 'border-gray-100 hover:bg-orange-50/50' : 'border-border-color hover:bg-orange-500/5'} cursor-pointer transition-colors relative`}>
                      <div className="w-2 h-2 bg-orange-500 rounded-full absolute top-5 left-2"></div>
                      <div className="ml-2">
                         <p className={`text-sm ${isLightMode ? 'text-black' : 'text-white'} font-semibold`}>{m.name}</p>
                         <p className={`text-xs ${isLightMode ? 'text-gray-500' : 'text-text-secondary'} mt-1`}>Membership expiring soon on {m.expiryDate}</p>
                      </div>
                    </div>
                  ))}
                  {expiringCount === 0 && (
                    <div className="p-4 text-center text-text-secondary text-sm">No expiration alerts today.</div>
                  )}
                </div>
              </div>
            )}
            
            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-border-color">
              <div className="w-8 h-8 rounded-full bg-[#333] border border-border-color flex items-center justify-center overflow-hidden font-heading font-bold text-sm">
                {user.email[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className={`text-xs font-semibold ${isLightMode ? 'text-black' : 'text-white'} block leading-tight`}>
                  {role === 'admin' ? 'Admin' : 'Receptionist'}
                </span>
                <span className="text-[10px] text-text-secondary block leading-tight">{user.email}</span>
              </div>
              <button 
                onClick={logout}
                className={`p-1.5 rounded-md ${isLightMode ? 'hover:bg-gray-100 text-gray-400 hover:text-red-500' : 'hover:bg-[#222] text-text-secondary hover:text-primary'} transition-colors ml-1`}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className={`flex-1 overflow-auto ${isLightMode ? 'bg-[#f0f2f5]' : 'bg-[#0D0D0D]'} p-6 no-scrollbar relative`}>
          {activeTab === 'Dashboard' && <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none opacity-50"></div>}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full relative z-10"
          >
            {activeTab === 'Dashboard' && <DashboardView members={members} attendance={attendanceRecords} staff={staff} trainers={trainers} staffAttendance={staffAttendance} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Members' && <MembersView members={members} trainers={trainers} onAddMember={handleAddMember} onUpdateMember={handleUpdateMember} onDeleteMember={handleDeleteMember} onRemoveMember={handleRemoveMember} removedMembers={removedMembers} isLightMode={isLightMode} role={role} settings={settings} />}
            {activeTab === 'Attendance' && <AttendanceView members={members} staff={staff} trainers={trainers} attendance={attendanceRecords} onAttendanceUpdate={setAttendanceRecords} onUpdateStaffStatus={handleUpdateStaffStatus} onUpdateTrainerStatus={handleUpdateTrainerStatus} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Staff' && role === 'admin' && <StaffView staff={staff} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff} onDeleteStaff={handleDeleteStaff} onUpdateStaffStatus={handleUpdateStaffStatus} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Trainers' && <TrainersView trainers={trainers} members={members} onAddTrainer={handleAddTrainer} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Reports' && role === 'admin' && <ReportsView members={members} attendance={attendanceRecords} isLightMode={isLightMode} />}
            {activeTab === 'Offers' && <OffersView offers={offers} onAddOffer={handleAddOffer} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Measurements' && <MeasurementsView members={members} isLightMode={isLightMode} />}
            {activeTab === 'Reviews' && <ReviewsView reviews={reviews} members={members} onAddReview={handleAddReview} isLightMode={isLightMode} role={role} />}
            {activeTab === 'Settings' && role === 'admin' && <SettingsView settings={settings} onSaveSettings={handleSaveSettings} isLightMode={isLightMode} />}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className={`h-10 text-center flex items-center justify-center ${isLightMode ? 'bg-white border-gray-200' : 'bg-surface border-border-color'} border-t text-[11px] text-text-secondary tracking-[1px] uppercase shrink-0`}>
          {settings.gymName} Software | Powered by Fit United
        </footer>

      </main>
    </div>
  );
}
