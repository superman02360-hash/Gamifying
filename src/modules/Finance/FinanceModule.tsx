import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  Alert,
  Image,
  BackHandler,
} from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { database, Transaction, Account, Asset, generateUUID, ExpenseQuota } from '../../db/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HomeIcon,
  TransactionsIcon,
  AccountsIcon,
  GoalsIcon,
  HealthScoreIcon,
} from '../../components/SVGIcons';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 90;

const CATEGORIES = ['All', 'Entertainment', 'Subscription', 'Food', 'Transportation'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'];

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

// Brand SVG Icons
const PayPalIcon = () => (
  <Svg width="38" height="38" viewBox="0 0 36 36" fill="none">
    <Circle cx="18" cy="18" r="18" fill="#F0F4FE" />
    <Path d="M15 11h5.5c1.4 0 2.5.3 3.1 1 .6.6.8 1.5.8 2.5 0 1.5-.6 2.8-1.8 3.5-1.2.7-2.6 1-4.2 1H16.5l-1.5 6h-2.5l3-12z" fill="#003087" />
    <Path d="M17.5 13.5h5.5c1.4 0 2.5.3 3.1 1 .6.6.8 1.5.8 2.5 0 1.5-.6 2.8-1.8 3.5-1.2.7-2.6 1-4.2 1H19l-1.5 6h-2.5l3-12z" fill="#0079C1" opacity="0.85" />
  </Svg>
);

const SpotifyIcon = () => (
  <Svg width="38" height="38" viewBox="0 0 36 36" fill="none">
    <Circle cx="18" cy="18" r="18" fill="#E8F9EE" />
    <Circle cx="18" cy="18" r="10" fill="#1DB954" />
    <Path d="M14 16c2-1 4.5-1 6.5 0M13.5 18.5c1.8-.8 3.8-.8 5.6 0M14.5 21c1.2-.6 2.6-.6 3.8 0" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" />
  </Svg>
);

const ClaudeIcon = () => (
  <Svg width="38" height="38" viewBox="0 0 36 36" fill="none">
    <Circle cx="18" cy="18" r="18" fill="#FFF2EB" />
    <Path d="M18 10v16M10 18h16M12.5 12.5l11 11M12.5 23.5l11-11" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MoneyIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Line x1="12" y1="18" x2="12" y2="18" />
    <Path d="M17 9h.01M17 15h.01" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const FoodIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
  </Svg>
);

const TransportIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <Circle cx="7" cy="17" r="2" fill="#2563EB" />
    <Circle cx="17" cy="17" r="2" fill="#2563EB" />
  </Svg>
);

const EntertainmentIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <Line x1="7" y1="2" x2="7" y2="22" />
    <Line x1="17" y1="2" x2="17" y2="22" />
    <Line x1="2" y1="12" x2="22" y2="12" />
    <Line x1="2" y1="7" x2="7" y2="7" />
    <Line x1="2" y1="17" x2="7" y2="17" />
    <Line x1="17" y1="17" x2="22" y2="17" />
    <Line x1="17" y1="7" x2="22" y2="7" />
  </Svg>
);

const UserAvatarSVG = () => (
  <Svg width="44" height="44" viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#E2E8F0" />
    <Circle cx="20" cy="14" r="6" fill="#64748B" />
    <Path d="M8 30c0-4.5 4.5-8 12-8s12 3.5 12 8" fill="#64748B" />
  </Svg>
);

const DefaultTransIcon = (cat: string) => {
  let IconComponent = <MoneyIcon />;
  if (cat.toLowerCase() === 'food') IconComponent = <FoodIcon />;
  if (cat.toLowerCase() === 'transportation') IconComponent = <TransportIcon />;
  if (cat.toLowerCase() === 'entertainment') IconComponent = <EntertainmentIcon />;
  return (
    <View style={styles.defaultIconBox}>
      {IconComponent}
    </View>
  );
};

