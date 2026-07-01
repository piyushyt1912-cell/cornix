import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  limit, 
  getDoc,
  onSnapshot,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface Member {
  id?: string;
  name: string;
  phone: string;
  plan: string;
  amount: string;
  startDate: string;
  expiryDate: string;
  status: string;
  email?: string;
  dob?: string;
  gender?: string;
  trainer?: string;
  paymentMode?: string;
}

export interface Attendance {
  id?: string;
  name: string;
  phone: string;
  time: string;
  plan: string;
  status: string;
  date: string;
}

export interface Staff {
  id?: string;
  name: string;
  role: string;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
  salary: string;
  joinDate: string;
  status: string;
  type: string;
}

export interface Trainer {
  id?: string;
  name: string;
  specialization: string;
  phone: string;
  experience: string;
  membersCount: number;
  status: string;
  bio: string;
  salary: string;
  timing: string;
}

export interface Measurement {
  id?: string;
  phone: string;
  date: string;
  weight: number;
  height: number;
  bodyFat: number;
  chest: number;
  waist: number;
  arms: number;
}

export interface Review {
  id?: string;
  name: string;
  text: string;
  r: number;
  date: string;
}

export interface Offer {
  id?: string;
  name: string;
  target: string;
  date: string;
  count: string;
}

export interface RemovedMember {
  id?: string;
  memberId: string;
  name: string;
  phone: string;
  plan: string;
  amount: string;
  startDate: string;
  expiryDate: string;
  email?: string;
  dob?: string;
  gender?: string;
  trainer?: string;
  paymentMode?: string;
  reason: string;
  removedDate: string;
  removedBy: string;
}

// ─── Attendance Tracking System Interfaces ──────────────────────────────────

export interface AttendanceRecord {
  id?: string;
  personId: string;
  personType: 'member' | 'staff' | 'trainer';
  name: string;
  phone: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInTimestamp: number;
  checkOutTimestamp?: number;
  duration?: number;
  method: 'biometric' | 'manual';
  deviceId?: string;
  plan?: string;
  status: string;
}

export interface DailyStaffAttendance {
  id?: string;
  staffId: string;
  staffType: 'staff' | 'trainer';
  name: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day' | 'Late';
  checkInTime?: string;
  checkOutTime?: string;
  expectedShiftStart: string;
  expectedShiftEnd: string;
  hoursWorked?: number;
  isLate: boolean;
  lateByMinutes: number;
  method: 'biometric' | 'manual' | 'auto-absent';
}

export interface Payslip {
  id?: string;
  staffId: string;
  staffType: 'staff' | 'trainer';
  name: string;
  month: string;
  generatedDate: string;
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysOnLeave: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
}

export interface DailyInit {
  date: string;
  initializedBy: string;
  initializedAt: string;
  absentCount: number;
}

// ─── Fallback Logic ─────────────────────────────────────────────────────────
// If Firestore is unreachable, the app gracefully falls back to localStorage
// so staff can continue working. Data is empty by default (no dummy data).

let useFallback = (typeof window !== 'undefined' && sessionStorage.getItem('corenix_useFallback') === 'true') || false;

function setFallback() {
  useFallback = true;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('corenix_useFallback', 'true');
  }
}

// ─── localStorage Utilities ─────────────────────────────────────────────────

function getLocal<T>(key: string, defaultData: T): T {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(`corenix_${key}`);
  if (stored) {
    try {
      return JSON.parse(stored) as T;
    } catch {
      return defaultData;
    }
  }
  return defaultData;
}

function saveLocal(key: string, data: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`corenix_${key}`, JSON.stringify(data));
  }
}

// ─── Old Data Cleanup ───────────────────────────────────────────────────────

/**
 * Remove any previously cached demo/dummy data from localStorage.
 * This runs once on startup to ensure a clean slate after upgrading
 * from the old version that had hardcoded seed data.
 */
