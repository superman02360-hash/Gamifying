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
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { database, Transaction, Account, Asset, generateUUID } from '../../db/database';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 56;
const CHART_HEIGHT = 160;

const CATEGORIES = [
  'Food', 'Transportation', 'Bills', 'Rent', 'Entertainment',
  'Education', 'Investment', 'Salary', 'Gift', 'Medical', 'Other'
];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'];

export default function FinanceModule() {
  const { colors } = useTheme();

  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);

  // Form State - Transaction
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State - Asset
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [assetType, setAssetType] = useState('Investment');

  // Load Data
  const loadData = async () => {
    try {
      const accList = await database.getAccounts();
      const assList = await database.getAssets();
      const transList = await database.getTransactions();
      
      setAccounts(accList);
      setAssets(assList);
      
      // Sort transactions by date descending
      setTransactions(transList.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;

    const newTrans: Transaction = {
      id: generateUUID(),
      date,
      amount: parseFloat(amount),
      type,
      category,
      payment_method: paymentMethod,
      notes: notes.trim(),
      account_id: accounts[0]?.id // Attach to default account
    };

    await database.saveTransaction(newTrans);
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().slice(0, 10));
    setModalVisible(false);
    loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await database.deleteTransaction(id);
    loadData();
  };

  const handleAddAsset = async () => {
    if (!assetName || !assetValue || isNaN(parseFloat(assetValue))) return;

    const newAsset: Asset = {
      id: generateUUID(),
      name: assetName,
      current_value: parseFloat(assetValue),
      asset_type: assetType,
    };

    await database.saveAsset(newAsset);
    setAssetName('');
    setAssetValue('');
    setAssetModalVisible(false);
    loadData();
  };

  const handleDeleteAsset = async (id: string) => {
    await database.deleteAsset(id);
    loadData();
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

  // Chart Data: Category Spending Breakdown
  const categorySpending = CATEGORIES.reduce((acc, cat) => {
    const sum = transactions
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
    if (sum > 0) acc.push({ category: cat, amount: sum });
    return acc;
  }, [] as { category: string; amount: number }[]).sort((a, b) => b.amount - a.amount);

  // SVG Line Chart: Net Worth Trend (Simulated historical data from current logs)
  const renderNetWorthChart = () => {
    // Generate trend: start from baseline and build up over transactions
    // Sort transactions ascending to recreate history
    const sortedTrans = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let runningNetWorth = netWorth;
    const historyPoints: number[] = [runningNetWorth];
    
    // Step back in time
    for (let i = sortedTrans.length - 1; i >= 0; i--) {
      const t = sortedTrans[i];
      if (t.type === 'income') {
        runningNetWorth -= t.amount;
      } else {
        runningNetWorth += t.amount;
      }
      historyPoints.unshift(runningNetWorth);
    }

    const pointsToDraw = historyPoints.slice(-6); // Last 6 points
    if (pointsToDraw.length < 2) {
      // Pad with dummy points if fresh
      pointsToDraw.unshift(netWorth * 0.9, netWorth * 0.95);
    }

    const max = Math.max(...pointsToDraw) * 1.1 || 1000;
    const min = Math.min(...pointsToDraw) * 0.9 || 0;
    const range = (max - min) || 1;

    // Convert to SVG points
    const stepX = CHART_WIDTH / (pointsToDraw.length - 1);
    const coordinates = pointsToDraw.map((val, idx) => {
      const x = idx * stepX;
      const y = CHART_HEIGHT - 20 - ((val - min) / range) * (CHART_HEIGHT - 40);
      return { x, y, val };
    });

    const pathData = coordinates.reduce(
      (path, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
      ''
    );

    const areaData = `${pathData} L ${coordinates[coordinates.length - 1].x} ${CHART_HEIGHT - 20} L ${coordinates[0].x} ${CHART_HEIGHT - 20} Z`;

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Net Worth Growth Trend</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          {/* Grid lines */}
          <Line x1="0" y1={CHART_HEIGHT - 20} x2={CHART_WIDTH} y2={CHART_HEIGHT - 20} stroke={colors.border} strokeWidth="1" />
          <Line x1="0" y1={CHART_HEIGHT / 2} x2={CHART_WIDTH} y2={CHART_HEIGHT / 2} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" />
          <Line x1="0" y1="20" x2={CHART_WIDTH} y2="20" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" />

          {/* Area */}
          <Path d={areaData} fill="url(#areaGrad)" />
          {/* Line */}
          <Path d={pathData} fill="none" stroke={colors.primary} strokeWidth="2.5" />
          {/* Labels & Dots */}
          {coordinates.map((pt, idx) => (
            <React.Fragment key={idx}>
              <Rect
                x={pt.x - 3}
                y={pt.y - 3}
                width="6"
                height="6"
                rx="3"
                fill={colors.surface}
                stroke={colors.primary}
                strokeWidth="1.5"
              />
              {idx === coordinates.length - 1 || idx === 0 ? (
                <SvgText
                  x={pt.x + (idx === 0 ? 5 : -40)}
                  y={pt.y - 8}
                  fontSize="9"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  ${Math.round(pt.val)}
                </SvgText>
              ) : null}
            </React.Fragment>
          ))}
        </Svg>
      </View>
    );
  };

  // SVG Bar Chart: Expenses Category Breakdown
  const renderCategoryChart = () => {
    if (categorySpending.length === 0) return null;
    const data = categorySpending.slice(0, 4); // Limit to top 4 categories
    const maxVal = Math.max(...data.map(d => d.amount)) || 100;
    const barWidth = 40;
    const barGap = (CHART_WIDTH - (data.length * barWidth)) / (data.length + 1);

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Top Spending Breakdown</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Line x1="0" y1={CHART_HEIGHT - 25} x2={CHART_WIDTH} y2={CHART_HEIGHT - 25} stroke={colors.border} strokeWidth="1" />
          {data.map((item, idx) => {
            const x = barGap + idx * (barWidth + barGap);
            const scaledHeight = (item.amount / maxVal) * (CHART_HEIGHT - 60);
            const y = CHART_HEIGHT - 25 - scaledHeight;

            return (
              <React.Fragment key={idx}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={scaledHeight}
                  rx="6"
                  fill={colors.secondary}
                />
                {/* Value Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={colors.text}
                >
                  ${Math.round(item.amount)}
                </SvgText>
                {/* Category Name */}
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT - 10}
                  fontSize="9"
                  textAnchor="middle"
                  fill={colors.textMuted}
                >
                  {item.category.slice(0, 5)}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* KPI Panel */}
        <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.kpiRow}>
            <View>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Net Worth</Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>${netWorth.toFixed(2)}</Text>
            </View>
            <View style={styles.badgeContainer}>
              <TouchableOpacity
                style={[styles.miniButton, { backgroundColor: colors.primaryContainer }]}
                onPress={() => setAssetModalVisible(true)}
              >
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>+ Asset</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />

          <View style={styles.kpiGrid}>
            <View style={styles.kpiGridCell}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Cash Balance</Text>
              <Text style={[styles.kpiSubValue, { color: colors.text }]}>${cashBal.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiGridCell}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Assets Value</Text>
              <Text style={[styles.kpiSubValue, { color: colors.text }]}>${assetVal.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />

          <View style={styles.kpiGrid}>
            <View style={styles.kpiGridCell}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Monthly Income</Text>
              <Text style={[styles.kpiSubValue, { color: colors.primary }]}>+${monthlyIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiGridCell}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Monthly Spend</Text>
              <Text style={[styles.kpiSubValue, { color: colors.error }]}>-${monthlyExpense.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiGridCell}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Savings Rate</Text>
              <Text style={[styles.kpiSubValue, { color: colors.secondary }]}>
                {savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : '0%'}
              </Text>
            </View>
          </View>
        </View>

        {/* Charts */}
        {renderNetWorthChart()}
        {renderCategoryChart()}

        {/* Assets List */}
        {assets.length > 0 && (
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assets holdings</Text>
            {assets.map(item => (
              <View key={item.id} style={[styles.assetRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.assetName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.assetTypeLabel, { color: colors.textMuted }]}>{item.asset_type}</Text>
                </View>
                <View style={styles.assetRight}>
                  <Text style={[styles.assetValueText, { color: colors.text }]}>${item.current_value.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteAsset(item.id)} style={styles.deleteAssetButton}>
                    <Text style={{ color: colors.error, fontSize: 11 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Ledger */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ledger</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>Add Log</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ color: colors.textMuted }}>No transactions logged yet.</Text>
            </View>
          ) : (
            <FlatList
              data={transactions.slice(0, 15)} // Show last 15
              scrollEnabled={false}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.ledgerLeft}>
                    <Text style={[styles.ledgerCategory, { color: colors.text }]}>{item.category}</Text>
                    <Text style={[styles.ledgerSubText, { color: colors.textMuted }]}>
                      {item.date} • {item.payment_method || 'Cash'} {item.notes ? `• ${item.notes}` : ''}
                    </Text>
                  </View>
                  <View style={styles.ledgerRight}>
                    <Text
                      style={[
                        styles.ledgerAmount,
                        { color: item.type === 'income' ? colors.primary : colors.error },
                      ]}
                    >
                      {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteTransaction(item.id)} style={styles.deleteButton}>
                      <Text style={{ color: colors.error, fontSize: 11 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Transaction</Text>

            {/* Toggle Type */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  type === 'expense' && { backgroundColor: colors.error },
                ]}
                onPress={() => {
                  setType('expense');
                  setCategory(CATEGORIES[0]);
                }}
              >
                <Text style={[styles.toggleText, type === 'expense' && { color: '#fff' }]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  type === 'income' && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  setType('income');
                  setCategory('Salary'); // Default category for income
                }}
              >
                <Text style={[styles.toggleText, type === 'income' && { color: '#fff' }]}>Income</Text>
              </TouchableOpacity>
            </View>

            {/* Input Fields */}
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Amount ($)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Category selection */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryPicker}>
              {type === 'expense'
                ? CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerChip,
                        { borderColor: colors.border },
                        category === cat && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={{ color: colors.text, fontSize: 12 }}>{cat}</Text>
                    </TouchableOpacity>
                  ))
                : ['Salary', 'Gift', 'Investment', 'Other'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerChip,
                        { borderColor: colors.border },
                        category === cat && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={{ color: colors.text, fontSize: 12 }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
            </View>

            {/* Payment Method */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.categoryPicker}>
              {PAYMENT_METHODS.map(pm => (
                <TouchableOpacity
                  key={pm}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    paymentMethod === pm && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setPaymentMethod(pm)}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{pm}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddTransaction}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Asset Modal */}
      <Modal visible={assetModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Asset holding</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Asset Name (e.g. Stocks account, Gold)"
              placeholderTextColor={colors.textMuted}
              value={assetName}
              onChangeText={setAssetName}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Current Value ($)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={assetValue}
              onChangeText={setAssetValue}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Asset Type</Text>
            <View style={styles.categoryPicker}>
              {['Cash', 'Investment', 'Real Estate', 'Crypto', 'Other'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    assetType === type && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setAssetType(type)}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setAssetModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddAsset}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
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
    padding: 16,
    paddingBottom: 40,
  },
  kpiContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  kpiDivider: {
    height: 0.5,
    marginVertical: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
  },
  kpiGridCell: {
    flex: 1,
  },
  kpiSubValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  miniButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chartContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  ledgerLeft: {
    flex: 1,
  },
  ledgerCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  ledgerSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 2,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetTypeLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteAssetButton: {
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E3E6EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  pickerChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingBottom: 16,
  },
  modalButton: {
    flex: 0.48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
