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
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  createdAt?: string; // ISO date string of actual registration timestamp
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
  specialty: string;
  specialization: string;
  experience: string;
  phone: string;
  timing: string;
  salary: string;
  status: string;
  members: number;
  membersCount: number;
  shifts?: {
    morning: { enabled: boolean; start: string; end: string };
    evening: { enabled: boolean; start: string; end: string };
  };
}

export interface Review {
  id?: string;
  name: string;
  memberName?: string;
  r: number;
  rating?: number;
  text: string;
  comment?: string;
  date: string;
}

export interface Offer {
  id?: string;
  name: string;
  title?: string;
  description?: string;
  discount?: string;
  target: string;
  date: string;
  count: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface Measurement {
  id?: string;
  memberName?: string;
  phone: string;
  date: string;
  weight: number;
  height: number;
  bodyFat: number;
  chest: number;
  waist: number;
  arms: number;
  hips?: number;
  biceps?: number;
  thighs?: number;
  bmi?: string;
}

export interface RemovedMember {
  id?: string;
  memberId?: string;
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

// ─── Old Data Cleanup ───────────────────────────────────────────────────────

/**
 * Remove any previously cached demo/dummy data from localStorage.
 * This runs once on startup to ensure a clean slate after upgrading
 * from the old version that had hardcoded seed data.
 */
export function clearOldDemoData() {
  if (typeof window === 'undefined') return;
  const cleanupKey = 'corenix_demo_data_cleared_v3';
  if (localStorage.getItem(cleanupKey)) return; // Already cleared

  // Remove old demo data keys
  const keysToRemove = [
    'corenix_members', 'corenix_staff', 'corenix_trainers', 
    'corenix_reviews', 'corenix_offers', 'corenix_attendance',
    'corenix_measurements', 'corenix_settings',
    'corenix_attendance_records', 'corenix_staff_attendance',
    'corenix_payslips', 'corenix_removed_members',
    'corenix_demo_data_cleared_v2'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear old fallback flag 
  sessionStorage.removeItem('corenix_useFallback');

  localStorage.setItem(cleanupKey, 'true');
  console.log('Old localStorage data cleared. All data is now Firestore-only.');
}

// ─── Database Initialization ────────────────────────────────────────────────

/**
 * Verify Firestore connectivity on startup.
 * Throws if Firestore is unreachable so the UI can show an error.
 */
export async function seedDatabaseIfEmpty() {
  try {
    // Simple connectivity test — try to read one doc from members
    const membersCol = collection(db, 'members');
    await getDocs(query(membersCol, limit(1)));
    console.log('Firestore connection verified.');
  } catch (error) {
    console.error('Firestore connectivity check failed:', error);
    // Don't throw — let the individual operations handle errors
    // This prevents a single transient failure from blocking the entire app
  }
}

// ─── Members ────────────────────────────────────────────────────────────────

export async function getMembers(): Promise<Member[]> {
  const querySnapshot = await getDocs(collection(db, 'members'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
}

export async function addMember(member: Member): Promise<Member> {
  const memberWithTimestamp = {
    ...member,
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'members'), memberWithTimestamp);
  return { id: docRef.id, ...memberWithTimestamp };
}

export async function updateMember(id: string, member: Partial<Member>): Promise<void> {
  const docRef = doc(db, 'members', id);
  await updateDoc(docRef, member as any);
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'members', id));
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export async function getAttendance(dateStr?: string): Promise<Attendance[]> {
  const colRef = collection(db, 'attendance');
  let q = query(colRef);
  if (dateStr) {
    q = query(colRef, where('date', '==', dateStr));
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
}

export async function markAttendance(visit: Attendance): Promise<Attendance> {
  const docRef = await addDoc(collection(db, 'attendance'), visit);
  return { id: docRef.id, ...visit };
}

// ─── Attendance Tracking System ─────────────────────────────────────────────

export async function getAttendanceRecords(dateStr?: string): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, 'attendance');
    let q = query(colRef, orderBy('checkInTimestamp', 'desc'));
    if (dateStr) {
      q = query(colRef, where('date', '==', dateStr), orderBy('checkInTimestamp', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  } catch (error) {
    console.warn('getAttendanceRecords failed:', error);
    return [];
  }
}

export async function markCheckIn(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
  const docRef = await addDoc(collection(db, 'attendance'), record);
  return { id: docRef.id, ...record };
}

export async function markCheckOut(attendanceId: string): Promise<void> {
  const now = new Date();
  const checkOutTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const checkOutTimestamp = now.getTime();

  const docRef = doc(db, 'attendance', attendanceId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    const duration = Math.round((checkOutTimestamp - (data.checkInTimestamp || 0)) / 60000);
    await updateDoc(docRef, { checkOutTime, checkOutTimestamp, duration });
  }
}

export function subscribeToAttendance(dateStr: string, callback: (records: AttendanceRecord[]) => void): Unsubscribe {
  const colRef = collection(db, 'attendance');
  const q = query(colRef, where('date', '==', dateStr), orderBy('checkInTimestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    callback(records);
  }, (error) => {
    console.warn('Attendance subscription failed:', error);
    callback([]);
  });
}

// ─── Staff Attendance ───────────────────────────────────────────────────────

export async function getStaffAttendanceByDate(dateStr: string): Promise<DailyStaffAttendance[]> {
  const colRef = collection(db, 'staff_attendance');
  const q = query(colRef, where('date', '==', dateStr));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyStaffAttendance));
}

export async function getStaffMonthlyAttendance(staffId: string, month: string): Promise<DailyStaffAttendance[]> {
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
}

export async function saveStaffAttendance(record: Omit<DailyStaffAttendance, 'id'>): Promise<DailyStaffAttendance> {
  const docRef = await addDoc(collection(db, 'staff_attendance'), record);
  return { id: docRef.id, ...record };
}

export async function updateStaffAttendance(id: string, data: Partial<DailyStaffAttendance>): Promise<void> {
  await updateDoc(doc(db, 'staff_attendance', id), data as any);
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
  const colRef = collection(db, 'payslips');
  let q = query(colRef);
  if (month) {
    q = query(colRef, where('month', '==', month));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payslip));
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

