import AsyncStorage from '@react-native-async-storage/async-storage';
import { customSupabaseApi } from './customSupabaseApi';

// =========================================================================
// DATA MODELS
// =========================================================================

// Finance
export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  account_id?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'income' | 'expense' | 'investment';
  category: string;
  payment_method?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  address: string;
  height: string;
  updated_at: string;
}

export interface ExpenseQuota {
  id: string;
  category: string;
  amount: number;
  month: string;
}

export interface Asset {
  id: string;
  name: string;
  current_value: number;
  asset_type: string;
}

// Body
export interface Measurement {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number;
  body_fat?: number;
  waist?: number;
  chest?: number;
  neck?: number;
  hips?: number;
  biceps?: number;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Photo {
  id: string;
  date: string; // YYYY-MM-DD
  front_image?: string; // base64 or objectUrl
  side_image?: string;
  back_image?: string;
}

// Knowledge
export interface Book {
  id: string;
  title: string;
  author?: string;
  cover_image?: string;
  status: 'Not Started' | 'Reading' | 'Paused' | 'Finished';
  started_date?: string;
  finished_date?: string;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  date: string; // YYYY-MM-DD
  duration: number; // minutes
  pages_read: number;
}

export interface RecallEntry {
  id: string;
  book_id: string;
  question: string;
  answer: string;
  difficulty: number; // 1-5
  review_date: string; // YYYY-MM-DD
}

// Habits
export interface Habit {
  id: string;
  title: string;
  icon: string;
  target?: string;
  frequency: string; // daily, weekly
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
}

export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  protein: number; // grams
  carbs: number;
  fat: number;
  calories: number;
}

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  bed_time?: string; // HH:MM
  wake_time?: string; // HH:MM
  hours: number;
}

// Health
export interface DoctorVisit {
  id: string;
  date: string; // YYYY-MM-DD
  doctor: string;
  hospital?: string;
  reason: string;
  notes?: string;
}

export interface Vaccination {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  next_due?: string; // YYYY-MM-DD
}

export interface MedicalReport {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: string; // PDF, PNG, JPEG
  file_url: string;
}

// =========================================================================
// STORAGE KEYS & SYNC CONTROL
// =========================================================================

const KEYS = {
  SYNC_ENABLED: '@LifeOS:settings_supabase_sync',
  ACCOUNTS: '@LifeOS:accounts',
  TRANSACTIONS: '@LifeOS:transactions',
  ASSETS: '@LifeOS:assets',
  MEASUREMENTS: '@LifeOS:measurements',
  WORKOUTS: '@LifeOS:workouts',
  PHOTOS: '@LifeOS:photos',
  BOOKS: '@LifeOS:books',
  READING_SESSIONS: '@LifeOS:reading_sessions',
  RECALL_ENTRIES: '@LifeOS:recall_entries',
  HABITS: '@LifeOS:habits',
  HABIT_LOGS: '@LifeOS:habit_logs',
  FOOD_LOGS: '@LifeOS:food_logs',
  SLEEP_LOGS: '@LifeOS:sleep_logs',
  DOCTOR_VISITS: '@LifeOS:doctor_visits',
  VACCINATIONS: '@LifeOS:vaccinations',
  MEDICAL_REPORTS: '@LifeOS:medical_reports',
  USER_PROFILE: '@LifeOS:user_profile',
  EXPENSE_QUOTAS: '@LifeOS:expense_quotas',
};

async function getLocal<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      return [parsed] as unknown as T;
    }
    return parsed;
  } catch (e) {
    console.error(`Failed to load local key ${key}:`, e);
    return defaultValue;
  }
}

