'use client';

import { useState } from 'react';
import { LayoutDashboard, CreditCard, MessageCircle, Clock, Fingerprint, Camera, Trash2, Check, X, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/AuthContext';
import { evaluatePasswordStrength, isPasswordValid, PASSWORD_MIN_LENGTH } from '@/lib/sanitize';
import { useToast } from '@/components/Toast';

interface SettingsViewProps {
  settings: any;
  onSaveSettings: (settings: any) => Promise<any>;
  isLightMode: boolean;
}

export default function SettingsView({ settings, onSaveSettings, isLightMode }: SettingsViewProps) {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [gymName, setGymName] = useState(settings?.gymName || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  
  // Plans list
  const [plans, setPlans] = useState<any[]>(settings?.plans || [
    { name: 'Monthly Basic', dur: '1 Month', price: '1500' },
    { name: 'Quarterly Save', dur: '3 Months', price: '4000' },
    { name: 'Half Yearly', dur: '6 Months', price: '7500' },
    { name: 'Yearly Pro', dur: '12 Months', price: '12000' },
  ]);

  // Automated reminders config
  const [expiryReminder, setExpiryReminder] = useState(settings?.automatedReminders?.expiry ?? true);
  const [birthdayWish, setBirthdayWish] = useState(settings?.automatedReminders?.birthday ?? true);
  const [absenteeAlert, setAbsenteeAlert] = useState(settings?.automatedReminders?.absentee ?? false);

  // Business Hours
  const [businessHours, setBusinessHours] = useState<any>(settings?.businessHours || {
    Monday: { active: true, open: '06:00', close: '22:00' },
    Tuesday: { active: true, open: '06:00', close: '22:00' },
    Wednesday: { active: true, open: '06:00', close: '22:00' },
    Thursday: { active: true, open: '06:00', close: '22:00' },
    Friday: { active: true, open: '06:00', close: '22:00' },
    Saturday: { active: true, open: '06:00', close: '22:00' },
    Sunday: { active: false, open: '', close: '' }
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Computed password strength
  const passwordStrength = evaluatePasswordStrength(newPassword);
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const strengthBgColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

  const handleSave = async () => {
    const updatedSettings = {
      gymName,
      address,
      phone,
      email,
      plans,
      automatedReminders: {
        expiry: expiryReminder,
        birthday: birthdayWish,
        absentee: absenteeAlert
      },
      businessHours
    };
    await onSaveSettings(updatedSettings);
    showToast('Settings saved successfully to Firestore database!', 'success');
  };

  const handlePlanPriceChange = (index: number, newPrice: string) => {
    const nextPlans = [...plans];
    nextPlans[index] = { ...nextPlans[index], price: newPrice };
    setPlans(nextPlans);
  };

  const handlePlanNameChange = (index: number, newName: string) => {
    const nextPlans = [...plans];
    nextPlans[index] = { ...nextPlans[index], name: newName };
    setPlans(nextPlans);
  };

  const handleHourToggle = (day: string) => {
    const nextHours = { ...businessHours };
    nextHours[day] = { ...nextHours[day], active: !nextHours[day].active };
    setBusinessHours(nextHours);
  };

  const handleHourChange = (day: string, field: 'open' | 'close', value: string) => {
    const nextHours = { ...businessHours };
    nextHours[day] = { ...nextHours[day], [field]: value };
    setBusinessHours(nextHours);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validate confirm password matches
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    // Validate password strength
    if (!isPasswordValid(newPassword)) {
      setPasswordError('Password does not meet all requirements. See the checklist below.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully! Your new password is now active.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'} mb-1`}>
            Settings
          </h1>
          <p className="text-sm text-text-secondary">Manage gym preferences and system configurations</p>
        </div>
        <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors">
          Save All Changes
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full lg:w-[240px] shrink-0">
          <div className="bg-surface border border-border-color rounded-xl overflow-hidden flex flex-row lg:flex-col">
            {[
              { id: 'general', label: 'General Info', icon: LayoutDashboard },
              { id: 'plans', label: 'Membership Plans', icon: CreditCard },
              { id: 'communication', label: 'WhatsApp & Comm', icon: MessageCircle },
              { id: 'hours', label: 'Business Hours', icon: Clock },
              { id: 'security', label: 'Security & Password', icon: Fingerprint },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-4 lg:py-3 text-sm text-left transition-colors whitespace-nowrap lg:whitespace-normal ${
                  activeSettingsTab === tab.id 
                    ? 'bg-[#0D0D0D] text-primary border-b-2 lg:border-b-0 lg:border-l-2 border-primary font-bold' 
                    : 'text-text-secondary hover:text-white hover:bg-[#0D0D0D]/50 border-b-2 lg:border-b-0 lg:border-l-2 border-transparent'
                }`}
              >
                <tab.icon size={16} className={activeSettingsTab === tab.id ? 'text-primary' : 'text-text-secondary'}/>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-surface border border-border-color rounded-xl p-6">
           
           {activeSettingsTab === 'general' && (
             <div className="space-y-6 max-w-2xl">
               <div>
                 <h3 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'} mb-4`}>Gym Information</h3>
                 <div className="space-y-4">
                   <div className="flex items-start gap-4">
                     <div className="w-20 h-20 rounded-lg bg-[#0D0D0D] border border-dashed border-border-color flex items-center justify-center text-text-secondary relative overflow-hidden group cursor-pointer">
                        <Camera size={24} />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white">Upload</div>
                     </div>
                     <div className="flex-1 space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">Gym Name</label>
                       <input type="text" value={gymName} onChange={e => setGymName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs text-text-secondary font-semibold uppercase">Address</label>
                     <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" rows={2}></textarea>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">Phone Number</label>
                       <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">Email (Public)</label>
                       <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}

           {activeSettingsTab === 'plans' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Membership Plans Pricing</h3>
                  <button onClick={() => setPlans([...plans, { name: 'New Custom Plan', dur: '1 Month', price: '1200' }])} className="text-sm text-primary hover:text-white transition-colors flex items-center gap-1">+ New Plan</button>
                </div>
                
                <div className="overflow-x-auto border border-border-color rounded-lg">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#0D0D0D] text-text-secondary text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-medium">Plan Name</th>
                        <th className="px-4 py-3 font-medium">Duration</th>
                        <th className="px-4 py-3 font-medium">Price (₹)</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color bg-surface">
                      {plans.map((p, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 font-bold text-white">
                            <input type="text" value={p.name} onChange={e => handlePlanNameChange(i, e.target.value)} className="bg-transparent border-b border-transparent hover:border-text-secondary focus:border-primary focus:outline-none w-full" />
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{p.dur}</td>
                          <td className="px-4 py-3 font-mono text-green-400">
                            <input type="number" value={p.price} onChange={e => handlePlanPriceChange(i, e.target.value)} className="bg-[#0D0D0D] border border-border-color rounded px-2 py-1 w-24 focus:outline-none focus:border-primary" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setPlans(plans.filter((_, idx) => idx !== i))} className="text-text-secondary hover:text-red-500"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
           )}

           {activeSettingsTab === 'communication' && (
             <div className="space-y-6 max-w-2xl">
               <div>
                 <h3 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'} mb-4`}>WhatsApp Integration</h3>
                 <p className="text-xs text-text-secondary mb-6">Configure the automated WhatsApp sender number. Changing this requires reverification.</p>
                 
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Official WhatsApp Number</label>
                      <div className="flex gap-2">
                        <input type="text" className="flex-1 bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" value={phone} disabled />
                        <button className="bg-[#0D0D0D] border border-border-color text-text-secondary hover:text-white px-4 py-2 rounded-md text-sm font-bold transition-colors">Change</button>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border-color">
                      <h4 className="text-sm font-semibold text-white mb-3">Automated Reminders</h4>
                      <label className="flex items-center gap-3 cursor-pointer py-2">
                         <input type="checkbox" checked={expiryReminder} onChange={e => setExpiryReminder(e.target.checked)} className="accent-primary w-4 h-4" />
                         <div>
                           <p className="text-sm text-white">Expiry Reminders</p>
                           <p className="text-xs text-text-secondary">Send 3 days before expiry</p>
                         </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer py-2">
                         <input type="checkbox" checked={birthdayWish} onChange={e => setBirthdayWish(e.target.checked)} className="accent-primary w-4 h-4" />
                         <div>
                           <p className="text-sm text-white">Birthday Wishes</p>
                           <p className="text-xs text-text-secondary">Send daily at 9:00 AM</p>
                         </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer py-2">
                         <input type="checkbox" checked={absenteeAlert} onChange={e => setAbsenteeAlert(e.target.checked)} className="accent-primary w-4 h-4" />
                         <div>
                           <p className="text-sm text-white">Absentee Alerts</p>
                           <p className="text-xs text-text-secondary">Send if absent &gt; 7 days</p>
                         </div>
                      </label>
                    </div>
                 </div>
               </div>
             </div>
           )}

           {activeSettingsTab === 'hours' && (
             <div className="space-y-6 max-w-2xl">
               <div>
                 <h3 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'} mb-4`}>Business Hours</h3>
                 
                 <div className="space-y-3">
                    {Object.keys(businessHours).map(day => {
                      const h = businessHours[day];
                      return (
                        <div key={day} className="flex items-center justify-between p-3 bg-[#0D0D0D] border border-border-color rounded-lg">
                          <div className="flex items-center gap-3 w-32">
                            <input type="checkbox" checked={h.active} onChange={() => handleHourToggle(day)} className="accent-primary w-4 h-4" />
                            <span className={`text-sm ${!h.active ? 'text-text-secondary' : 'text-white'}`}>{day}</span>
                          </div>
                          
                          {h.active ? (
                            <div className="flex items-center gap-2">
                              <input type="time" value={h.open} onChange={e => handleHourChange(day, 'open', e.target.value)} className="bg-surface border border-border-color rounded px-2 py-1 text-sm text-white [color-scheme:dark]" />
                              <span className="text-text-secondary text-xs">to</span>
                              <input type="time" value={h.close} onChange={e => handleHourChange(day, 'close', e.target.value)} className="bg-surface border border-border-color rounded px-2 py-1 text-sm text-white [color-scheme:dark]" />
                            </div>
                          ) : (
                            <span className="text-sm text-red-400 font-semibold italic">Closed</span>
                          )}
                        </div>
                      );
                    })}
                 </div>
               </div>
             </div>
           )}

           {activeSettingsTab === 'security' && (
              <div className="space-y-6 max-w-xl">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                       <ShieldCheck size={20} className="text-primary" />
                     </div>
                     <div>
                       <h3 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Change Password</h3>
                     </div>
                   </div>
                   <p className="text-xs text-text-secondary mb-6">
                     Update your login credentials. You&apos;ll need to enter your current password for verification.
                   </p>
                   
                   <form onSubmit={handlePasswordChange} className="space-y-4">
                     {/* Current Password */}
                     <div className="space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">Current Password</label>
                       <div className="relative">
                         <input 
                           required 
                           type={showCurrentPassword ? 'text' : 'password'} 
                           value={currentPassword}
                           onChange={e => setCurrentPassword(e.target.value)}
                           autoComplete="current-password"
                           className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-primary/50" 
                           placeholder="Enter current password" 
                         />
                         <button 
                           type="button" 
                           onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                         >
                           {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                       </div>
                     </div>

                     {/* New Password */}
                     <div className="space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">New Password</label>
                       <div className="relative">
                         <input 
                           required 
                           type={showNewPassword ? 'text' : 'password'}
                           value={newPassword}
                           onChange={e => setNewPassword(e.target.value)}
                           autoComplete="new-password"
                           className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-primary/50" 
                           placeholder="Enter new password" 
                         />
                         <button 
                           type="button" 
                           onClick={() => setShowNewPassword(!showNewPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                         >
                           {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                       </div>
                       
                       {/* Password Strength Meter */}
                       {newPassword.length > 0 && (
                         <motion.div
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           className="space-y-3 pt-2"
                         >
                           {/* Strength Bar */}
                           <div className="space-y-1.5">
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">
                                 Password Strength
                               </span>
                               <span 
                                 className="text-xs font-bold"
                                 style={{ color: strengthColors[passwordStrength.score] }}
                               >
                                 {passwordStrength.label}
                               </span>
                             </div>
                             <div className="flex gap-1">
                               {[0, 1, 2, 3, 4].map(i => (
                                 <div
                                   key={i}
                                   className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                     i <= passwordStrength.score
                                       ? strengthBgColors[passwordStrength.score]
                                       : 'bg-border-color'
                                   }`}
                                 />
                               ))}
                             </div>
                           </div>

                           {/* Requirements Checklist */}
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                             {[
                               { key: 'minLength', label: `${PASSWORD_MIN_LENGTH}+ characters` },
                               { key: 'hasUppercase', label: 'Uppercase letter' },
                               { key: 'hasLowercase', label: 'Lowercase letter' },
                               { key: 'hasNumber', label: 'Number' },
                               { key: 'hasSpecialChar', label: 'Special character (!@#$...)' },
                             ].map(req => {
                               const met = passwordStrength.requirements[req.key as keyof typeof passwordStrength.requirements];
                               return (
                                 <div key={req.key} className="flex items-center gap-1.5">
                                   <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                                     met ? 'bg-green-500' : 'bg-border-color'
                                   }`}>
                                     {met ? <Check size={8} className="text-white" /> : <X size={8} className="text-text-secondary" />}
                                   </div>
                                   <span className={`text-[11px] ${met ? 'text-green-400' : 'text-text-secondary'} transition-colors`}>
                                     {req.label}
                                   </span>
                                 </div>
                               );
                             })}
                           </div>
                         </motion.div>
                       )}
                     </div>

                     {/* Confirm Password */}
                     <div className="space-y-2">
                       <label className="text-xs text-text-secondary font-semibold uppercase">Confirm New Password</label>
                       <input 
                         required 
                         type="password" 
                         value={confirmPassword}
                         onChange={e => setConfirmPassword(e.target.value)}
                         autoComplete="new-password"
                         className={`w-full bg-[#0D0D0D] border rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 ${
                           confirmPassword.length > 0 && confirmPassword !== newPassword
                             ? 'border-red-500/50'
                             : confirmPassword.length > 0 && confirmPassword === newPassword
                               ? 'border-green-500/50'
                               : 'border-border-color'
                         }`}
                         placeholder="Confirm new password" 
                       />
                       {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                         <p className="text-[11px] text-red-400">Passwords do not match</p>
                       )}
                     </div>

                     {/* Error / Success Messages */}
                     <AnimatePresence>
                       {passwordError && (
                         <motion.div
                           initial={{ opacity: 0, y: -5 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -5 }}
                           className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                         >
                           <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                           <span className="text-xs text-red-400 font-medium">{passwordError}</span>
                         </motion.div>
                       )}
                       {passwordSuccess && (
                         <motion.div
                           initial={{ opacity: 0, y: -5 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -5 }}
                           className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                         >
                           <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                           <span className="text-xs text-green-400 font-medium">{passwordSuccess}</span>
                         </motion.div>
                       )}
                     </AnimatePresence>
                     
                     <button 
                       type="submit" 
                       disabled={passwordLoading || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
                       className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-md text-sm font-bold transition-colors mt-2 flex items-center gap-2"
                     >
                       {passwordLoading ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       ) : (
                         <Fingerprint size={16} />
                       )}
                       Update Password
                     </button>
                   </form>

                   {/* Security Info */}
                   <div className="mt-8 pt-6 border-t border-border-color">
                     <h4 className={`text-sm font-semibold ${isLightMode ? 'text-black' : 'text-white'} mb-3`}>Security Features</h4>
                     <div className="space-y-2.5">
                       {[
                         { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', active: true },
                         { label: 'Login Rate Limiting', desc: 'Account locks after 3+ failed attempts', active: true },
                         { label: 'Security Audit Logs', desc: 'All login/logout events are recorded', active: true },
                         { label: 'Input Sanitization', desc: 'All data inputs are validated and sanitized', active: true },
                         { label: 'Role-Based Access', desc: 'Admin & Receptionist permissions enforced', active: true },
                       ].map((feat, i) => (
                         <div key={i} className="flex items-center gap-3 p-2.5 bg-[#0D0D0D] rounded-lg border border-border-color">
                           <div className={`w-2 h-2 rounded-full ${feat.active ? 'bg-green-500' : 'bg-red-500'}`} />
                           <div className="flex-1">
                             <p className={`text-xs font-semibold ${isLightMode ? 'text-black' : 'text-white'}`}>{feat.label}</p>
                             <p className="text-[10px] text-text-secondary">{feat.desc}</p>
                           </div>
                           <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                             feat.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                           }`}>
                             {feat.active ? 'Active' : 'Inactive'}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              </div>
            )}

        </div>
      </div>
    </div>
  );
}
