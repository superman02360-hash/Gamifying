import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { database, Transaction, Book, Habit, Workout, MedicalReport } from '../../db/database';
import { ModuleType } from '../../AppShell';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

const renderModuleIcon = (id: ModuleType, color: string) => {
  switch (id) {
    case 'finance':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
          <Path d="M12 6v12M14.5 9H11a2 2 0 100 4h3a2 2 0 110 4H9.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'body':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path d="M6 12h12M6 8v8M18 8v8M3 10v4M21 10v4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'knowledge':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 01-2.5-2.5V4.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'habits':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
          <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'health':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
};

interface LauncherModuleProps {
  onNavigate: (module: ModuleType) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'Transaction' | 'Book' | 'Habit' | 'Exercise' | 'Health Report';
  targetModule: ModuleType;
}

export default function LauncherModule({ onNavigate }: LauncherModuleProps) {
  const { colors } = useTheme();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Dashboard stats state
  const [stats, setStats] = useState({
    netWorth: 0,
    spending: 0,
    weight: 'No log',
    workoutStreak: 0,
    booksFinished: 0,
    pagesRead: 0,
    habitsDone: 0,
    habitsTotal: 0,
    vaccinesPending: 0,
    lastVisit: 'None',
  });

  // Source data for global search
  const [sourceData, setSourceData] = useState<{
    transactions: Transaction[];
    books: Book[];
    habits: Habit[];
    workouts: Workout[];
    reports: MedicalReport[];
  }>({
    transactions: [],
    books: [],
    habits: [],
    workouts: [],
    reports: [],
  });

  // Fetch stats and search source data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const trans = await database.getTransactions();
        const accounts = await database.getAccounts();
        const assets = await database.getAssets();
        const measures = await database.getMeasurements();
        const workouts = await database.getWorkouts();
        const books = await database.getBooks();
        const sessions = await database.getReadingSessions();
        const habits = await database.getHabits();
        const habitLogs = await database.getHabitLogs();
        const visits = await database.getDoctorVisits();
        const vaxs = await database.getVaccinations();
        const reports = await database.getMedicalReports();

        // 1. Calculate Finance Stats
        const bal = accounts.reduce((acc, a) => acc + a.balance, 0);
        const ass = assets.reduce((acc, a) => acc + a.current_value, 0);
        const netWorth = bal + ass;

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlySpending = trans
          .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
          .reduce((acc, t) => acc + t.amount, 0);

        // 2. Calculate Body Stats
        const latestWeight = measures.length > 0 
          ? [...measures].sort((a, b) => b.date.localeCompare(a.date))[0].weight + ' kg'
          : 'No log';
        
        // Simple workout streak calculation (workouts in last 7 days)
        const workoutStreak = workouts.filter(w => {
          const wDate = new Date(w.date);
          const diffTime = Math.abs(new Date().getTime() - wDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        }).length;

        // 3. Calculate Knowledge Stats
        const booksFinished = books.filter(b => b.status === 'Finished').length;
        const pagesRead = sessions.reduce((acc, s) => acc + s.pages_read, 0);

        // 4. Calculate Habit Stats
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs = habitLogs.filter(l => l.date === today && l.completed);
        const habitsDone = todayLogs.length;
        const habitsTotal = habits.length;

        // 5. Calculate Health Stats
        const vaccinesPending = vaxs.filter(v => {
          if (!v.next_due) return false;
          return new Date(v.next_due) >= new Date();
        }).length;
        const lastVisit = visits.length > 0
          ? [...visits].sort((a, b) => b.date.localeCompare(a.date))[0].doctor
          : 'None';

        setStats({
          netWorth,
          spending: monthlySpending,
          weight: latestWeight,
          workoutStreak,
          booksFinished,
          pagesRead,
          habitsDone,
          habitsTotal,
          vaccinesPending,
          lastVisit,
        });

        // Store data for global search indexing
        setSourceData({
          transactions: trans,
          books,
          habits,
          workouts,
          reports,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      }
    };

    fetchData();
  }, []);

  // Handle global search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search Transactions
    sourceData.transactions.forEach(t => {
      if (t.category.toLowerCase().includes(query) || (t.notes && t.notes.toLowerCase().includes(query))) {
        results.push({
          id: t.id,
          title: `${t.type === 'income' ? '💰 +' : '💸 -'}${t.amount} ${t.category}`,
          subtitle: `${t.date} ${t.notes ? `• ${t.notes}` : ''}`,
          type: 'Transaction',
          targetModule: 'finance',
        });
      }
    });

    // Search Books
    sourceData.books.forEach(b => {
      if (b.title.toLowerCase().includes(query) || (b.author && b.author.toLowerCase().includes(query))) {
        results.push({
          id: b.id,
          title: `📚 ${b.title}`,
          subtitle: `${b.author || 'Unknown Author'} • Status: ${b.status}`,
          type: 'Book',
          targetModule: 'knowledge',
        });
      }
    });

    // Search Habits
    sourceData.habits.forEach(h => {
      if (h.title.toLowerCase().includes(query)) {
        results.push({
          id: h.id,
          title: `🌙 Habit: ${h.title}`,
          subtitle: `Target: ${h.target || 'None'} • Frequency: ${h.frequency}`,
          type: 'Habit',
          targetModule: 'habits',
        });
      }
    });

    // Search Exercises
    sourceData.workouts.forEach(w => {
      if (w.exercise.toLowerCase().includes(query)) {
        results.push({
          id: w.id,
          title: `💪 Workout: ${w.exercise}`,
          subtitle: `${w.date} • ${w.sets} sets x ${w.reps} reps @ ${w.weight}kg`,
          type: 'Exercise',
          targetModule: 'body',
        });
      }
    });

    // Search Reports
    sourceData.reports.forEach(r => {
      if (r.name.toLowerCase().includes(query) || r.type.toLowerCase().includes(query)) {
        results.push({
          id: r.id,
          title: `🏥 Medical Report: ${r.name}`,
          subtitle: `${r.date} • Type: ${r.type}`,
          type: 'Health Report',
          targetModule: 'health',
        });
      }
    });

    setSearchResults(results.slice(0, 10)); // Limit to 10 results
  }, [searchQuery, sourceData]);

  const cards = [
    {
      id: 'finance' as ModuleType,
      title: 'Finance',
      icon: '💰',
      color: '#006D32',
      bgColor: '#D1E7DD',
      stats1: `Net Worth: $${stats.netWorth.toFixed(2)}`,
      stats2: `Spending: $${stats.spending.toFixed(2)}`,
      progress: Math.min(1, stats.spending > 0 ? stats.netWorth / (stats.spending * 10) : 1),
      label: 'Financial Health',
    },
    {
      id: 'body' as ModuleType,
      title: 'Body',
      icon: '💪',
      color: '#FE8A00',
      bgColor: '#FFEEC3',
      stats1: `Weight: ${stats.weight}`,
      stats2: `Workout Count: ${stats.workoutStreak} (7d)`,
      progress: Math.min(1, stats.workoutStreak / 5),
      label: 'Weekly Progress',
    },
    {
      id: 'knowledge' as ModuleType,
      title: 'Knowledge',
      icon: '📚',
      color: '#0059BB',
      bgColor: '#CFE2FF',
      stats1: `Completed: ${stats.booksFinished} books`,
      stats2: `Pages read: ${stats.pagesRead}`,
      progress: Math.min(1, stats.booksFinished / 10),
      label: 'Reading Shelf',
    },
    {
      id: 'habits' as ModuleType,
      title: 'Habits',
      icon: '🌙',
      color: '#00D166',
      bgColor: '#C5FFDE',
      stats1: `Today: ${stats.habitsDone}/${stats.habitsTotal} completed`,
      stats2: `Streak: Active`,
      progress: stats.habitsTotal > 0 ? stats.habitsDone / stats.habitsTotal : 0,
      label: 'Daily Target',
    },
    {
      id: 'health' as ModuleType,
      title: 'Health',
      icon: '🏥',
      color: '#BA1A1A',
      bgColor: '#FFDAD6',
      stats1: `Vaccines: ${stats.vaccinesPending} due`,
      stats2: `Last Visit: ${stats.lastVisit}`,
      progress: 0.8,
      label: 'History Record',
    },
    {
      id: 'settings' as ModuleType,
      title: 'Settings',
      icon: '⚙️',
      color: '#606770',
      bgColor: '#E3E6EB',
      stats1: 'Manage preferences',
      stats2: 'CSV/JSON Export & Sync',
      progress: 1,
      label: 'OS System',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Welcome Banner */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome to LifeOS</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Your personal command center is ready.
          </Text>
        </View>

        {/* Global Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search across LifeOS..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Global Search Results Dropdown */}
        {searchQuery ? (
          <View style={[styles.searchResultsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {searchResults.length > 0 ? (
              searchResults.map(res => (
                <TouchableOpacity
                  key={res.id}
                  style={[styles.searchResultRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSearchQuery('');
                    onNavigate(res.targetModule);
                  }}
                >
                  <View style={styles.searchResultLeft}>
                    <Text style={[styles.searchResultTitle, { color: colors.text }]}>{res.title}</Text>
                    <Text style={[styles.searchResultSub, { color: colors.textMuted }]}>{res.subtitle}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.textMuted }]}>{res.type}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResults}>
                <Text style={{ color: colors.textMuted }}>No items match your search query.</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Launcher Grid */}
        <View style={styles.grid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
              onPress={() => onNavigate(card.id)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: card.bgColor }]}>
                  {renderModuleIcon(card.id, card.color)}
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.cardStatsText, { color: colors.text }]} numberOfLines={1}>
                  {card.stats1}
                </Text>
                <Text style={[styles.cardStatsSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {card.stats2}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>{card.label}</Text>
                  <Text style={[styles.progressVal, { color: card.color }]}>
                    {Math.round(card.progress * 100)}%
                  </Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { backgroundColor: card.color, width: `${card.progress * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearIcon: {
    fontSize: 16,
    paddingHorizontal: 4,
  },
  searchResultsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 14,
  },
  cardStatsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardStatsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
