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
  Image,
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { database, Measurement, Workout, Photo, generateUUID } from '../../db/database';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 56;
const CHART_HEIGHT = 150;

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull-Ups',
  'Barbell Row', 'Bicep Curls', 'Tricep Pushdowns', 'Leg Press'
];

export default function BodyModule() {
  const { colors } = useTheme();

  // State
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  const [activeTab, setActiveTab] = useState<'weights' | 'workouts' | 'photos'>('weights');
  const [logWeightModal, setLogWeightModal] = useState(false);
  const [logWorkoutModal, setLogWorkoutModal] = useState(false);

  // Form State - Weight & Measurements
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [neck, setNeck] = useState('');
  const [hips, setHips] = useState('');
  const [biceps, setBiceps] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State - Workout
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [exercise, setExercise] = useState(COMMON_EXERCISES[0]);
  const [customExercise, setCustomExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [liftedWeight, setLiftedWeight] = useState('');

  // Load Data
  const loadData = async () => {
    try {
      const mList = await database.getMeasurements();
      const wList = await database.getWorkouts();
      const pList = await database.getPhotos();

      // Sort by date desc
      setMeasurements(mList.sort((a, b) => b.date.localeCompare(a.date)));
      setWorkouts(wList.sort((a, b) => b.date.localeCompare(a.date)));
      setPhotos(pList.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleLogWeight = async () => {
    if (!weight || isNaN(parseFloat(weight))) return;

    const newLog: Measurement = {
      id: generateUUID(),
      date: weightDate,
      weight: parseFloat(weight),
      body_fat: bodyFat ? parseFloat(bodyFat) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      chest: chest ? parseFloat(chest) : undefined,
      neck: neck ? parseFloat(neck) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      biceps: biceps ? parseFloat(biceps) : undefined,
    };

    await database.saveMeasurement(newLog);
    setWeight('');
    setBodyFat('');
    setWaist('');
    setChest('');
    setNeck('');
    setHips('');
    setBiceps('');
    setWeightDate(new Date().toISOString().slice(0, 10));
    setLogWeightModal(false);
    loadData();
  };

  const handleLogWorkout = async () => {
    const finalExercise = customExercise.trim() || exercise;
    if (!finalExercise || !sets || !reps || !liftedWeight) return;

    const newWorkout: Workout = {
      id: generateUUID(),
      date: workoutDate,
      exercise: finalExercise,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: parseFloat(liftedWeight),
    };

    await database.saveWorkout(newWorkout);
    setCustomExercise('');
    setSets('');
    setReps('');
    setLiftedWeight('');
    setWorkoutDate(new Date().toISOString().slice(0, 10));
    setLogWorkoutModal(false);
    loadData();
  };

  const handleDeleteWorkout = async (id: string) => {
    await database.deleteWorkout(id);
    loadData();
  };

  const handleDeleteMeasurement = async (id: string) => {
    await database.deleteMeasurement(id);
    loadData();
  };

  // Calculations
  const currentWeight = measurements.length > 0 ? measurements[0].weight : null;
  
  // Weekly weight change calculation
  const getWeeklyChange = () => {
    if (measurements.length < 2) return '0.0 kg';
    // Find log from approx 7 days ago
    const latest = measurements[0].weight || 0;
    const previous = measurements[1].weight || 0;
    const diff = latest - previous;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg`;
  };

  // Personal Records: Max weight for each exercise
  const personalRecords = workouts.reduce((records, w) => {
    if (!records[w.exercise] || records[w.exercise] < w.weight) {
      records[w.exercise] = w.weight;
    }
    return records;
  }, {} as Record<string, number>);

  // SVG Line Chart: Weight Trend
  const renderWeightChart = () => {
    if (measurements.length < 2) return null;
    const lastLogs = [...measurements].slice(0, 6).reverse(); // Last 6 logs ascending

    const weights = lastLogs.map(l => l.weight || 0);
    const max = Math.max(...weights) + 2;
    const min = Math.min(...weights) - 2;
    const range = max - min || 1;

    const stepX = CHART_WIDTH / (lastLogs.length - 1);
    const coordinates = lastLogs.map((item, idx) => {
      const x = idx * stepX;
      const y = CHART_HEIGHT - 20 - (((item.weight || 0) - min) / range) * (CHART_HEIGHT - 45);
      return { x, y, weight: item.weight || 0, date: item.date.slice(5) }; // MM-DD
    });

    const pathData = coordinates.reduce(
      (path, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
      ''
    );

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Weight History Trend</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.secondary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          <Line x1="0" y1={CHART_HEIGHT - 20} x2={CHART_WIDTH} y2={CHART_HEIGHT - 20} stroke={colors.border} strokeWidth="1" />
          
          <Path d={`${pathData} L ${coordinates[coordinates.length - 1].x} ${CHART_HEIGHT - 20} L ${coordinates[0].x} ${CHART_HEIGHT - 20} Z`} fill="url(#weightGrad)" />
          <Path d={pathData} fill="none" stroke={colors.secondary} strokeWidth="2.5" />

          {coordinates.map((pt, idx) => (
            <React.Fragment key={idx}>
              <Rect
                x={pt.x - 3}
                y={pt.y - 3}
                width="6"
                height="6"
                rx="3"
                fill={colors.surface}
                stroke={colors.secondary}
                strokeWidth="1.5"
              />
              <SvgText
                x={pt.x}
                y={pt.y - 8}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                fill={colors.text}
              >
                {pt.weight}
              </SvgText>
              <SvgText
                x={pt.x}
                y={CHART_HEIGHT - 6}
                fontSize="8"
                textAnchor="middle"
                fill={colors.textMuted}
              >
                {pt.date}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* OS Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(['weights', 'workouts', 'photos'] as const).map(tab => (
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
        {activeTab === 'weights' && (
          <View>
            {/* KPI weight card */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Current Weight</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>
                    {currentWeight ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setLogWeightModal(true)}
                >
                  <Text style={styles.addButtonText}>Log weight</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />

              <View style={styles.kpiGrid}>
                <View style={styles.kpiGridCell}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Weekly Change</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.secondary }]}>{getWeeklyChange()}</Text>
                </View>
                <View style={styles.kpiGridCell}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Body Fat</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.text }]}>
                    {measurements.length > 0 && measurements[0].body_fat 
                      ? `${measurements[0].body_fat.toFixed(1)}%` 
                      : '--%'}
                  </Text>
                </View>
              </View>
            </View>

            {/* SVG Weight Chart */}
            {renderWeightChart()}

            {/* Measurement Ledger */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Weight Logs</Text>
              {measurements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No measurements logged yet.</Text>
                </View>
              ) : (
                measurements.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.logDate, { color: colors.text }]}>{item.date}</Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.body_fat ? `BF: ${item.body_fat}% ` : ''}
                        {item.waist ? `Waist: ${item.waist}cm ` : ''}
                        {item.biceps ? `Biceps: ${item.biceps}cm` : ''}
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={[styles.logValue, { color: colors.text }]}>{item.weight} kg</Text>
                      <TouchableOpacity onPress={() => handleDeleteMeasurement(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 11, marginTop: 2 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'workouts' && (
          <View>
            {/* PR Card list */}
            {Object.keys(personalRecords).length > 0 && (
              <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Personal Records (PRs)</Text>
                <View style={styles.prGrid}>
                  {Object.entries(personalRecords).map(([ex, wt]) => (
                    <View key={ex} style={[styles.prChip, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
                      <Text style={[styles.prText, { color: colors.primary }]}>🏆 {ex}: {wt}kg</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Workout Tracker section */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Logs</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setLogWorkoutModal(true)}
                >
                  <Text style={styles.addButtonText}>Log Workout</Text>
                </TouchableOpacity>
              </View>

              {workouts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No workouts logged yet.</Text>
                </View>
              ) : (
                workouts.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logDate, { color: colors.text, fontWeight: '700' }]}>{item.exercise}</Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.date} • {item.sets} sets x {item.reps} reps
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={[styles.logValue, { color: colors.primary }]}>{item.weight} kg</Text>
                      <TouchableOpacity onPress={() => handleDeleteWorkout(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 11, marginTop: 4 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'photos' && (
          <View>
            {/* Photos overview */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Progress Photos</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 16 }]}>
                Track visual physical transformations over time.
              </Text>
              
              <View style={styles.photoGrid}>
                {['Front View', 'Side View', 'Back View'].map(pos => (
                  <View key={pos} style={[styles.photoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoIcon}>📷</Text>
                      <Text style={[styles.photoText, { color: colors.textMuted }]}>{pos}</Text>
                    </View>
                    <TouchableOpacity style={[styles.photoUploadButton, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>Upload</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal visible={logWeightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Weight & Measurements</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Weight (kg)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Body Fat (%) (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={bodyFat}
              onChangeText={setBodyFat}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Waist (cm)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={waist}
                onChangeText={setWaist}
              />
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Chest (cm)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={chest}
                onChangeText={setChest}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Neck (cm)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={neck}
                onChangeText={setNeck}
              />
              <TextInput
                style={[styles.halfInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Hips (cm)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={hips}
                onChangeText={setHips}
              />
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Biceps (cm)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={biceps}
              onChangeText={setBiceps}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={weightDate}
              onChangeText={setWeightDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setLogWeightModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleLogWeight}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Workout Modal */}
      <Modal visible={logWorkoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Workout Exercise</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Common Exercises</Text>
            <View style={styles.categoryPicker}>
              {COMMON_EXERCISES.map(ex => (
                <TouchableOpacity
                  key={ex}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    exercise === ex && !customExercise && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => {
                    setExercise(ex);
                    setCustomExercise('');
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Or write custom exercise..."
              placeholderTextColor={colors.textMuted}
              value={customExercise}
              onChangeText={setCustomExercise}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Sets"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={sets}
                onChangeText={setSets}
              />
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Reps"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={reps}
                onChangeText={setReps}
              />
              <TextInput
                style={[styles.thirdInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Weight (kg)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={liftedWeight}
                onChangeText={setLiftedWeight}
              />
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={workoutDate}
              onChangeText={setWorkoutDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setLogWorkoutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleLogWorkout}
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
  subtitle: {
    fontSize: 12,
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
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  prText: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: (width - 68) / 3,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  photoPlaceholder: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoIcon: {
    fontSize: 22,
  },
  photoText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  photoUploadButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
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
