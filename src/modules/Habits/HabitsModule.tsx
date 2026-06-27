import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { database, Habit, HabitLog, FoodLog, SleepLog, generateUUID } from '../../db/database';

const { width } = Dimensions.get('window');

const HABIT_ICONS = ['💧', '🌙', '🧘', '📖', '🏋️', '🍎', '🎨', '✍️', '🏃'];

export default function HabitsModule() {
  const { colors } = useTheme();

  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);

  const [activeTab, setActiveTab] = useState<'daily' | 'sleep' | 'food'>('daily');
  const [habitModalVisible, setHabitModalVisible] = useState(false);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [foodModalVisible, setFoodModalVisible] = useState(false);

  // Form State - Habit
  const [habitTitle, setHabitTitle] = useState('');
  const [habitIcon, setHabitIcon] = useState(HABIT_ICONS[0]);
  const [habitTarget, setHabitTarget] = useState('');
  const [habitFreq, setHabitFreq] = useState('daily');

  // Form State - Sleep
  const [bedTime, setBedTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepDate, setSleepDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State - Food
  const [mealType, setMealType] = useState<FoodLog['meal_type']>('Breakfast');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const [foodDate, setFoodDate] = useState(new Date().toISOString().slice(0, 10));

  const today = new Date().toISOString().slice(0, 10);

  // Load Data
  const loadData = async () => {
    try {
      const hList = await database.getHabits();
      const hlList = await database.getHabitLogs();
      const fList = await database.getFoodLogs();
      const sList = await database.getSleepLogs();

      setHabits(hList);
      setHabitLogs(hlList);
      setFoodLogs(fList.sort((a, b) => b.date.localeCompare(a.date)));
      setSleepLogs(sList.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddHabit = async () => {
    if (!habitTitle.trim()) return;

    const newHabit: Habit = {
      id: generateUUID(),
      title: habitTitle.trim(),
      icon: habitIcon,
      target: habitTarget.trim() || undefined,
      frequency: habitFreq,
    };

    await database.saveHabit(newHabit);
    setHabitTitle('');
    setHabitIcon(HABIT_ICONS[0]);
    setHabitTarget('');
    setHabitModalVisible(false);
    loadData();
  };

  const handleDeleteHabit = async (id: string) => {
    await database.deleteHabit(id);
    loadData();
  };

  const handleToggleHabit = async (habitId: string, isChecked: boolean) => {
    const existing = habitLogs.find(l => l.habit_id === habitId && l.date === today);
    const updatedLog: HabitLog = {
      id: existing ? existing.id : generateUUID(),
      habit_id: habitId,
      date: today,
      completed: isChecked,
    };
    await database.saveHabitLog(updatedLog);
    loadData();
  };

  const handleAddSleep = async () => {
    if (!sleepHours || isNaN(parseFloat(sleepHours))) return;

    const newSleep: SleepLog = {
      id: generateUUID(),
      date: sleepDate,
      bed_time: bedTime.trim() || undefined,
      wake_time: wakeTime.trim() || undefined,
      hours: parseFloat(sleepHours),
    };

    await database.saveSleepLog(newSleep);
    setSleepHours('');
    setBedTime('');
    setWakeTime('');
    setSleepDate(new Date().toISOString().slice(0, 10));
    setSleepModalVisible(false);
    loadData();
  };

  const handleDeleteSleep = async (id: string) => {
    await database.deleteSleepLog(id);
    loadData();
  };

  const handleAddFood = async () => {
    if (!calories || isNaN(parseFloat(calories))) return;

    const newFood: FoodLog = {
      id: generateUUID(),
      date: foodDate,
      meal_type: mealType,
      calories: parseFloat(calories),
      protein: protein ? parseFloat(protein) : 0,
      carbs: carbs ? parseFloat(carbs) : 0,
      fat: fat ? parseFloat(fat) : 0,
    };

    await database.saveFoodLog(newFood);
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFoodDate(new Date().toISOString().slice(0, 10));
    setFoodModalVisible(false);
    loadData();
  };

  const handleDeleteFood = async (id: string) => {
    await database.deleteFoodLog(id);
    loadData();
  };

  // Calculations
  const todayLogs = habitLogs.filter(l => l.date === today && l.completed);
  const completionRate = habits.length > 0 ? (todayLogs.length / habits.length) * 100 : 0;

  const averageSleep = sleepLogs.length > 0
    ? (sleepLogs.reduce((sum, s) => sum + s.hours, 0) / sleepLogs.length).toFixed(1)
    : '0.0';

  // Food totals for today
  const todayFood = foodLogs.filter(f => f.date === today);
  const totalCals = todayFood.reduce((sum, f) => sum + f.calories, 0);
  const totalProt = todayFood.reduce((sum, f) => sum + f.protein, 0);
  const totalCarbs = todayFood.reduce((sum, f) => sum + f.carbs, 0);
  const totalFat = todayFood.reduce((sum, f) => sum + f.fat, 0);

  // Generate 28-day Heatmap Calendar
  // Array of dates for the last 28 days
  const getHeatmapData = () => {
    const data = [];
    const dateObj = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(dateObj.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      // Find logs for this date
      const dateLogs = habitLogs.filter(l => l.date === dateStr && l.completed);
      const rate = habits.length > 0 ? dateLogs.length / habits.length : 0;
      data.push({ date: dateStr, rate });
    }
    return data;
  };

  const renderHeatmap = () => {
    const heatmap = getHeatmapData();
    return (
      <View style={[styles.heatmapContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Consistency Heatmap (28d)</Text>
        <View style={styles.heatmapGrid}>
          {heatmap.map((day, idx) => {
            // Calculate color intensity
            let boxColor = colors.border;
            if (day.rate > 0) {
              if (day.rate <= 0.3) boxColor = 'rgba(0, 209, 102, 0.2)';
              else if (day.rate <= 0.6) boxColor = 'rgba(0, 209, 102, 0.45)';
              else if (day.rate <= 0.9) boxColor = 'rgba(0, 209, 102, 0.7)';
              else boxColor = colors.primary; // 100% completed
            }
            return (
              <View
                key={idx}
                style={[styles.heatmapBox, { backgroundColor: boxColor }]}
              />
            );
          })}
        </View>
        <View style={styles.heatmapLegend}>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>Less</Text>
          <View style={[styles.heatmapBox, { backgroundColor: colors.border, marginHorizontal: 2 }]} />
          <View style={[styles.heatmapBox, { backgroundColor: 'rgba(0, 209, 102, 0.2)', marginHorizontal: 2 }]} />
          <View style={[styles.heatmapBox, { backgroundColor: 'rgba(0, 209, 102, 0.5)', marginHorizontal: 2 }]} />
          <View style={[styles.heatmapBox, { backgroundColor: colors.primary, marginHorizontal: 2 }]} />
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>More</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* OS Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(['daily', 'sleep', 'food'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textMuted },
                activeTab === tab && { fontWeight: '700' },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {activeTab === 'daily' && (
          <View>
            {/* KPI habits card */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Today's Completion</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>
                    {Math.round(completionRate)}%
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setHabitModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Add Habit</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Habits Logged</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.text }]}>
                    {todayLogs.length} of {habits.length} habits done
                  </Text>
                </View>
              </View>
            </View>

            {/* Heatmap Contribution Calendar */}
            {renderHeatmap()}

            {/* Checklist */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Today's Habits</Text>
              {habits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No habits configured yet.</Text>
                </View>
              ) : (
                habits.map(item => {
                  const isChecked = habitLogs.some(l => l.habit_id === item.id && l.date === today && l.completed);
                  return (
                    <View key={item.id} style={[styles.habitRowItem, { borderBottomColor: colors.border }]}>
                      <TouchableOpacity
                        style={styles.habitCheckArea}
                        onPress={() => handleToggleHabit(item.id, !isChecked)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: colors.primary },
                            isChecked && { backgroundColor: colors.primary },
                          ]}
                        >
                          {isChecked && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.habitCheckIcon}>{item.icon}</Text>
                        <View>
                          <Text
                            style={[
                              styles.habitCheckTitle,
                              { color: colors.text },
                              isChecked && { textDecorationLine: 'line-through', color: colors.textMuted },
                            ]}
                          >
                            {item.title}
                          </Text>
                          {item.target && (
                            <Text style={[styles.habitCheckTarget, { color: colors.textMuted }]}>
                              Target: {item.target} ({item.frequency})
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={() => handleDeleteHabit(item.id)} style={styles.deleteHabitButton}>
                        <Text style={{ color: colors.error, fontSize: 11 }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {activeTab === 'sleep' && (
          <View>
            {/* Sleep Stats */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Sleep Average (Last 7 Logs)</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{averageSleep} hrs</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setSleepModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Log Sleep</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sleep Ledger */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Sleep History</Text>
              {sleepLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No sleep logs yet.</Text>
                </View>
              ) : (
                sleepLogs.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.logDate, { color: colors.text }]}>{item.date}</Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.bed_time ? `Bed: ${item.bed_time} ` : ''}
                        {item.wake_time ? `Wake: ${item.wake_time}` : ''}
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={[styles.logValue, { color: colors.secondary }]}>{item.hours} hrs</Text>
                      <TouchableOpacity onPress={() => handleDeleteSleep(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 11, marginTop: 2 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'food' && (
          <View>
            {/* Calories KPI */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Today's Nutrition Intake</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{totalCals} kcal</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setFoodModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Log Meal</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiGrid}>
                <View style={styles.kpiGridCell}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Protein</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.primary }]}>{totalProt}g</Text>
                </View>
                <View style={styles.kpiGridCell}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Carbs</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.secondary }]}>{totalCarbs}g</Text>
                </View>
                <View style={styles.kpiGridCell}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Fats</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.text }]}>{totalFat}g</Text>
                </View>
              </View>
            </View>

            {/* Food logs */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Meal Logs</Text>
              {foodLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No meal logs logged today.</Text>
                </View>
              ) : (
                foodLogs.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.logDate, { color: colors.text, fontWeight: '700' }]}>
                        {item.meal_type}
                      </Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.date} • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={[styles.logValue, { color: colors.text }]}>{item.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteFood(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 11, marginTop: 2 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={habitModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Habit</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Habit Title"
              placeholderTextColor={colors.textMuted}
              value={habitTitle}
              onChangeText={setHabitTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Choose Icon</Text>
            <View style={styles.categoryPicker}>
              {HABIT_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    habitIcon === ic && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setHabitIcon(ic)}
                >
                  <Text style={{ fontSize: 18 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Daily Target (e.g. 3 Liters, 30 Minutes)"
              placeholderTextColor={colors.textMuted}
              value={habitTarget}
              onChangeText={setHabitTarget}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setHabitModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddHabit}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sleep Modal */}
      <Modal visible={sleepModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Sleep Duration</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Sleep Hours (e.g. 7.5)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={sleepHours}
              onChangeText={setSleepHours}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Bed Time (e.g. 23:00)"
                placeholderTextColor={colors.textMuted}
                value={bedTime}
                onChangeText={setBedTime}
              />
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Wake Time (e.g. 07:00)"
                placeholderTextColor={colors.textMuted}
                value={wakeTime}
                onChangeText={setWakeTime}
              />
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={sleepDate}
              onChangeText={setSleepDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setSleepModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddSleep}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Food Modal */}
      <Modal visible={foodModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Meal Intake</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Meal Type</Text>
            <View style={styles.categoryPicker}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    mealType === type && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Calories (kcal)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Protein (g)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
              />
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Carbs (g)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
              />
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Fat (g)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={fat}
                onChangeText={setFat}
              />
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={foodDate}
              onChangeText={setFoodDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setFoodModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddFood}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Log</Text>
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
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  logSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Habits Checklist
  habitRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  habitCheckArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  habitCheckIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  habitCheckTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitCheckTarget: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteHabitButton: {
    paddingHorizontal: 8,
  },
  // Heatmap Contribution Calendar
  heatmapContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  heatmapBox: {
    width: (width - 100) / 7,
    height: (width - 100) / 7,
    borderRadius: 4,
    margin: 2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfInput: {
    width: '48%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  thirdInput: {
    width: '31%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
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
