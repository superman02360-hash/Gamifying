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
} from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { database, Transaction, Account, Asset, generateUUID } from '../../db/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 56;
const CHART_HEIGHT = 160;

const CATEGORIES = [
  'Food', 'Transportation', 'Bills', 'Rent', 'Entertainment',
  'Education', 'Investment', 'Salary', 'Gift', 'Medical', 'Other'
];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'];

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  renewal: string;
}

interface Loan {
  id: string;
  name: string;
  principal: number;
  rate: number;
  termMonths: number;
  emi: number;
}

export default function FinanceModule() {
  const { colors } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'goals' | 'health'>('dashboard');

  // Core Database State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Sub-module State (Stored in AsyncStorage)
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Modals
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Forms
  const [amount, setAmount] = useState('');
  const [transType, setTransType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
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
  const [goalDeadline, setGoalDeadline] = useState('');

  // AI Insights
  const [insights, setInsights] = useState<string[]>([
    "Your emergency fund is currently covering 5.8 months of expenses.",
    "Food spending is 24% higher than last week. Consider cooking at home tonight.",
    "Unused ChatGPT subscription detected ($20/mo). Tap Subscriptions to cancel.",
    "Kudos! Your savings rate is at 32%, well ahead of your monthly wealth goal."
  ]);

  // Load Data
  const loadData = async () => {
    try {
      const accList = await database.getAccounts();
      const assList = await database.getAssets();
      const transList = await database.getTransactions();
      
      setAccounts(accList);
      setAssets(assList);
      setTransactions(transList.sort((a, b) => b.date.localeCompare(a.date)));

      if (accList.length > 0 && !accountId) {
        setAccountId(accList[0].id);
      }

      // Load Sub-module local data
      const storedGoals = await AsyncStorage.getItem('@LifeOS:goals');
      if (storedGoals) {
        setGoals(JSON.parse(storedGoals));
      } else {
        const defaultGoals: Goal[] = [
          { id: '1', name: 'Emergency Fund', target: 15000, current: 8500, deadline: '2026-12-31' },
          { id: '2', name: 'New Laptop', target: 2000, current: 650, deadline: '2026-09-30' }
        ];
        await AsyncStorage.setItem('@LifeOS:goals', JSON.stringify(defaultGoals));
        setGoals(defaultGoals);
      }

      const storedSubs = await AsyncStorage.getItem('@LifeOS:subscriptions');
      if (storedSubs) {
        setSubscriptions(JSON.parse(storedSubs));
      } else {
        const defaultSubs: Subscription[] = [
          { id: '1', name: 'Netflix Premium', cost: 15.49, renewal: '2026-07-15' },
          { id: '2', name: 'Spotify Duo', cost: 14.99, renewal: '2026-07-20' },
          { id: '3', name: 'Claude Pro', cost: 20.00, renewal: '2026-07-28' }
        ];
        await AsyncStorage.setItem('@LifeOS:subscriptions', JSON.stringify(defaultSubs));
        setSubscriptions(defaultSubs);
      }

      const storedLoans = await AsyncStorage.getItem('@LifeOS:loans');
      if (storedLoans) {
        setLoans(JSON.parse(storedLoans));
      } else {
        const defaultLoans: Loan[] = [
          { id: '1', name: 'Car Loan', principal: 18000, rate: 4.5, termMonths: 36, emi: 535.50 }
        ];
        await AsyncStorage.setItem('@LifeOS:loans', JSON.stringify(defaultLoans));
        setLoans(defaultLoans);
      }

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Goal Handler
  const handleSaveGoal = async () => {
    if (!goalName || !goalTarget || isNaN(parseFloat(goalTarget))) return;
    const newGoal: Goal = {
      id: generateUUID(),
      name: goalName,
      target: parseFloat(goalTarget),
      current: 0,
      deadline: goalDeadline || new Date().toISOString().slice(0, 10),
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await AsyncStorage.setItem('@LifeOS:goals', JSON.stringify(updated));
    setGoalName('');
    setGoalTarget('');
    setGoalDeadline('');
    setGoalModalVisible(false);
  };

  // Add Transaction Handler
  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;

    const newTrans: Transaction = {
      id: generateUUID(),
      date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(amount),
      type: transType,
      category,
      payment_method: paymentMethod,
      notes: notes.trim() + (tags ? ` [Tags: ${tags}]` : ''),
      account_id: accountId || accounts[0]?.id
    };

    await database.saveTransaction(newTrans);
    
    // Update local account balance
    const matchAcc = accounts.find(a => a.id === newTrans.account_id);
    if (matchAcc) {
      const updatedBalance = transType === 'income' 
        ? matchAcc.balance + newTrans.amount 
        : matchAcc.balance - newTrans.amount;
      await database.saveAccount({ ...matchAcc, balance: updatedBalance });
    }

    setAmount('');
    setNotes('');
    setTags('');
    setTransModalVisible(false);
    loadData();
  };

  // Transfer Handler
  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !transferAmount || isNaN(parseFloat(transferAmount))) return;
    const value = parseFloat(transferAmount);

    const fromAccObj = accounts.find(a => a.id === fromAccount);
    const toAccObj = accounts.find(a => a.id === toAccount);

    if (!fromAccObj || !toAccObj) return;

    // Deduct from sender
    await database.saveAccount({ ...fromAccObj, balance: fromAccObj.balance - value });
    // Add to receiver
    await database.saveAccount({ ...toAccObj, balance: toAccObj.balance + value });

    // Log double-entry transaction record
    const transRec: Transaction = {
      id: generateUUID(),
      date: new Date().toISOString().slice(0, 10),
      amount: value,
      type: 'expense',
      category: 'Transfer',
      payment_method: 'Bank Transfer',
      notes: `Transfer from ${fromAccObj.name} to ${toAccObj.name}`,
      account_id: fromAccount,
    };
    await database.saveTransaction(transRec);

    setTransferAmount('');
    setTransferModalVisible(false);
    loadData();
    Alert.alert("Success", "Transfer completed successfully!");
  };

  // Add Account Handler
  const handleAddAccount = async () => {
    if (!accName || !accBalance || isNaN(parseFloat(accBalance))) return;

    const newAcc = {
      id: generateUUID(),
      name: accName,
      balance: parseFloat(accBalance),
      type: accType,
      currency: 'USD',
    } as any;

    await database.saveAccount(newAcc);
    setAccName('');
    setAccBalance('');
    setAccountModalVisible(false);
    loadData();
  };

  // Dismiss Insight
  const handleDismissInsight = (index: number) => {
    setInsights(insights.filter((_, idx) => idx !== index));
  };

  // Calculations
  const cashBal = accounts.reduce((sum, a) => sum + a.balance, 0);
  const assetVal = assets.reduce((sum, a) => sum + a.current_value, 0);
  const netWorth = cashBal + assetVal;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthTrans = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthlyIncome = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

  // Safe-To-Spend
  const daysLeft = 31 - new Date().getDate() || 1;
  const safeToSpend = Math.max(0, (cashBal * 0.4) / daysLeft);

  // Financial Freedom Velocity
  const freedomTarget = 500000;
  const freedomProgress = Math.min(1, netWorth / freedomTarget);

  // Health Score Calculation
  const getHealthScore = () => {
    // 1. Savings Rate component (Target: 30%) -> Max 25pts
    const rateScore = Math.min(25, Math.max(0, (savingsRate / 30) * 25));
    // 2. Emergency Buffer component (Target: 6 months of expenses) -> Max 25pts
    const avgExpense = monthlyExpense || 1000;
    const monthsBuffer = cashBal / avgExpense;
    const bufferScore = Math.min(25, Math.max(0, (monthsBuffer / 6) * 25));
    // 3. Asset Allocation (Target: 40% in appreciative assets) -> Max 20pts
    const assetRatio = netWorth > 0 ? (assetVal / netWorth) * 20 : 0;
    // 4. Budget adherence (Max 30pts)
    const budgetAdherence = Math.max(0, 30 - (monthlyExpense > 3000 ? 15 : 0));
    return Math.round(rateScore + bufferScore + assetRatio + budgetAdherence);
  };

  const healthScore = getHealthScore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sub-Navigation Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'dashboard', label: '🏠 Hub' },
            { id: 'accounts', label: '💳 Accounts' },
            { id: 'transactions', label: '📝 Ledger' },
            { id: 'goals', label: '🎯 Targets' },
            { id: 'health', label: '⚡ Health' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && { borderBottomColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.textMuted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Render Tab Screens */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Net Worth Header Card */}
            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>NET WORTH</Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.trendBadge, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>▲ +$1,240.00 (1.2%)</Text>
                </View>
                <Text style={[styles.kpiLabel, { color: colors.textMuted, marginLeft: 8 }]}>This Month</Text>
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setTransModalVisible(true)}>
                <Text style={{ fontSize: 20 }}>💸</Text>
                <Text style={[styles.actionText, { color: colors.text }]}>Log Spend</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setTransferModalVisible(true)}>
                <Text style={{ fontSize: 20 }}>🔄</Text>
                <Text style={[styles.actionText, { color: colors.text }]}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setAccountModalVisible(true)}>
                <Text style={{ fontSize: 20 }}>🏦</Text>
                <Text style={[styles.actionText, { color: colors.text }]}>Add Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* Wealth Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Daily Safe-to-Spend */}
              <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>SAFE TO SPEND</Text>
                <Text style={[styles.statsValue, { color: colors.primary }]}>${safeToSpend.toFixed(2)}</Text>
                <Text style={[styles.statsSubtext, { color: colors.textMuted }]}>Allocated for today</Text>
              </View>

              {/* Financial Freedom Progress */}
              <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>FI PROGRESS</Text>
                <Text style={[styles.statsValue, { color: colors.secondary }]}>{(freedomProgress * 100).toFixed(1)}%</Text>
                <Text style={[styles.statsSubtext, { color: colors.textMuted }]}>Target: $500,000</Text>
              </View>
            </View>

            {/* AI Insights Carousel */}
            {insights.length > 0 && (
              <View style={styles.insightsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Opportunities</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
                  {insights.map((insight, idx) => (
                    <View key={idx} style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.insightHeader}>
                        <Text style={{ fontSize: 16 }}>💡</Text>
                        <TouchableOpacity onPress={() => handleDismissInsight(idx)}>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.insightBody, { color: colors.text }]}>{insight}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Money Timeline */}
            <View style={styles.timelineSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Money Timeline</Text>
              <View style={[styles.timelineContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {transactions.slice(0, 4).map((t, idx) => (
                  <View key={t.id} style={styles.timelineItem}>
                    <View style={[styles.timelineIndicator, { backgroundColor: t.type === 'income' ? colors.primary : colors.error }]} />
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, { color: colors.text }]}>
                        {t.type === 'income' ? 'Income Credited' : `Spent on ${t.category}`}
                      </Text>
                      <Text style={[styles.timelineMeta, { color: colors.textMuted }]}>
                        {t.date} • {t.notes || 'No description'}
                      </Text>
                    </View>
                    <Text style={[styles.timelineAmount, { color: t.type === 'income' ? colors.primary : colors.text }]}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
                {transactions.length === 0 && (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>Your financial journey log is empty.</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: Accounts & Assets */}
        {activeTab === 'accounts' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallets & Accounts</Text>
            {accounts.map(acc => (
              <View key={acc.id} style={[styles.rowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{acc.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{(acc as any).type?.toUpperCase() || 'BANK'}</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.text }]}>${acc.balance.toFixed(2)}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Appreciative Assets</Text>
            {assets.map(asset => (
              <View key={asset.id} style={[styles.rowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{asset.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{asset.asset_type}</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.primary }]}>${asset.current_value.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab 3: Transactions Ledger */}
        {activeTab === 'transactions' && (
          <View>
            <View style={styles.ledgerHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
              <TouchableOpacity onPress={() => setTransModalVisible(true)} style={[styles.miniBtn, { backgroundColor: colors.primaryContainer }]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>+ New</Text>
              </TouchableOpacity>
            </View>

            {transactions.map(t => (
              <View key={t.id} style={[styles.ledgerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.ledgerLeft}>
                  <Text style={[styles.ledgerCategory, { color: colors.text }]}>{t.category}</Text>
                  <Text style={[styles.ledgerNotes, { color: colors.textMuted }]}>{t.notes || 'Logged expense'}</Text>
                  <Text style={[styles.ledgerDate, { color: colors.textMuted }]}>{t.date}</Text>
                </View>
                <View style={styles.ledgerRight}>
                  <Text style={[styles.ledgerAmount, { color: t.type === 'income' ? colors.primary : colors.error }]}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>{t.payment_method}</Text>
                </View>
              </View>
            ))}

            {transactions.length === 0 && (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 40 }}>No transactions logged yet.</Text>
            )}
          </View>
        )}

        {/* Tab 4: Goals, Subscriptions & Loans */}
        {activeTab === 'goals' && (
          <View>
            <View style={styles.ledgerHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Goals</Text>
              <TouchableOpacity onPress={() => setGoalModalVisible(true)} style={[styles.miniBtn, { backgroundColor: colors.primaryContainer }]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>+ Goal</Text>
              </TouchableOpacity>
            </View>

            {goals.map(goal => {
              const progress = Math.min(1, goal.current / goal.target);
              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.goalHeader}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{goal.name}</Text>
                    <Text style={[styles.rowValue, { color: colors.text }]}>${goal.current} / ${goal.target}</Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.background }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={[styles.goalMeta, { color: colors.textMuted }]}>Deadline: {goal.deadline}</Text>
                </View>
              );
            })}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Active Subscriptions</Text>
            {subscriptions.map(sub => (
              <View key={sub.id} style={[styles.rowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{sub.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>Next renewal: {sub.renewal}</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.error }]}>-${sub.cost.toFixed(2)}/mo</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>EMIs & Active Loans</Text>
            {loans.map(loan => (
              <View key={loan.id} style={[styles.rowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{loan.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{loan.rate}% Interest • {loan.termMonths} Months</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.text }]}>${loan.emi.toFixed(2)}/mo</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab 5: Health & Gamification */}
        {activeTab === 'health' && (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.sectionTitle, { color: colors.text, alignSelf: 'flex-start' }]}>Financial Health Score</Text>
            
            {/* Score Ring */}
            <View style={styles.scoreContainer}>
              <Svg width="180" height="180" viewBox="0 0 180 180">
                <Circle cx="90" cy="90" r="70" stroke={colors.border} strokeWidth="12" fill="none" />
                <Circle
                  cx="90"
                  cy="90"
                  r="70"
                  stroke={colors.primary}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - healthScore / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                />
                <SvgText
                  x="90"
                  y="95"
                  textAnchor="middle"
                  fontSize="38"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {healthScore}
                </SvgText>
                <SvgText
                  x="90"
                  y="125"
                  textAnchor="middle"
                  fontSize="12"
                  fill={colors.textMuted}
                >
                  Score: /100
                </SvgText>
              </Svg>
            </View>

            <View style={[styles.healthMetrics, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.healthHeading, { color: colors.text }]}>Performance Ratings</Text>
              
              <View style={styles.metricRow}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Savings Rate:</Text>
                <Text style={[styles.metricVal, { color: savingsRate > 20 ? colors.primary : colors.error }]}>
                  {savingsRate > 20 ? 'Optimal' : 'Needs Work'}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Emergency Buffer:</Text>
                <Text style={[styles.metricVal, { color: cashBal > 5000 ? colors.primary : colors.error }]}>
                  {cashBal > 5000 ? 'Secure' : 'Insufficient'}
                </Text>
              </View>
            </View>

            {/* Achievement Badges */}
            <Text style={[styles.sectionTitle, { color: colors.text, alignSelf: 'flex-start', marginTop: 24 }]}>Unlocked Achievements</Text>
            <View style={styles.badgesContainer}>
              <View style={[styles.badgeItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 24 }}>🛡️</Text>
                <Text style={[styles.badgeName, { color: colors.text }]}>Safe & Secure</Text>
                <Text style={[styles.badgeSub, { color: colors.textMuted }]}>Emergency buffer met</Text>
              </View>
              <View style={[styles.badgeItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 24 }}>📈</Text>
                <Text style={[styles.badgeName, { color: colors.text }]}>Asset Builder</Text>
                <Text style={[styles.badgeSub, { color: colors.textMuted }]}>First asset logged</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Add Spend */}
      <Modal visible={transModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Transaction</Text>
            
            <View style={styles.typeToggle}>
              <TouchableOpacity style={[styles.toggleBtn, transType === 'expense' && { backgroundColor: colors.primaryContainer }]} onPress={() => setTransType('expense')}>
                <Text style={{ color: transType === 'expense' ? colors.primary : colors.textMuted }}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, transType === 'income' && { backgroundColor: colors.primaryContainer }]} onPress={() => setTransType('income')}>
                <Text style={{ color: transType === 'income' ? colors.primary : colors.textMuted }}>Income</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Amount ($)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TextInput
              placeholder="Description/Notes"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
            />

            <TextInput
              placeholder="Tags (comma-separated)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={tags}
              onChangeText={setTags}
            />

            <View style={styles.pickerRow}>
              {CATEGORIES.slice(0, 4).map(cat => (
                <TouchableOpacity key={cat} style={[styles.chip, category === cat && { backgroundColor: colors.primary }]} onPress={() => setCategory(cat)}>
                  <Text style={{ color: category === cat ? '#fff' : colors.text, fontSize: 12 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btnCancel, { borderColor: colors.border }]} onPress={() => setTransModalVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.primary }]} onPress={handleAddTransaction}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Transfer */}
      <Modal visible={transferModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Double-Entry Transfer</Text>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FROM WALLET</Text>
            <View style={styles.pickerRow}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[styles.chip, fromAccount === acc.id && { backgroundColor: colors.primary }]} onPress={() => setFromAccount(acc.id)}>
                  <Text style={{ color: fromAccount === acc.id ? '#fff' : colors.text, fontSize: 11 }}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>TO WALLET</Text>
            <View style={styles.pickerRow}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[styles.chip, toAccount === acc.id && { backgroundColor: colors.primary }]} onPress={() => setToAccount(acc.id)}>
                  <Text style={{ color: toAccount === acc.id ? '#fff' : colors.text, fontSize: 11 }}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Amount to Transfer ($)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, marginTop: 16 }]}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btnCancel, { borderColor: colors.border }]} onPress={() => setTransferModalVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.primary }]} onPress={handleTransfer}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Execute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Account */}
      <Modal visible={accountModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Account</Text>

            <TextInput
              placeholder="Account Name (e.g. Chase Bank)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={accName}
              onChangeText={setAccName}
            />

            <TextInput
              placeholder="Opening Balance ($)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={accBalance}
              onChangeText={setAccBalance}
            />

            <View style={styles.pickerRow}>
              {['bank', 'credit_card', 'cash'].map(type => (
                <TouchableOpacity key={type} style={[styles.chip, accType === type && { backgroundColor: colors.primary }]} onPress={() => setAccType(type as any)}>
                  <Text style={{ color: accType === type ? '#fff' : colors.text, fontSize: 12 }}>{type.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btnCancel, { borderColor: colors.border }]} onPress={() => setAccountModalVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.primary }]} onPress={handleAddAccount}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Goal */}
      <Modal visible={goalModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Wealth Goal</Text>

            <TextInput
              placeholder="Goal Name (e.g., Vacation)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={goalName}
              onChangeText={setGoalName}
            />

            <TextInput
              placeholder="Target Amount ($)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={goalTarget}
              onChangeText={setGoalTarget}
            />

            <TextInput
              placeholder="Deadline (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={goalDeadline}
              onChangeText={setGoalDeadline}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btnCancel, { borderColor: colors.border }]} onPress={() => setGoalModalVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.primary }]} onPress={handleSaveGoal}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create</Text>
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
  tabBar: {
    height: 48,
    borderBottomWidth: 0.5,
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  kpiCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  kpiLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    marginVertical: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    height: 72,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 4,
  },
  statsSubtext: {
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightsScroll: {
    paddingRight: 20,
  },
  insightCard: {
    width: 240,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timelineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  timelineAmount: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 10,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ledgerRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ledgerLeft: {
    flex: 1,
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  ledgerNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerDate: {
    fontSize: 9,
    marginTop: 4,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  goalCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalMeta: {
    fontSize: 9,
  },
  scoreContainer: {
    height: 180,
    width: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  healthMetrics: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  healthHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  badgeItem: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  badgeSub: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(128,128,128,0.3)',
    marginRight: 8,
    marginBottom: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  btnSave: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