export default function FinanceModule() {
  const { colors } = useTheme();

  // Profile State
  const [profileName, setProfileName] = useState('John');
  const [currentTime, setCurrentTime] = useState('');
  const [welcomeDate, setWelcomeDate] = useState('');

  // Clock Update
  useEffect(() => {
    const updateDateTime = () => {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hh}:${mm}`);

      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      setWelcomeDate(`${day} ${month} ${year}`);
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Active Tab View
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'accounts' | 'goals' | 'health'>('dashboard');

  // Transactions category filter chip
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Core Database lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [quotas, setQuotas] = useState<ExpenseQuota[]>([]);
  const [goalsTab, setGoalsTab] = useState<'savings' | 'budgets'>('savings');
  const [editQuotaModal, setEditQuotaModal] = useState(false);
  const [selectedQuotaCategory, setSelectedQuotaCategory] = useState('Food');
  const [quotaVal, setQuotaVal] = useState('');

  // Modals
  const [addTransModal, setAddTransModal] = useState(false);
  const [addAccModal, setAddAccModal] = useState(false);
  const [addGoalModal, setAddGoalModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);

  // Forms
  const [amount, setAmount] = useState('');
  const [transType, setTransType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('Debit Card');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');

  // Transfer Form
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Account Form
  const [accName, setAccName] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accType, setAccType] = useState<'bank' | 'credit_card' | 'cash'>('bank');

  // Goal Form
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  // Load Data
  const loadData = async () => {
    try {
      let accList = await database.getAccounts();
      let transList = await database.getTransactions();
      let assList = await database.getAssets();

      // Seed default transactions if empty to match screenshots
      if (transList.length === 0) {
        const seedTrans: Transaction[] = [
          {
            id: 't-1',
            date: '2026-05-27',
            amount: 23.12,
            type: 'expense',
            category: 'Food',
            payment_method: 'Debit Card',
            notes: 'Tartine Bakery Payment'
          },
          {
            id: 't-2',
            date: '2026-05-23',
            amount: 18.00,
            type: 'expense',
            category: 'Subscription',
            payment_method: 'Credit Card',
            notes: 'Spotify Yearly Subscription'
          },
          {
            id: 't-3',
            date: '2026-05-07',
            amount: 96.00,
            type: 'expense',
            category: 'Subscription',
            payment_method: 'Bank Transfer',
            notes: 'Claude monthly Subscription'
          }
        ];
        for (const t of seedTrans) {
          await database.saveTransaction(t);
        }
        transList = await database.getTransactions();
      }

      if (accList.length === 0) {
        const seedAccounts: Account[] = [
          { id: 'acc-1', name: 'Chase Bank', balance: 5420.00, currency: 'INR' },
          { id: 'acc-2', name: 'Visa Credit', balance: -850.00, currency: 'INR' }
        ];
        for (const a of seedAccounts) {
          await database.saveAccount(a);
        }
        accList = await database.getAccounts();
      }

      setAccounts(accList);
      setAssets(assList);
      setTransactions(transList.sort((a, b) => b.date.localeCompare(a.date)));

      if (accList.length > 0) {
        setAccountId(accList[0].id);
      }

      // Load goals
      const storedGoals = await AsyncStorage.getItem('@LifeOS:goals_v2');
      if (storedGoals) {
        setGoals(JSON.parse(storedGoals));
      } else {
        const defaultGoals = [
          { id: '1', name: 'Emergency Fund', target: 15000, current: 8500, deadline: '2026-12-31' }
        ];
        await AsyncStorage.setItem('@LifeOS:goals_v2', JSON.stringify(defaultGoals));
        setGoals(defaultGoals);
      }

      // Load user profile
      const profile = await database.getUserProfile();
      if (profile) {
        setProfileName(profile.name || 'John');
      }

      // Load quotas
      const storedQuotas = await database.getExpenseQuotas();
      setQuotas(storedQuotas);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleBackButton = () => {
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => backHandler.remove();
  }, [activeTab]);

  // Handlers
  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;

    const newTrans: Transaction = {
      id: generateUUID(),
      date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(amount),
      type: transType,
      category,
      payment_method: paymentMethod,
      notes: notes.trim(),
      account_id: accountId || accounts[0]?.id
    };

    await database.saveTransaction(newTrans);

    // Update balance
    const targetAcc = accounts.find(a => a.id === newTrans.account_id);
    if (targetAcc) {
      const updatedBal = transType === 'income' 
        ? targetAcc.balance + newTrans.amount 
        : targetAcc.balance - newTrans.amount;
      await database.saveAccount({ ...targetAcc, balance: updatedBal });
    }

    setAmount('');
    setNotes('');
    setAddTransModal(false);
    loadData();
  };

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !transferAmount || isNaN(parseFloat(transferAmount))) return;
    const value = parseFloat(transferAmount);

    const fromAcc = accounts.find(a => a.id === fromAccount);
    const toAcc = accounts.find(a => a.id === toAccount);

    if (!fromAcc || !toAcc) return;

    await database.saveAccount({ ...fromAcc, balance: fromAcc.balance - value });
    await database.saveAccount({ ...toAcc, balance: toAcc.balance + value });

    const transRec: Transaction = {
      id: generateUUID(),
      date: new Date().toISOString().slice(0, 10),
      amount: value,
      type: 'expense',
      category: 'Transfer',
      payment_method: 'Bank Transfer',
      notes: `Transfer from ${fromAcc.name} to ${toAcc.name}`,
      account_id: fromAccount,
    };
    await database.saveTransaction(transRec);

    setTransferAmount('');
    setTransferModal(false);
    loadData();
    Alert.alert("Success", "Transfer completed!");
  };

  const handleAddAccount = async () => {
    if (!accName || !accBalance || isNaN(parseFloat(accBalance))) return;

    const newAcc = {
      id: generateUUID(),
      name: accName,
      balance: parseFloat(accBalance),
      type: accType,
      currency: 'USD'
    } as any;

    await database.saveAccount(newAcc);
    setAccName('');
    setAccBalance('');
    setAddAccModal(false);
    loadData();
  };

  const handleSaveGoal = async () => {
    if (!goalName || !goalTarget || isNaN(parseFloat(goalTarget))) return;
    const newGoal: Goal = {
      id: generateUUID(),
      name: goalName,
      target: parseFloat(goalTarget),
      current: 0,
      deadline: new Date().toISOString().slice(0, 10)
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await AsyncStorage.setItem('@LifeOS:goals_v2', JSON.stringify(updated));
    setGoalName('');
    setGoalTarget('');
    setAddGoalModal(false);
  };

  const handleSaveQuota = async () => {
    if (!quotaVal || isNaN(parseFloat(quotaVal))) return;

    const existing = quotas.find(
      q => q.category.toLowerCase() === selectedQuotaCategory.toLowerCase() && q.month === currentMonth
    );

    const newQuota: ExpenseQuota = {
      id: existing?.id || '',
      category: selectedQuotaCategory,
      amount: parseFloat(quotaVal),
      month: currentMonth
    };

    await database.saveExpenseQuota(newQuota);
    setEditQuotaModal(false);
    loadData();
  };

  // Calculations
  const cashBal = accounts.reduce((sum, a) => sum + a.balance, 0);
  const assetVal = assets.reduce((sum, a) => sum + a.current_value, 0);
  const netWorth = cashBal + assetVal;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthTrans = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthlyExpense = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

  // Safe-To-Spend Daily (Cash Flow Surplus / Days Remaining)
  const daysLeft = 30 - new Date().getDate() || 1;
  const monthlySurplus = monthlyIncome - monthlyExpense;
  const safeToSpend = Math.max(0, monthlySurplus / daysLeft);

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    if (selectedCategoryFilter === 'All') return true;
    return t.category.toLowerCase() === selectedCategoryFilter.toLowerCase() || 
           (selectedCategoryFilter === 'Subscription' && t.notes?.toLowerCase().includes('subscription'));
  });

  // SVG Dot Matrix Chart Component (from screenshot)
  const renderDotMatrixChart = () => {
    const cols = 22;
    const rows = 6;
    const dotSpacingX = CHART_WIDTH / (cols - 1);
    const dotSpacingY = 48 / (rows - 1);
    
    // Peak height matrix matching the screenshot
    const heights = [1, 2, 1, 1, 3, 2, 1, 2, 4, 3, 1, 2, 1, 3, 5, 2, 4, 2, 1, 5, 3, 2];

    return (
      <View style={styles.dotMatrixContainer}>
        <Svg width={CHART_WIDTH} height={60}>
          {Array.from({ length: cols }).map((_, cIdx) => {
            const height = heights[cIdx % heights.length];
            return Array.from({ length: rows }).map((_, rIdx) => {
              const x = cIdx * dotSpacingX;
              const y = 52 - rIdx * dotSpacingY;
              const isFilled = rIdx < height;
              return (
                <Circle
                  key={`${cIdx}-${rIdx}`}
                  cx={x}
                  cy={y}
                  r={2.2}
                  fill={isFilled ? '#111827' : '#E5E7EB'}
                />
              );
            });
          })}
        </Svg>
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabelText}>Apr ₹2,250.23</Text>
          <Text style={styles.chartLabelText}>May <Text style={{ fontWeight: 'bold', color: '#111827' }}>₹4,230.00</Text></Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Scrollable Container */}
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 80 }]} keyboardShouldPersistTaps="handled">
        
        {/* Welcome Greeting Header (Exactly like screenshot) */}
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeDate}>{welcomeDate || '26 May 2026'}</Text>
            <Text style={styles.welcomeName}>Good morning, {profileName}!</Text>
            {currentTime ? (
              <Text style={styles.welcomeTime}>{currentTime}</Text>
            ) : null}
          </View>
          {/* Avatar frame */}
          <View style={styles.avatarFrame}>
            <UserAvatarSVG />
          </View>
        </View>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Total Spending White Card (Exactly like screenshot) */}
            <View style={styles.wealthCard}>
              <View style={styles.wealthCardHeader}>
                <View>
                  <View style={styles.spendingRow}>
                    <Text style={styles.spendingLabel}>Total Spending</Text>
                    <View style={styles.increaseChip}>
                      <Text style={styles.increaseChipText}>↗ +12,3%</Text>
                    </View>
                  </View>
                  <Text style={styles.spendingAmount}>₹4,230.00</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('health')}>
                  <Text style={styles.detailsLink}>Details</Text>
                </TouchableOpacity>
              </View>

              {/* Render Custom Dot Matrix Chart */}
              {renderDotMatrixChart()}
            </View>

            {/* Safe to Spend & Income widgets (from second screenshot) */}
            <View style={styles.widgetsGrid}>
              {/* Safe to Spend Ring Widget */}
              <View style={styles.widgetCard}>
                <Text style={styles.widgetLabel}>Safe to Spend</Text>
                <View style={styles.ringContainer}>
                  <Svg width="110" height="110" viewBox="0 0 110 110">
                    <Circle cx="55" cy="55" r="42" stroke="#E2E8F0" strokeWidth="8" fill="none" />
                    <Circle
                      cx="55"
                      cy="55"
                      r="42"
                      stroke="#00D166"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.72)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 55 55)"
                    />
                  </Svg>
                  <View style={styles.ringOverlay}>
                    <Text style={styles.ringValue}>₹{safeToSpend.toFixed(0)}</Text>
                    <Text style={styles.ringDays}>{daysLeft} days left</Text>
                  </View>
                </View>
              </View>

              {/* Income vs Expenses Stats widget */}
              <View style={styles.widgetCard}>
                <Text style={styles.widgetLabel}>Cash Summary</Text>
                
                <View style={styles.cashSumItem}>
                  <View style={[styles.cashSumDot, { backgroundColor: '#00D166' }]} />
                  <View>
                    <Text style={styles.cashSumLabel}>Income</Text>
                    <Text style={styles.cashSumVal}>₹{monthlyIncome.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.cashSumItem}>
                  <View style={[styles.cashSumDot, { backgroundColor: '#EF4444' }]} />
                  <View>
                    <Text style={styles.cashSumLabel}>Expenses</Text>
                    <Text style={styles.cashSumVal}>₹{monthlyExpense.toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.logSpendQuickBtn} onPress={() => setAddTransModal(true)}>
                  <Text style={styles.logSpendQuickText}>+ Log Spend</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Glimpse of Accounts */}
            <View style={styles.glimpseCard}>
              <View style={styles.glimpseHeader}>
                <Text style={styles.glimpseTitle}>My Wallets & Balances</Text>
                <TouchableOpacity onPress={() => setActiveTab('accounts')}>
                  <Text style={styles.glimpseLink}>Manage ➔</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.glimpseRow}>
                <Text style={styles.glimpseLabel}>Liquid Net Worth</Text>
                <Text style={[styles.glimpseValue, { color: '#00D166' }]}>₹{netWorth.toFixed(2)}</Text>
              </View>
              {accounts.slice(0, 2).map(acc => (
                <View key={acc.id} style={styles.glimpseSubRow}>
                  <Text style={styles.glimpseSubLabel}>{acc.name}</Text>
                  <Text style={styles.glimpseSubVal}>₹{acc.balance.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Glimpse of Goals */}
            <View style={styles.glimpseCard}>
              <View style={styles.glimpseHeader}>
                <Text style={styles.glimpseTitle}>Savings Wealth Targets</Text>
                <TouchableOpacity onPress={() => setActiveTab('goals')}>
                  <Text style={styles.glimpseLink}>Track ➔</Text>
                </TouchableOpacity>
              </View>
              {goals.slice(0, 1).map(goal => {
                const progress = Math.min(1, goal.current / goal.target);
                return (
                  <View key={goal.id} style={{ marginTop: 4 }}>
                    <View style={styles.glimpseGoalRow}>
                      <Text style={styles.glimpseGoalName}>{goal.name}</Text>
                      <Text style={styles.glimpseGoalProgress}>₹{goal.current} / ₹{goal.target}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>
                );
              })}
              {goals.length === 0 && (
                <Text style={styles.emptyText}>No goals set yet.</Text>
              )}
            </View>

            {/* Glimpse of Recent Transactions */}
            <View style={styles.glimpseCard}>
              <View style={styles.glimpseHeader}>
                <Text style={styles.glimpseTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => setActiveTab('transactions')}>
                  <Text style={styles.glimpseLink}>View All ➔</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 4 }}>
                {transactions.slice(0, 3).map(t => {
                  let isBrand = false;
                  let IconComponent = null;

                  if (t.notes?.toLowerCase().includes('spotify')) {
                    isBrand = true;
                    IconComponent = <SpotifyIcon />;
                  } else if (t.notes?.toLowerCase().includes('claude')) {
                    isBrand = true;
                    IconComponent = <ClaudeIcon />;
                  } else if (t.notes?.toLowerCase().includes('bakery') || t.notes?.toLowerCase().includes('paypal')) {
                    isBrand = true;
                    IconComponent = <PayPalIcon />;
                  }

                  return (
                    <View key={t.id} style={styles.transRow}>
                      <View style={styles.transLeft}>
                        {isBrand ? IconComponent : DefaultTransIcon(t.category)}
                        <View style={styles.transMeta}>
                          <Text style={styles.transTitle}>{t.notes || t.category}</Text>
                          <Text style={styles.transDate}>{t.date}</Text>
                        </View>
                      </View>
                      <Text style={[styles.transAmount, { color: t.type === 'income' ? '#00D166' : '#E11D48' }]}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
                {transactions.length === 0 && (
                  <Text style={styles.emptyText}>No transactions logged.</Text>
                )}
              </View>
            </View>

          </View>
        )}

        {/* Tab 2: Accounts & Balances */}
        {activeTab === 'accounts' && (
          <View>
            <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={styles.backHeaderBtn} activeOpacity={0.7}>
              <Text style={styles.backHeaderBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>
            <View style={styles.accountsHeader}>
              <Text style={styles.sectionHeading}>Wallets & Accounts</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.accountsAddBtn, { marginRight: 8 }]} onPress={() => setTransferModal(true)}>
                  <Text style={styles.accountsAddBtnText}>Transfer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.accountsAddBtn} onPress={() => setAddAccModal(true)}>
                  <Text style={styles.accountsAddBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {accounts.map(acc => (
              <View key={acc.id} style={styles.accountRow}>
                <View>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountType}>{(acc as any).type?.toUpperCase() || 'BANK'}</Text>
                </View>
                <Text style={styles.accountBalance}>₹{acc.balance.toFixed(2)}</Text>
              </View>
            ))}

            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Net Worth Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Liquid cash balance</Text>
                <Text style={styles.summaryValue}>₹{cashBal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Asset valuations</Text>
                <Text style={styles.summaryValue}>₹{assetVal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#111827' }]}>Net Worth valuation</Text>
                <Text style={[styles.summaryValue, { color: '#00D166', fontWeight: 'bold' }]}>₹{netWorth.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab 5: Transactions History */}
        {activeTab === 'transactions' && (
          <View>
            <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={styles.backHeaderBtn} activeOpacity={0.7}>
              <Text style={styles.backHeaderBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>

            <View style={styles.accountsHeader}>
              <Text style={styles.sectionHeading}>Transaction History</Text>
              <TouchableOpacity style={styles.accountsAddBtn} onPress={() => setAddTransModal(true)}>
                <Text style={styles.accountsAddBtnText}>+ Log</Text>
              </TouchableOpacity>
            </View>

            {/* Filter chips scroll list */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24, marginBottom: 16 }}
            >
              {CATEGORIES.map(chip => (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.filterChip,
                    selectedCategoryFilter === chip && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedCategoryFilter(chip)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategoryFilter === chip && styles.filterChipTextActive
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Transaction Lists */}
            <View style={styles.transactionsList}>
              {filteredTransactions.map(t => {
                let isBrand = false;
                let IconComponent = null;

                if (t.notes?.toLowerCase().includes('spotify')) {
                  isBrand = true;
                  IconComponent = <SpotifyIcon />;
                } else if (t.notes?.toLowerCase().includes('claude')) {
                  isBrand = true;
                  IconComponent = <ClaudeIcon />;
                } else if (t.notes?.toLowerCase().includes('bakery') || t.notes?.toLowerCase().includes('paypal')) {
                  isBrand = true;
                  IconComponent = <PayPalIcon />;
                }

                return (
                  <View key={t.id} style={styles.transRow}>
                    <View style={styles.transLeft}>
                      {isBrand ? IconComponent : DefaultTransIcon(t.category)}
                      <View style={styles.transMeta}>
                        <Text style={styles.transTitle}>{t.notes || t.category}</Text>
                        <Text style={styles.transDate}>{t.date}</Text>
                      </View>
                    </View>
                    <Text style={[styles.transAmount, { color: t.type === 'income' ? '#00D166' : '#E11D48' }]}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              {filteredTransactions.length === 0 && (
                <Text style={styles.emptyText}>No matching transaction found.</Text>
              )}
            </View>
          </View>
        )}

        {/* Tab 3: Goals & Budgets */}
        {activeTab === 'goals' && (
          <View>
            <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={styles.backHeaderBtn} activeOpacity={0.7}>
              <Text style={styles.backHeaderBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>

            {/* Segmented Control for Targets / Budgets */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  goalsTab === 'savings' && { backgroundColor: '#111827', borderColor: '#111827' }
                ]}
                onPress={() => setGoalsTab('savings')}
              >
                <Text style={[styles.segmentText, goalsTab === 'savings' && styles.segmentTextActive]}>Savings Goals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  goalsTab === 'budgets' && { backgroundColor: '#111827', borderColor: '#111827' }
                ]}
                onPress={() => setGoalsTab('budgets')}
              >
                <Text style={[styles.segmentText, goalsTab === 'budgets' && styles.segmentTextActive]}>Expense Budgets</Text>
              </TouchableOpacity>
            </View>

            {/* Option A: Savings Goals List */}
            {goalsTab === 'savings' && (
              <View>
                <View style={styles.accountsHeader}>
                  <Text style={styles.sectionHeading}>Active Wealth Targets</Text>
                  <TouchableOpacity style={styles.accountsAddBtn} onPress={() => setAddGoalModal(true)}>
                    <Text style={styles.accountsAddBtnText}>+ New</Text>
                  </TouchableOpacity>
                </View>

                {goals.map(goal => {
                  const progress = Math.min(1, goal.current / goal.target);
                  return (
                    <View key={goal.id} style={styles.goalCard}>
                      <View style={styles.goalRow}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Text style={styles.goalProgressVal}>₹{goal.current} / ₹{goal.target}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Option B: Expense budgets List */}
            {goalsTab === 'budgets' && (
              <View>
                <View style={styles.accountsHeader}>
                  <Text style={styles.sectionHeading}>Category Spending Quotas</Text>
                  <TouchableOpacity style={styles.accountsAddBtn} onPress={() => {
                    setQuotaVal('');
                    setSelectedQuotaCategory('Food');
                    setEditQuotaModal(true);
                  }}>
                    <Text style={styles.accountsAddBtnText}>+ Set Quota</Text>
                  </TouchableOpacity>
                </View>

                {/* Render categories progress bars */}
                {['Food', 'Entertainment', 'Subscription', 'Transportation', 'Other'].map(cat => {
                  const quota = quotas.find(q => q.category.toLowerCase() === cat.toLowerCase() && q.month === currentMonth);
                  const quotaAmount = quota ? quota.amount : 0;
                  
                  const categorySpent = monthTrans
                    .filter(t => t.category.toLowerCase() === cat.toLowerCase() && t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);

                  const progress = quotaAmount > 0 ? Math.min(1, categorySpent / quotaAmount) : 0;
                  const isExceeded = quotaAmount > 0 && categorySpent > quotaAmount;

                  return (
                    <View key={cat} style={styles.goalCard}>
                      <View style={styles.goalRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#111827' }}>{cat}</Text>
                          {isExceeded && (
                            <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                              <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 'bold' }}>EXCEEDED</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => {
                          setSelectedQuotaCategory(cat);
                          setQuotaVal(quotaAmount > 0 ? quotaAmount.toString() : '');
                          setEditQuotaModal(true);
                        }}>
                          <Text style={{ fontSize: 11, color: '#00D166', fontWeight: 'bold' }}>
                            {quotaAmount > 0 ? `₹${categorySpent.toFixed(0)} / ₹${quotaAmount.toFixed(0)} (Edit)` : `₹${categorySpent.toFixed(0)} (Set Limit)`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {quotaAmount > 0 ? (
                        <View style={[styles.progressTrack, { marginTop: 8 }]}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isExceeded ? '#EF4444' : '#00D166' }]} />
                        </View>
                      ) : (
                        <Text style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginTop: 4 }}>No limit set for this month</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab 4: Health Score & Achievements */}
        {activeTab === 'health' && (
          <View style={{ width: '100%' }}>
            <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={[styles.backHeaderBtn, { alignSelf: 'flex-start' }]} activeOpacity={0.7}>
              <Text style={styles.backHeaderBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center', width: '100%' }}>
            <Text style={[styles.sectionHeading, { alignSelf: 'flex-start' }]}>Financial Health Score</Text>
            
            <View style={styles.healthCircleBox}>
              <Svg width="160" height="160" viewBox="0 0 160 160">
                <Circle cx="80" cy="80" r="62" stroke="#E2E8F0" strokeWidth="10" fill="none" />
                <Circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#00D166"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 62}`}
                  strokeDashoffset={`${2 * Math.PI * 62 * (1 - 78 / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </Svg>
              <View style={styles.healthOverlay}>
                <Text style={styles.healthScoreVal}>78</Text>
                <Text style={styles.healthScoreMax}>Optimal</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Savings Rate</Text>
                <Text style={[styles.summaryValue, { color: '#00D166' }]}>+{savingsRate.toFixed(0)}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Emergency Fund Coverage</Text>
                <Text style={styles.summaryValue}>5.8 months</Text>
              </View>
            </View>
          </View>
        </View>
        )}

      </ScrollView>

      {/* Premium Finance Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={[styles.tabBarItem, activeTab === 'dashboard' && styles.tabBarItemActive]} onPress={() => setActiveTab('dashboard')}>
          <HomeIcon size={20} color={activeTab === 'dashboard' ? '#00D166' : '#94A3B8'} />
          <Text style={[styles.tabBarLabel, activeTab === 'dashboard' && styles.tabBarLabelActive]}>Hub</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tabBarItem, activeTab === 'transactions' && styles.tabBarItemActive]} onPress={() => setActiveTab('transactions')}>
          <TransactionsIcon size={20} color={activeTab === 'transactions' ? '#00D166' : '#94A3B8'} />
          <Text style={[styles.tabBarLabel, activeTab === 'transactions' && styles.tabBarLabelActive]}>Txns</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBarItem, activeTab === 'accounts' && styles.tabBarItemActive]} onPress={() => setActiveTab('accounts')}>
          <AccountsIcon size={20} color={activeTab === 'accounts' ? '#00D166' : '#94A3B8'} />
          <Text style={[styles.tabBarLabel, activeTab === 'accounts' && styles.tabBarLabelActive]}>Accounts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBarItem, activeTab === 'goals' && styles.tabBarItemActive]} onPress={() => setActiveTab('goals')}>
          <GoalsIcon size={20} color={activeTab === 'goals' ? '#00D166' : '#94A3B8'} />
          <Text style={[styles.tabBarLabel, activeTab === 'goals' && styles.tabBarLabelActive]}>Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBarItem, activeTab === 'health' && styles.tabBarItemActive]} onPress={() => setActiveTab('health')}>
          <HealthScoreIcon size={20} color={activeTab === 'health' ? '#00D166' : '#94A3B8'} />
          <Text style={[styles.tabBarLabel, activeTab === 'health' && styles.tabBarLabelActive]}>Health</Text>
        </TouchableOpacity>
      </View>

      {/* Modal: Log Spend */}
      <Modal visible={addTransModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Transaction</Text>
            
            {/* Segmented Control for Transaction Type */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  transType === 'expense' && { backgroundColor: '#EF4444', borderColor: '#EF4444' }
                ]}
                onPress={() => {
                  setTransType('expense');
                  setCategory('Food');
                }}
              >
                <Text style={[styles.segmentText, transType === 'expense' && styles.segmentTextActive]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  transType === 'income' && { backgroundColor: '#00D166', borderColor: '#00D166' }
                ]}
                onPress={() => {
                  setTransType('income');
                  setCategory('Salary');
                }}
              >
                <Text style={[styles.segmentText, transType === 'income' && styles.segmentTextActive]}>Income</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Amount (₹)"
              style={styles.modalInput}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TextInput
              placeholder="Merchant / Notes (e.g. Salary / Spotify)"
              style={styles.modalInput}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.pickerGrid}>
              {(transType === 'income' 
                ? ['Salary', 'Investment', 'Freelance', 'Other']
                : ['Food', 'Entertainment', 'Subscription', 'Transportation', 'Other']
              ).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalChip, category === cat && styles.modalChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.modalChipText, category === cat && styles.modalChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddTransModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddTransaction}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Wallet */}
      <Modal visible={addAccModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Wallet / Account</Text>

            <TextInput
              placeholder="Wallet Name (e.g. Chase Checkings)"
              style={styles.modalInput}
              value={accName}
              onChangeText={setAccName}
            />

            <TextInput
              placeholder="Opening Balance (₹)"
              style={styles.modalInput}
              keyboardType="numeric"
              value={accBalance}
              onChangeText={setAccBalance}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddAccModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddAccount}>
                <Text style={styles.modalSaveBtnText}>Add Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Transfer */}
      <Modal visible={transferModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transfer Money</Text>

            <Text style={styles.inputLabel}>FROM WALLET</Text>
            <View style={styles.pickerGrid}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[styles.modalChip, fromAccount === acc.id && styles.modalChipActive]} onPress={() => setFromAccount(acc.id)}>
                  <Text style={[styles.modalChipText, fromAccount === acc.id && styles.modalChipTextActive]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>TO WALLET</Text>
            <View style={styles.pickerGrid}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[styles.modalChip, toAccount === acc.id && styles.modalChipActive]} onPress={() => setToAccount(acc.id)}>
                  <Text style={[styles.modalChipText, toAccount === acc.id && styles.modalChipTextActive]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Transfer Amount (₹)"
              style={[styles.modalInput, { marginTop: 16 }]}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTransferModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleTransfer}>
                <Text style={styles.modalSaveBtnText}>Execute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Goal */}
      <Modal visible={addGoalModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Saving Target</Text>

            <TextInput
              placeholder="Goal Name (e.g. New Laptop)"
              style={styles.modalInput}
              value={goalName}
              onChangeText={setGoalName}
            />

            <TextInput
              placeholder="Target Amount (₹)"
              style={styles.modalInput}
              keyboardType="numeric"
              value={goalTarget}
              onChangeText={setGoalTarget}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddGoalModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveGoal}>
                <Text style={styles.modalSaveBtnText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Quota */}
      <Modal visible={editQuotaModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Spending Limit</Text>
            
            <Text style={[styles.inputLabel, { marginBottom: 6 }]}>CATEGORY</Text>
            <View style={[styles.pickerGrid, { marginBottom: 12 }]}>
              {['Food', 'Entertainment', 'Subscription', 'Transportation', 'Other'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalChip, selectedQuotaCategory === cat && styles.modalChipActive]}
                  onPress={() => setSelectedQuotaCategory(cat)}
                >
                  <Text style={[styles.modalChipText, selectedQuotaCategory === cat && styles.modalChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Monthly Limit (₹)"
              style={styles.modalInput}
              keyboardType="numeric"
              value={quotaVal}
              onChangeText={setQuotaVal}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditQuotaModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuota}>
                <Text style={styles.modalSaveBtnText}>Save Limit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Outfit_700Bold',
    marginTop: 2,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  wealthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  wealthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spendingLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  increaseChip: {
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  increaseChipText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Outfit_700Bold',
    marginTop: 6,
  },
  detailsLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  dotMatrixContainer: {
    marginTop: 8,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chartLabelText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  subNavigation: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  subTabText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  subTabBtnActive_Text: {},
  subTabTextActive: {
    color: '#0F172A',
  },
  widgetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  widgetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  widgetLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 110,
  },
  ringOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  ringDays: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
  cashSumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cashSumDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  cashSumLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  cashSumVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 1,
  },
  logSpendQuickBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  logSpendQuickText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00D166',
  },
  transactionsSection: {
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  filterScroll: {
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#111827',
    fontWeight: 'bold',
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  transRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8FAFC',
  },
  transLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transMeta: {
    marginLeft: 12,
  },
  transTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  transDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  transAmount: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  defaultIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountsAddBtn: {
    backgroundColor: '#E8F9EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accountsAddBtnText: {
    fontSize: 11,
    color: '#00D166',
    fontWeight: 'bold',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  accountType: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryDivider: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  goalProgressVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#00D166',
  },
  healthCircleBox: {
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 24,
  },
  healthOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  healthScoreVal: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  healthScoreMax: {
    fontSize: 10,
    color: '#00D166',
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
  },
  modalChipActive: {
    backgroundColor: '#E8F9EE',
    borderColor: '#00D166',
  },
  modalChipText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalChipTextActive: {
    color: '#00D166',
    fontWeight: 'bold',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  modalCancelBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  modalSaveBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
  },
  backHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  backHeaderBtnText: {
    fontSize: 12,
    color: '#00D166',
    fontWeight: 'bold',
  },
  welcomeTime: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
    zIndex: 1000,
    elevation: 10,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabBarItemActive: {
    backgroundColor: '#F8FAFC',
  },
  tabBarIcon: {
    fontSize: 20,
    color: '#94A3B8',
  },
  tabBarIconActive: {
    color: '#00D166',
  },
  tabBarLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tabBarLabelActive: {
    color: '#00D166',
  },
  glimpseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  glimpseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  glimpseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  glimpseLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D166',
  },
  glimpseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  glimpseLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  glimpseValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  glimpseSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  },
  glimpseSubLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  glimpseSubVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  glimpseGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  glimpseGoalName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  glimpseGoalProgress: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