  const docRef = await addDoc(collection(db, 'payslips'), payslip);
  return { id: docRef.id, ...payslip };
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
  await updateDoc(doc(db, 'payslips', id), { status });
}

// ─── Staff ──────────────────────────────────────────────────────────────────

export async function getStaff(): Promise<Staff[]> {
  const querySnapshot = await getDocs(collection(db, 'staff'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
}

export async function addStaff(staff: Staff): Promise<Staff> {
  const docRef = await addDoc(collection(db, 'staff'), staff);
  return { id: docRef.id, ...staff };
}

export async function updateStaffStatus(id: string, status: string): Promise<void> {
  const docRef = doc(db, 'staff', id);
  await updateDoc(docRef, { status });
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
  const docRef = doc(db, 'staff', id);
  await updateDoc(docRef, data as any);
}

export async function deleteStaff(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staff', id));
}

// ─── Trainers ───────────────────────────────────────────────────────────────

export async function getTrainers(): Promise<Trainer[]> {
  const querySnapshot = await getDocs(collection(db, 'trainers'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
}

export async function addTrainer(trainer: Trainer): Promise<Trainer> {
  const docRef = await addDoc(collection(db, 'trainers'), trainer);
  return { id: docRef.id, ...trainer };
}

export async function updateTrainer(id: string, data: Partial<Trainer>): Promise<void> {
  const docRef = doc(db, 'trainers', id);
  await updateDoc(docRef, data as Record<string, unknown>);
}

export async function deleteTrainer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'trainers', id));
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(): Promise<Review[]> {
  const querySnapshot = await getDocs(collection(db, 'reviews'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
}

export async function addReview(review: Review): Promise<Review> {
  const docRef = await addDoc(collection(db, 'reviews'), review);
  return { id: docRef.id, ...review };
}

// ─── Offers ─────────────────────────────────────────────────────────────────

export async function getOffers(): Promise<Offer[]> {
  const querySnapshot = await getDocs(collection(db, 'offers'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
}

export async function addOffer(offer: Offer): Promise<Offer> {
  const docRef = await addDoc(collection(db, 'offers'), offer);
  return { id: docRef.id, ...offer };
}

// ─── Measurements ───────────────────────────────────────────────────────────

export async function getMeasurements(phone?: string): Promise<Measurement[]> {
  const colRef = collection(db, 'measurements');
  let q = query(colRef);
  if (phone) {
    q = query(colRef, where('phone', '==', phone));
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Measurement));
}

export async function addMeasurement(measurement: Measurement): Promise<Measurement> {
  const docRef = await addDoc(collection(db, 'measurements'), measurement);
  return { id: docRef.id, ...measurement } as unknown as Measurement;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<any> {
  const docRef = doc(db, 'settings', 'global');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

export async function saveSettings(settings: any): Promise<void> {
  const docRef = doc(db, 'settings', 'global');
  await setDoc(docRef, settings, { merge: true });
}

// ─── Removed Members ────────────────────────────────────────────────────────

export async function getRemovedMembers(): Promise<RemovedMember[]> {
  const querySnapshot = await getDocs(collection(db, 'removed_members'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RemovedMember));
}

export async function addRemovedMember(removedMember: RemovedMember): Promise<RemovedMember> {
  const docRef = await addDoc(collection(db, 'removed_members'), removedMember);
  return { id: docRef.id, ...removedMember };
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export interface Receipt {
  id?: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  plan: string;
  amount: string;
  startDate: string;
  expiryDate: string;
  paymentMode: string;
  trainer: string;
  date: string;
  timestamp: number;
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  gymEmail: string;
  sentViaWhatsApp: boolean;
}

export async function getReceipts(): Promise<Receipt[]> {
  const querySnapshot = await getDocs(collection(db, 'receipts'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
}

export async function getReceiptsByMember(memberId: string): Promise<Receipt[]> {
  const colRef = collection(db, 'receipts');
  const q = query(colRef, where('memberId', '==', memberId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt));
}

export async function addReceipt(receipt: Receipt): Promise<Receipt> {
  const docRef = await addDoc(collection(db, 'receipts'), receipt);
  return { id: docRef.id, ...receipt };
}

export async function updateReceipt(id: string, data: Partial<Receipt>): Promise<void> {
  await updateDoc(doc(db, 'receipts', id), data as any);
}