// Helper: save local storage item
async function setLocal<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save local key ${key}:`, e);
  }
}

// UUID Generator for offline use
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Sync Toggle Helpers
export async function isSupabaseSyncEnabled(): Promise<boolean> {
  const sync = await AsyncStorage.getItem(KEYS.SYNC_ENABLED);
  return sync === 'true';
}

export async function setSupabaseSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.SYNC_ENABLED, enabled ? 'true' : 'false');
}

// =========================================================================
// DATA REPOSITORY LAYER
// =========================================================================

export const database = {
  // Sync Status
  isSyncing: false,

  // General CRUD helper
  async getAll<T extends { id: string }>(storeKey: string, table: string): Promise<T[]> {
    const local = await getLocal<T[]>(storeKey, []);
    const sync = await isSupabaseSyncEnabled();
    if (sync) {
      try {
        const remote = await customSupabaseApi.select<T>(table);
        // Merge remote and local (remote takes precedence, add any local not in remote)
        const remoteIds = new Set(remote.map(r => r.id));
        const localsOnly = local.filter(l => !remoteIds.has(l.id));
        const merged = [...remote, ...localsOnly];
        await setLocal(storeKey, merged);
        return merged;
      } catch (err) {
        console.warn(`Sync failed for table ${table}, returning local data.`, err);
      }
    }
    return local;
  },

  async save<T extends { id: string }>(storeKey: string, table: string, item: T): Promise<T> {
    const local = await getLocal<T[]>(storeKey, []);
    const idx = local.findIndex(i => i.id === item.id);
    let updated = [...local];
    if (idx >= 0) {
      updated[idx] = item;
    } else {
      updated.push(item);
    }
    await setLocal(storeKey, updated);

    const sync = await isSupabaseSyncEnabled();
    if (sync) {
      try {
        if (idx >= 0) {
          await customSupabaseApi.update(table, item.id, item);
        } else {
          await customSupabaseApi.insert(table, item);
        }
      } catch (err) {
        console.warn(`Remote sync failed for save on ${table}:`, err);
      }
    }
    return item;
  },

  async remove(storeKey: string, table: string, id: string): Promise<void> {
    const local = await getLocal<{ id: string }[]>(storeKey, []);
    const updated = local.filter(i => i.id !== id);
    await setLocal(storeKey, updated);

    const sync = await isSupabaseSyncEnabled();
    if (sync) {
      try {
        await customSupabaseApi.delete(table, id);
      } catch (err) {
        console.warn(`Remote sync failed for delete on ${table}:`, err);
      }
    }
  },

  // =========================================================================
  // ENTITY METHODS
  // =========================================================================

  // Finance: Accounts
  async getAccounts(): Promise<Account[]> {
    const accounts = await this.getAll<Account>(KEYS.ACCOUNTS, 'accounts');
    // If empty, create default Cash account
    if (accounts.length === 0) {
      const defaultAcc: Account = {
        id: generateUUID(),
        name: 'Cash Balance',
        balance: 1000.0,
        currency: 'USD'
      };
      await this.saveAccount(defaultAcc);
      return [defaultAcc];
    }
    return accounts;
  },
  async saveAccount(account: Account): Promise<Account> {
    return this.save<Account>(KEYS.ACCOUNTS, 'accounts', account);
  },
  async deleteAccount(id: string): Promise<void> {
    return this.remove(KEYS.ACCOUNTS, 'accounts', id);
  },

  // Finance: Transactions
  async getTransactions(): Promise<Transaction[]> {
    return this.getAll<Transaction>(KEYS.TRANSACTIONS, 'transactions');
  },
  async saveTransaction(transaction: Transaction): Promise<Transaction> {
    // Update linked account balance when adding/editing transaction
    const accounts = await this.getAccounts();
    const transList = await this.getTransactions();
    const oldTrans = transList.find(t => t.id === transaction.id);
    
    // Find associated account
    const acc = accounts[0]; // Simple MVP default account
    if (acc) {
      if (oldTrans) {
        // Reverse old transaction effect
        acc.balance += (oldTrans.type === 'expense' ? oldTrans.amount : -oldTrans.amount);
      }
      // Apply new transaction effect
      acc.balance += (transaction.type === 'expense' ? -transaction.amount : transaction.amount);
      await this.saveAccount(acc);
    }

    return this.save<Transaction>(KEYS.TRANSACTIONS, 'transactions', transaction);
  },
  async deleteTransaction(id: string): Promise<void> {
    const transList = await this.getTransactions();
    const transaction = transList.find(t => t.id === id);
    if (transaction) {
      const accounts = await this.getAccounts();
      const acc = accounts[0];
      if (acc) {
        // Reverse deleted transaction effect
        acc.balance += (transaction.type === 'expense' ? transaction.amount : -transaction.amount);
        await this.saveAccount(acc);
      }
    }
    return this.remove(KEYS.TRANSACTIONS, 'transactions', id);
  },

  // Finance: Assets
  async getAssets(): Promise<Asset[]> {
    return this.getAll<Asset>(KEYS.ASSETS, 'assets');
  },
  async saveAsset(asset: Asset): Promise<Asset> {
    return this.save<Asset>(KEYS.ASSETS, 'assets', asset);
  },
  async deleteAsset(id: string): Promise<void> {
    return this.remove(KEYS.ASSETS, 'assets', id);
  },

  // Body: Measurements
  async getMeasurements(): Promise<Measurement[]> {
    return this.getAll<Measurement>(KEYS.MEASUREMENTS, 'measurements');
  },
  async saveMeasurement(measurement: Measurement): Promise<Measurement> {
    return this.save<Measurement>(KEYS.MEASUREMENTS, 'measurements', measurement);
  },
  async deleteMeasurement(id: string): Promise<void> {
    return this.remove(KEYS.MEASUREMENTS, 'measurements', id);
  },

  // Body: Workouts
  async getWorkouts(): Promise<Workout[]> {
    return this.getAll<Workout>(KEYS.WORKOUTS, 'workouts');
  },
  async saveWorkout(workout: Workout): Promise<Workout> {
    return this.save<Workout>(KEYS.WORKOUTS, 'workouts', workout);
  },
  async deleteWorkout(id: string): Promise<void> {
    return this.remove(KEYS.WORKOUTS, 'workouts', id);
  },

  // Body: Photos
  async getPhotos(): Promise<Photo[]> {
    return this.getAll<Photo>(KEYS.PHOTOS, 'photos');
  },
  async savePhoto(photo: Photo): Promise<Photo> {
    return this.save<Photo>(KEYS.PHOTOS, 'photos', photo);
  },
  async deletePhoto(id: string): Promise<void> {
    return this.remove(KEYS.PHOTOS, 'photos', id);
  },

  // Knowledge: Books
  async getBooks(): Promise<Book[]> {
    return this.getAll<Book>(KEYS.BOOKS, 'books');
  },
  async saveBook(book: Book): Promise<Book> {
    return this.save<Book>(KEYS.BOOKS, 'books', book);
  },
  async deleteBook(id: string): Promise<void> {
    return this.remove(KEYS.BOOKS, 'books', id);
  },

  // Knowledge: Reading Sessions
  async getReadingSessions(): Promise<ReadingSession[]> {
    return this.getAll<ReadingSession>(KEYS.READING_SESSIONS, 'reading_sessions');
  },
  async saveReadingSession(session: ReadingSession): Promise<ReadingSession> {
    return this.save<ReadingSession>(KEYS.READING_SESSIONS, 'reading_sessions', session);
  },
  async deleteReadingSession(id: string): Promise<void> {
    return this.remove(KEYS.READING_SESSIONS, 'reading_sessions', id);
  },

  // Knowledge: Recall Entries
  async getRecallEntries(): Promise<RecallEntry[]> {
    return this.getAll<RecallEntry>(KEYS.RECALL_ENTRIES, 'recall_entries');
  },
  async saveRecallEntry(entry: RecallEntry): Promise<RecallEntry> {
    return this.save<RecallEntry>(KEYS.RECALL_ENTRIES, 'recall_entries', entry);
  },
  async deleteRecallEntry(id: string): Promise<void> {
    return this.remove(KEYS.RECALL_ENTRIES, 'recall_entries', id);
  },

  // Habits: List
  async getHabits(): Promise<Habit[]> {
    const habits = await this.getAll<Habit>(KEYS.HABITS, 'habits');
    if (habits.length === 0) {
      const defaultHabits: Habit[] = [
        { id: generateUUID(), title: 'Sleep 8 Hours', icon: '🌙', frequency: 'daily', target: '8' },
        { id: generateUUID(), title: 'Drink 3L Water', icon: '💧', frequency: 'daily', target: '3' },
        { id: generateUUID(), title: 'Meditate 15m', icon: '🧘', frequency: 'daily', target: '15' },
        { id: generateUUID(), title: 'Read 30 minutes', icon: '📖', frequency: 'daily', target: '30' },
        { id: generateUUID(), title: 'Workout', icon: '🏋️', frequency: 'daily', target: '1' }
      ];
      for (const h of defaultHabits) {
        await this.saveHabit(h);
      }
      return defaultHabits;
    }
    return habits;
  },
  async saveHabit(habit: Habit): Promise<Habit> {
    return this.save<Habit>(KEYS.HABITS, 'habits', habit);
  },
  async deleteHabit(id: string): Promise<void> {
    return this.remove(KEYS.HABITS, 'habits', id);
  },

  // Habits: Habit Logs
  async getHabitLogs(): Promise<HabitLog[]> {
    return this.getAll<HabitLog>(KEYS.HABIT_LOGS, 'habit_logs');
  },
  async saveHabitLog(log: HabitLog): Promise<HabitLog> {
    return this.save<HabitLog>(KEYS.HABIT_LOGS, 'habit_logs', log);
  },
  async deleteHabitLog(id: string): Promise<void> {
    return this.remove(KEYS.HABIT_LOGS, 'habit_logs', id);
  },

  // Habits: Food Logs
  async getFoodLogs(): Promise<FoodLog[]> {
    return this.getAll<FoodLog>(KEYS.FOOD_LOGS, 'food_logs');
  },
  async saveFoodLog(log: FoodLog): Promise<FoodLog> {
    return this.save<FoodLog>(KEYS.FOOD_LOGS, 'food_logs', log);
  },
  async deleteFoodLog(id: string): Promise<void> {
    return this.remove(KEYS.FOOD_LOGS, 'food_logs', id);
  },

  // Habits: Sleep Logs
  async getSleepLogs(): Promise<SleepLog[]> {
    return this.getAll<SleepLog>(KEYS.SLEEP_LOGS, 'sleep_logs');
  },
  async saveSleepLog(log: SleepLog): Promise<SleepLog> {
    return this.save<SleepLog>(KEYS.SLEEP_LOGS, 'sleep_logs', log);
  },
  async deleteSleepLog(id: string): Promise<void> {
    return this.remove(KEYS.SLEEP_LOGS, 'sleep_logs', id);
  },

  // Health: Doctor Visits
  async getDoctorVisits(): Promise<DoctorVisit[]> {
    return this.getAll<DoctorVisit>(KEYS.DOCTOR_VISITS, 'doctor_visits');
  },
  async saveDoctorVisit(visit: DoctorVisit): Promise<DoctorVisit> {
    return this.save<DoctorVisit>(KEYS.DOCTOR_VISITS, 'doctor_visits', visit);
  },
  async deleteDoctorVisit(id: string): Promise<void> {
    return this.remove(KEYS.DOCTOR_VISITS, 'doctor_visits', id);
  },

  // Health: Vaccinations
  async getVaccinations(): Promise<Vaccination[]> {
    return this.getAll<Vaccination>(KEYS.VACCINATIONS, 'vaccinations');
  },
  async saveVaccination(vaccination: Vaccination): Promise<Vaccination> {
    return this.save<Vaccination>(KEYS.VACCINATIONS, 'vaccinations', vaccination);
  },
  async deleteVaccination(id: string): Promise<void> {
    return this.remove(KEYS.VACCINATIONS, 'vaccinations', id);
  },

  // Health: Medical Reports
  async getMedicalReports(): Promise<MedicalReport[]> {
    return this.getAll<MedicalReport>(KEYS.MEDICAL_REPORTS, 'medical_reports');
  },
  async saveMedicalReport(report: MedicalReport): Promise<MedicalReport> {
    return this.save<MedicalReport>(KEYS.MEDICAL_REPORTS, 'medical_reports', report);
  },
  async deleteMedicalReport(id: string): Promise<void> {
    return this.remove(KEYS.MEDICAL_REPORTS, 'medical_reports', id);
  },

  // User Profile
  async getUserProfile(): Promise<UserProfile | null> {
    const list = await this.getAll<UserProfile>(KEYS.USER_PROFILE, 'user_profiles');
    return list.length > 0 ? list[0] : null;
  },
  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const list = await this.getAll<UserProfile>(KEYS.USER_PROFILE, 'user_profiles');
    if (list.length > 0 && list[0].id) {
      profile.id = list[0].id;
    } else {
      if (!profile.id) profile.id = generateUUID();
    }
    return this.save<UserProfile>(KEYS.USER_PROFILE, 'user_profiles', profile);
  },

  // Finance: Expense Quotas (Budgets)
  async getExpenseQuotas(): Promise<ExpenseQuota[]> {
    return this.getAll<ExpenseQuota>(KEYS.EXPENSE_QUOTAS, 'expense_quotas');
  },
  async saveExpenseQuota(quota: ExpenseQuota): Promise<ExpenseQuota> {
    if (!quota.id) quota.id = generateUUID();
    return this.save<ExpenseQuota>(KEYS.EXPENSE_QUOTAS, 'expense_quotas', quota);
  },
  async deleteExpenseQuota(id: string): Promise<void> {
    return this.remove(KEYS.EXPENSE_QUOTAS, 'expense_quotas', id);
  },

  // =========================================================================
  // EXPORT, BACKUP & FULL SYNC SYNC ALL DATA
  // =========================================================================
  
  /**
   * Export all local data to a JSON string.
   */
  async exportJSON(): Promise<string> {
    const data: any = {};
    for (const [name, key] of Object.entries(KEYS)) {
      if (name === 'SYNC_ENABLED') continue;
      const raw = await AsyncStorage.getItem(key);
      data[name.toLowerCase()] = raw ? JSON.parse(raw) : [];
    }
    return JSON.stringify(data, null, 2);
  },

  /**
   * Import database from a JSON string.
   */
  async importJSON(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    for (const [name, key] of Object.entries(KEYS)) {
      if (name === 'SYNC_ENABLED') continue;
      const field = name.toLowerCase();
      if (data[field]) {
        await AsyncStorage.setItem(key, JSON.stringify(data[field]));
      }
    }
  },

  /**
   * Syncs all data in both directions: pushes local items to Supabase and pulls remote items.
   */
  async syncAllData(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) return { success: false, message: 'Sync already in progress' };
    this.isSyncing = true;

    try {
      const syncEnabled = await isSupabaseSyncEnabled();
      if (!syncEnabled) {
        this.isSyncing = false;
        return { success: false, message: 'Supabase sync is disabled in settings' };
      }

      // We will loop through each table and sync it
      const tables = [
        { key: KEYS.ACCOUNTS, table: 'accounts' },
        { key: KEYS.TRANSACTIONS, table: 'transactions' },
        { key: KEYS.ASSETS, table: 'assets' },
        { key: KEYS.MEASUREMENTS, table: 'measurements' },
        { key: KEYS.WORKOUTS, table: 'workouts' },
        { key: KEYS.PHOTOS, table: 'photos' },
        { key: KEYS.BOOKS, table: 'books' },
        { key: KEYS.READING_SESSIONS, table: 'reading_sessions' },
        { key: KEYS.RECALL_ENTRIES, table: 'recall_entries' },
        { key: KEYS.HABITS, table: 'habits' },
        { key: KEYS.HABIT_LOGS, table: 'habit_logs' },
        { key: KEYS.FOOD_LOGS, table: 'food_logs' },
        { key: KEYS.SLEEP_LOGS, table: 'sleep_logs' },
        { key: KEYS.DOCTOR_VISITS, table: 'doctor_visits' },
        { key: KEYS.VACCINATIONS, table: 'vaccinations' },
        { key: KEYS.MEDICAL_REPORTS, table: 'medical_reports' },
        { key: KEYS.USER_PROFILE, table: 'user_profiles' },
        { key: KEYS.EXPENSE_QUOTAS, table: 'expense_quotas' },
      ];

      for (const t of tables) {
        // 1. Pull remote data
        const remote = await customSupabaseApi.select<any>(t.table);
        const remoteIds = new Set(remote.map((r: any) => r.id));

        // 2. Load local data
        const local = await getLocal<any[]>(t.key, []);

        // 3. Push local-only data to remote
        const localsOnly = local.filter(l => !remoteIds.has(l.id));
        for (const item of localsOnly) {
          await customSupabaseApi.insert(t.table, item);
        }

        // 4. Merge remote data back to local
        const merged = [...remote];
        // Add any local items that we just pushed (or failed to push) to ensure no loss
        const mergedIds = new Set(merged.map((m: any) => m.id));
        for (const item of local) {
          if (!mergedIds.has(item.id)) {
            merged.push(item);
          }
        }
        
        await setLocal(t.key, merged);
      }

      this.isSyncing = false;
      return { success: true, message: 'Synchronization completed successfully' };
    } catch (error: any) {
      console.error('Data synchronization failed:', error);
      this.isSyncing = false;
      return { success: false, message: `Sync failed: ${error.message}` };
    }
  }
};