export function clearOldDemoData() {
  if (typeof window === 'undefined') return;
  const cleanupKey = 'corenix_demo_data_cleared_v2';
  if (localStorage.getItem(cleanupKey)) return; // Already cleared

  // Remove old demo data keys
  const keysToRemove = [
    'corenix_members', 'corenix_staff', 'corenix_trainers', 
    'corenix_reviews', 'corenix_offers', 'corenix_attendance',
    'corenix_measurements', 'corenix_settings'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear fallback flag so app retries Firestore
  sessionStorage.removeItem('corenix_useFallback');
  useFallback = false;

  localStorage.setItem(cleanupKey, 'true');
  console.log('Old demo data cleared from localStorage.');
}

// ─── Database Initialization ────────────────────────────────────────────────

/**
 * Verify Firestore connectivity on startup.
 * If Firestore is unreachable, switch to localStorage fallback.
 * No dummy data is seeded — the database starts clean.
 */
export async function seedDatabaseIfEmpty() {
  if (useFallback) return;
  try {
    // Simple connectivity test — try to read one doc from members
    const membersCol = collection(db, 'members');
    await getDocs(query(membersCol, limit(1)));
    console.log('Firestore connection verified.');
  } catch (error) {
    console.warn('Firestore unreachable. Using localStorage fallback.', error);
    setFallback();
  }
}

// ─── Members ────────────────────────────────────────────────────────────────

export async function getMembers(): Promise<Member[]> {
  if (useFallback) return getLocal<Member[]>('members', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'members'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
  } catch (error) {
    console.warn('getMembers failed. Using localStorage.', error);
    setFallback();
    return getLocal<Member[]>('members', []);
  }
}

export async function addMember(member: Member): Promise<Member> {
  if (useFallback) {
    const local = getLocal<Member[]>('members', []);
    const newMember = { id: `m_${Date.now()}`, ...member };
    local.push(newMember);
    saveLocal('members', local);
    return newMember;
  }
  try {
    const docRef = await addDoc(collection(db, 'members'), member);
    return { id: docRef.id, ...member };
  } catch (error) {
    setFallback();
    return addMember(member);
  }
}

export async function updateMember(id: string, member: Partial<Member>): Promise<void> {
  if (useFallback) {
    const local = getLocal<Member[]>('members', []);
    const updated = local.map((m: any) => m.id === id ? { ...m, ...member } : m);
    saveLocal('members', updated);
    return;
  }
  try {
    const docRef = doc(db, 'members', id);
    await updateDoc(docRef, member as any);
  } catch (error) {
    setFallback();
    await updateMember(id, member);
  }
}

export async function deleteMember(id: string): Promise<void> {
  if (useFallback) {
    const local = getLocal<Member[]>('members', []);
    const updated = local.filter((m: any) => m.id !== id);
    saveLocal('members', updated);
    return;
  }
  try {
    await deleteDoc(doc(db, 'members', id));
  } catch (error) {
    setFallback();
    await deleteMember(id);
  }
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export async function getAttendance(dateStr?: string): Promise<Attendance[]> {
  if (useFallback) {
    const local = getLocal<Attendance[]>('attendance', []);
    if (dateStr) {
      return local.filter((a: any) => a.date === dateStr);
    }
    return local;
  }
  try {
    const colRef = collection(db, 'attendance');
    let q = query(colRef);
    if (dateStr) {
      q = query(colRef, where('date', '==', dateStr));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  } catch (error) {
    setFallback();
    return getAttendance(dateStr);
  }
}

export async function markAttendance(visit: Attendance): Promise<Attendance> {
  if (useFallback) {
    const local = getLocal<Attendance[]>('attendance', []);
    const newVisit = { id: `a_${Date.now()}`, ...visit };
    local.push(newVisit);
    saveLocal('attendance', local);
    return newVisit;
  }
  try {
    const docRef = await addDoc(collection(db, 'attendance'), visit);
    return { id: docRef.id, ...visit };
  } catch (error) {
    setFallback();
    return markAttendance(visit);
  }
}

// ─── Attendance Tracking System ─────────────────────────────────────────────

export async function getAttendanceRecords(dateStr?: string): Promise<AttendanceRecord[]> {
  if (useFallback) {
    const local = getLocal<AttendanceRecord[]>('attendance_records', []);
    if (dateStr) return local.filter(a => a.date === dateStr);
    return local;
  }
  try {
    const colRef = collection(db, 'attendance');
    let q = query(colRef, orderBy('checkInTimestamp', 'desc'));
    if (dateStr) {
      q = query(colRef, where('date', '==', dateStr), orderBy('checkInTimestamp', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  } catch (error) {
    console.warn('getAttendanceRecords failed.', error);
    setFallback();
    return getLocal<AttendanceRecord[]>('attendance_records', []);
  }
}

export async function markCheckIn(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
  if (useFallback) {
    const local = getLocal<AttendanceRecord[]>('attendance_records', []);
    const newRecord: AttendanceRecord = { id: `ar_${Date.now()}`, ...record };
    local.push(newRecord);
    saveLocal('attendance_records', local);
    return newRecord;
  }
  try {
    const docRef = await addDoc(collection(db, 'attendance'), record);
    return { id: docRef.id, ...record };
  } catch (error) {
    setFallback();
    return markCheckIn(record);
  }
}

export async function markCheckOut(attendanceId: string): Promise<void> {
  const now = new Date();
  const checkOutTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const checkOutTimestamp = now.getTime();

  if (useFallback) {
    const local = getLocal<AttendanceRecord[]>('attendance_records', []);
    const updated = local.map(a => {
      if (a.id === attendanceId) {
        const duration = Math.round((checkOutTimestamp - a.checkInTimestamp) / 60000);
        return { ...a, checkOutTime, checkOutTimestamp, duration };
      }
      return a;
    });
    saveLocal('attendance_records', updated);
    return;
  }
  try {
    const docRef = doc(db, 'attendance', attendanceId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const duration = Math.round((checkOutTimestamp - (data.checkInTimestamp || 0)) / 60000);
      await updateDoc(docRef, { checkOutTime, checkOutTimestamp, duration });
    }
  } catch (error) {
    setFallback();
    await markCheckOut(attendanceId);
  }
}

export function subscribeToAttendance(dateStr: string, callback: (records: AttendanceRecord[]) => void): Unsubscribe {
  if (useFallback) {
    callback(getLocal<AttendanceRecord[]>('attendance_records', []).filter(a => a.date === dateStr));
    return () => {};
  }
  const colRef = collection(db, 'attendance');
  const q = query(colRef, where('date', '==', dateStr), orderBy('checkInTimestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    callback(records);
  }, (error) => {
    console.warn('Attendance subscription failed:', error);
    callback(getLocal<AttendanceRecord[]>('attendance_records', []).filter(a => a.date === dateStr));
  });
}

// ─── Staff Attendance ───────────────────────────────────────────────────────

export async function getStaffAttendanceByDate(dateStr: string): Promise<DailyStaffAttendance[]> {
  if (useFallback) {
    return getLocal<DailyStaffAttendance[]>('staff_attendance', []).filter(a => a.date === dateStr);
  }
  try {
    const colRef = collection(db, 'staff_attendance');
    const q = query(colRef, where('date', '==', dateStr));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyStaffAttendance));
  } catch (error) {
    setFallback();
    return getLocal<DailyStaffAttendance[]>('staff_attendance', []).filter(a => a.date === dateStr);
  }
}

export async function getStaffMonthlyAttendance(staffId: string, month: string): Promise<DailyStaffAttendance[]> {
  if (useFallback) {
    return getLocal<DailyStaffAttendance[]>('staff_attendance', [])
      .filter(a => a.staffId === staffId && a.date.startsWith(month));
  }
  try {
    const colRef = collection(db, 'staff_attendance');
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const q = query(colRef, 
      where('staffId', '==', staffId), 
      where('date', '>=', startDate), 
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyStaffAttendance));
  } catch (error) {
    setFallback();
    return getLocal<DailyStaffAttendance[]>('staff_attendance', [])
      .filter(a => a.staffId === staffId && a.date.startsWith(month));
  }
}

export async function saveStaffAttendance(record: Omit<DailyStaffAttendance, 'id'>): Promise<DailyStaffAttendance> {
  if (useFallback) {
    const local = getLocal<DailyStaffAttendance[]>('staff_attendance', []);
    const newRecord: DailyStaffAttendance = { id: `sa_${Date.now()}`, ...record };
    local.push(newRecord);
    saveLocal('staff_attendance', local);
    return newRecord;
  }
  try {
    const docRef = await addDoc(collection(db, 'staff_attendance'), record);
    return { id: docRef.id, ...record };
  } catch (error) {
    setFallback();
    return saveStaffAttendance(record);
  }
}

export async function updateStaffAttendance(id: string, data: Partial<DailyStaffAttendance>): Promise<void> {
  if (useFallback) {
    const local = getLocal<DailyStaffAttendance[]>('staff_attendance', []);
    const updated = local.map(a => a.id === id ? { ...a, ...data } : a);
    saveLocal('staff_attendance', updated);
    return;
  }
  try {
    await updateDoc(doc(db, 'staff_attendance', id), data as any);
  } catch (error) {
    setFallback();
    await updateStaffAttendance(id, data);
  }
}

export async function initializeDailyAbsences(
  staffList: Staff[], 
  trainerList: Trainer[], 
  dateStr: string, 
  adminEmail: string
): Promise<number> {
  // Check if already initialized today
  try {
    const initDoc = doc(db, 'daily_init', dateStr);
    const initSnap = await getDoc(initDoc);
    if (initSnap.exists()) return 0; // Already initialized

    // Get existing staff attendance for today
    const existingAttendance = await getStaffAttendanceByDate(dateStr);
    const checkedInIds = new Set(existingAttendance.map(a => a.staffId));

    let absentCount = 0;

    // Mark absent for staff who haven't checked in
    for (const s of staffList) {
      if (s.id && !checkedInIds.has(s.id) && s.status !== 'Inactive') {
        await saveStaffAttendance({
          staffId: s.id,
          staffType: 'staff',
          name: s.name,
          date: dateStr,
          status: 'Absent',
          expectedShiftStart: s.shiftStart,
          expectedShiftEnd: s.shiftEnd,
          isLate: false,
          lateByMinutes: 0,
          method: 'auto-absent',
        });
        absentCount++;
      }
    }

    // Mark absent for trainers who haven't checked in
    for (const t of trainerList) {
      if (t.id && !checkedInIds.has(t.id) && t.status === 'Active') {
        await saveStaffAttendance({
          staffId: t.id,
          staffType: 'trainer',
          name: t.name,
          date: dateStr,
          status: 'Absent',
          expectedShiftStart: t.timing?.split('-')[0]?.trim() || '09:00',
          expectedShiftEnd: t.timing?.split('-')[1]?.trim() || '18:00',
          isLate: false,
          lateByMinutes: 0,
          method: 'auto-absent',
        });
        absentCount++;
      }
    }

    // Mark daily init as complete
    const initData: DailyInit = {
      date: dateStr,
      initializedBy: adminEmail,
      initializedAt: new Date().toISOString(),
      absentCount,
    };
    await setDoc(initDoc, initData);

    return absentCount;
  } catch (error) {
    console.warn('initializeDailyAbsences failed:', error);
    return 0;
  }
}

// ─── Payslips ───────────────────────────────────────────────────────────────

export async function getPayslips(month?: string): Promise<Payslip[]> {
  if (useFallback) {
    const local = getLocal<Payslip[]>('payslips', []);
    if (month) return local.filter(p => p.month === month);
    return local;
  }
  try {
    const colRef = collection(db, 'payslips');
    let q = query(colRef);
    if (month) {
      q = query(colRef, where('month', '==', month));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payslip));
  } catch (error) {
    setFallback();
    return getLocal<Payslip[]>('payslips', []);
  }
}

export async function generatePayslip(
  staffId: string,
  staffType: 'staff' | 'trainer',
  name: string,
  grossSalary: number,
  month: string,
  workingDays: number = 26
): Promise<Payslip> {
  const monthlyAttendance = await getStaffMonthlyAttendance(staffId, month);
  
  const daysPresent = monthlyAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const daysAbsent = monthlyAttendance.filter(a => a.status === 'Absent').length;
  const daysLate = monthlyAttendance.filter(a => a.status === 'Late').length;
  const daysOnLeave = monthlyAttendance.filter(a => a.status === 'On Leave').length;

  const dailyRate = grossSalary / workingDays;
  const deductions = daysAbsent * dailyRate;
  const netSalary = Math.round(grossSalary - deductions);

  const payslip: Omit<Payslip, 'id'> = {
    staffId,
    staffType,
    name,
    month,
    generatedDate: new Date().toISOString().slice(0, 10),
    totalWorkingDays: workingDays,
    daysPresent,
    daysAbsent,
    daysLate,
    daysOnLeave,
    grossSalary,
    deductions: Math.round(deductions),
    netSalary,
    status: 'draft',
  };

  if (useFallback) {
    const local = getLocal<Payslip[]>('payslips', []);
    const newPayslip: Payslip = { id: `ps_${Date.now()}`, ...payslip };
    local.push(newPayslip);
    saveLocal('payslips', local);
    return newPayslip;
  }
  try {
    const docRef = await addDoc(collection(db, 'payslips'), payslip);
    return { id: docRef.id, ...payslip };
  } catch (error) {
    setFallback();
    return generatePayslip(staffId, staffType, name, grossSalary, month, workingDays);
  }
}

export async function generateAllPayslips(
  staffList: Staff[], 
  trainerList: Trainer[], 
  month: string,
  workingDays: number = 26
): Promise<Payslip[]> {
  const payslips: Payslip[] = [];
  
  for (const s of staffList) {
    if (s.id && s.status !== 'Inactive') {
      const salary = parseFloat(s.salary) || 0;
      const payslip = await generatePayslip(s.id, 'staff', s.name, salary, month, workingDays);
      payslips.push(payslip);
    }
  }
  
  for (const t of trainerList) {
    if (t.id && t.status === 'Active') {
      const salary = parseFloat(t.salary) || 0;
      const payslip = await generatePayslip(t.id, 'trainer', t.name, salary, month, workingDays);
      payslips.push(payslip);
    }
  }
  
  return payslips;
}

export async function updatePayslipStatus(id: string, status: 'draft' | 'approved' | 'paid'): Promise<void> {
  if (useFallback) {
    const local = getLocal<Payslip[]>('payslips', []);
    const updated = local.map(p => p.id === id ? { ...p, status } : p);
    saveLocal('payslips', updated);
    return;
  }
  try {
    await updateDoc(doc(db, 'payslips', id), { status });
  } catch (error) {
    setFallback();
    await updatePayslipStatus(id, status);
  }
}

// ─── Staff ──────────────────────────────────────────────────────────────────

export async function getStaff(): Promise<Staff[]> {
  if (useFallback) return getLocal<Staff[]>('staff', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'staff'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
  } catch (error) {
    setFallback();
    return getLocal<Staff[]>('staff', []);
  }
}

export async function addStaff(staff: Staff): Promise<Staff> {
  if (useFallback) {
    const local = getLocal<Staff[]>('staff', []);
    const newStaff = { id: `s_${Date.now()}`, ...staff };
    local.push(newStaff);
    saveLocal('staff', local);
    return newStaff;
  }
  try {
    const docRef = await addDoc(collection(db, 'staff'), staff);
    return { id: docRef.id, ...staff };
  } catch (error) {
    setFallback();
    return addStaff(staff);
  }
}

export async function updateStaffStatus(id: string, status: string): Promise<void> {
  if (useFallback) {
    const local = getLocal<Staff[]>('staff', []);
    const updated = local.map((s: any) => s.id === id ? { ...s, status } : s);
    saveLocal('staff', updated);
    return;
  }
  try {
    const docRef = doc(db, 'staff', id);
    await updateDoc(docRef, { status });
  } catch (error) {
    setFallback();
    await updateStaffStatus(id, status);
  }
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
  if (useFallback) {
    const local = getLocal<Staff[]>('staff', []);
    const updated = local.map((s: any) => s.id === id ? { ...s, ...data } : s);
    saveLocal('staff', updated);
    return;
  }
  try {
    const docRef = doc(db, 'staff', id);
    await updateDoc(docRef, data as any);
  } catch (error) {
    setFallback();
    await updateStaff(id, data);
  }
}

export async function deleteStaff(id: string): Promise<void> {
  if (useFallback) {
    const local = getLocal<Staff[]>('staff', []);
    const updated = local.filter((s: any) => s.id !== id);
    saveLocal('staff', updated);
    return;
  }
  try {
    await deleteDoc(doc(db, 'staff', id));
  } catch (error) {
    setFallback();
    await deleteStaff(id);
  }
}

// ─── Trainers ───────────────────────────────────────────────────────────────

export async function getTrainers(): Promise<Trainer[]> {
  if (useFallback) return getLocal<Trainer[]>('trainers', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'trainers'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
  } catch (error) {
    setFallback();
    return getLocal<Trainer[]>('trainers', []);
  }
}

export async function addTrainer(trainer: Trainer): Promise<Trainer> {
  if (useFallback) {
    const local = getLocal<Trainer[]>('trainers', []);
    const newTrainer = { id: `t_${Date.now()}`, ...trainer };
    local.push(newTrainer);
    saveLocal('trainers', local);
    return newTrainer;
  }
  try {
    const docRef = await addDoc(collection(db, 'trainers'), trainer);
    return { id: docRef.id, ...trainer };
  } catch (error) {
    setFallback();
    return addTrainer(trainer);
  }
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(): Promise<Review[]> {
  if (useFallback) return getLocal<Review[]>('reviews', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'reviews'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
  } catch (error) {
    setFallback();
    return getLocal<Review[]>('reviews', []);
  }
}

export async function addReview(review: Review): Promise<Review> {
  if (useFallback) {
    const local = getLocal<Review[]>('reviews', []);
    const newReview = { id: `r_${Date.now()}`, ...review };
    local.push(newReview);
    saveLocal('reviews', local);
    return newReview;
  }
  try {
    const docRef = await addDoc(collection(db, 'reviews'), review);
    return { id: docRef.id, ...review };
  } catch (error) {
    setFallback();
    return addReview(review);
  }
}

// ─── Offers ─────────────────────────────────────────────────────────────────

export async function getOffers(): Promise<Offer[]> {
  if (useFallback) return getLocal<Offer[]>('offers', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'offers'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
  } catch (error) {
    setFallback();
    return getLocal<Offer[]>('offers', []);
  }
}

export async function addOffer(offer: Offer): Promise<Offer> {
  if (useFallback) {
    const local = getLocal<Offer[]>('offers', []);
    const newOffer = { id: `o_${Date.now()}`, ...offer };
    local.push(newOffer);
    saveLocal('offers', local);
    return newOffer;
  }
  try {
    const docRef = await addDoc(collection(db, 'offers'), offer);
    return { id: docRef.id, ...offer };
  } catch (error) {
    setFallback();
    return addOffer(offer);
  }
}

// ─── Measurements ───────────────────────────────────────────────────────────

export async function getMeasurements(phone?: string): Promise<Measurement[]> {
  if (useFallback) {
    const local = getLocal<Measurement[]>('measurements', []);
    if (phone) {
      return local.filter((m: any) => m.phone === phone);
    }
    return local;
  }
  try {
    const colRef = collection(db, 'measurements');
    let q = query(colRef);
    if (phone) {
      q = query(colRef, where('phone', '==', phone));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Measurement));
  } catch (error) {
    setFallback();
    return getMeasurements(phone);
  }
}

export async function addMeasurement(measurement: Measurement): Promise<Measurement> {
  if (useFallback) {
    const local = getLocal<Measurement[]>('measurements', []);
    const newM = { id: `me_${Date.now()}`, ...measurement };
    local.push(newM);
    saveLocal('measurements', local);
    return newM;
  }
  try {
    const docRef = await addDoc(collection(db, 'measurements'), measurement);
    return { id: docRef.id, ...measurement } as unknown as Measurement;
  } catch (error) {
    setFallback();
    return addMeasurement(measurement);
  }
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<any> {
  if (useFallback) return getLocal('settings', null);
  try {
    const docRef = doc(db, 'settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    setFallback();
    return getLocal('settings', null);
  }
}

export async function saveSettings(settings: any): Promise<void> {
  if (useFallback) {
    saveLocal('settings', settings);
    return;
  }
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    setFallback();
    await saveSettings(settings);
  }
}

// ─── Removed Members ────────────────────────────────────────────────────────

export async function getRemovedMembers(): Promise<RemovedMember[]> {
  if (useFallback) return getLocal<RemovedMember[]>('removed_members', []);
  try {
    const querySnapshot = await getDocs(collection(db, 'removed_members'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RemovedMember));
  } catch (error) {
    setFallback();
    return getLocal<RemovedMember[]>('removed_members', []);
  }
}

export async function addRemovedMember(removedMember: RemovedMember): Promise<RemovedMember> {
  if (useFallback) {
    const local = getLocal<RemovedMember[]>('removed_members', []);
    const newEntry = { id: `rm_${Date.now()}`, ...removedMember };
    local.push(newEntry);
    saveLocal('removed_members', local);
    return newEntry;
  }
  try {
    const docRef = await addDoc(collection(db, 'removed_members'), removedMember);
    return { id: docRef.id, ...removedMember };
  } catch (error) {
    setFallback();
    return addRemovedMember(removedMember);
  }
}
