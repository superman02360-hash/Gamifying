import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useTheme } from './context/ThemeContext';
import { useSecurity } from './context/SecurityContext';
import { useSync } from './context/SyncContext';

// Import modules
import LauncherModule from './modules/Launcher/LauncherModule';
import FinanceModule from './modules/Finance/FinanceModule';
import BodyModule from './modules/Body/BodyModule';
import KnowledgeModule from './modules/Knowledge/KnowledgeModule';
import HabitsModule from './modules/Habits/HabitsModule';
import HealthModule from './modules/Health/HealthModule';
import SettingsModule from './modules/Settings/SettingsModule';

const { width } = Dimensions.get('window');

export type ModuleType =
  | 'launcher'
  | 'finance'
  | 'body'
  | 'knowledge'
  | 'habits'
  | 'health'
  | 'settings';

export default function AppShell() {
  const { colors, theme } = useTheme();
  const { isLocked, unlock, hasPin } = useSecurity();
  const { isSyncing, lastSynced } = useSync();

  const [currentModule, setCurrentModule] = useState<ModuleType>('launcher');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  const menuItems = [
    { id: 'launcher' as ModuleType, label: 'Home Launcher', icon: '🏠' },
    { id: 'finance' as ModuleType, label: 'Finance (Wealth)', icon: '💰' },
    { id: 'body' as ModuleType, label: 'Body (Fitness)', icon: '💪' },
    { id: 'knowledge' as ModuleType, label: 'Knowledge (Recall)', icon: '📚' },
    { id: 'habits' as ModuleType, label: 'Habits (Checklist)', icon: '🌙' },
    { id: 'health' as ModuleType, label: 'Health (Medical)', icon: '🏥' },
    { id: 'settings' as ModuleType, label: 'Settings & Sync', icon: '⚙️' },
  ];
  const [time, setTime] = useState<string>('00:00');
  const [date, setDate] = useState<string>('');

  // Clock update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      setTime(`${hh}:${mm}`);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      setDate(`${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Passcode pad keypress handler
  const handleKeyPress = (val: string) => {
    if (pinError) setPinError(false);
    if (pinInput.length < 4) {
      const nextInput = pinInput + val;
      setPinInput(nextInput);
      if (nextInput.length === 4) {
        // Try unlocking
        const success = unlock(nextInput);
        if (!success) {
          setTimeout(() => {
            setPinInput('');
            setPinError(true);
          }, 200);
        } else {
          setPinInput('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
  };

  const handleClear = () => {
    setPinInput('');
  };

  // Render Lock Screen if PIN set and locked
  if (hasPin && isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        
        {/* Status Bar */}
        <View style={styles.lockHeader}>
          <Text style={[styles.timeText, { color: colors.text }]}>{time}</Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{date}</Text>
        </View>

        <View style={styles.lockContainer}>
          <Text style={[styles.lockTitle, { color: colors.text }]}>LifeOS Secured</Text>
          <Text style={[styles.lockSubtitle, { color: colors.textMuted }]}>
            {pinError ? 'Incorrect Passcode. Try Again.' : 'Enter 4-Digit Passcode'}
          </Text>

          {/* Dots Indicator */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map(idx => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  { borderColor: pinError ? colors.error : colors.primary },
                  pinInput.length > idx && {
                    backgroundColor: pinError ? colors.error : colors.primary,
                  },
                ]}
              />
            ))}
          </View>

          {/* Passcode Keypad */}
          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.keyButton, { backgroundColor: colors.surface }]}
                onPress={() => handleKeyPress(num.toString())}
              >
                <Text style={[styles.keyText, { color: colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: 'transparent' }]}
              onPress={handleClear}
            >
              <Text style={[styles.actionKeyText, { color: colors.textMuted }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: colors.surface }]}
              onPress={() => handleKeyPress('0')}
            >
              <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: 'transparent' }]}
              onPress={handleBackspace}
            >
              <Text style={[styles.actionKeyText, { color: colors.textMuted }]}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Active module routing
  const renderModule = () => {
    switch (currentModule) {
      case 'launcher':
        return <LauncherModule onNavigate={setCurrentModule} />;
      case 'finance':
        return <FinanceModule />;
      case 'body':
        return <BodyModule />;
      case 'knowledge':
        return <KnowledgeModule />;
      case 'habits':
        return <HabitsModule />;
      case 'health':
        return <HealthModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <LauncherModule onNavigate={setCurrentModule} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      {/* Simulated OS Top Status Bar */}
      <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
        <View style={styles.statusBarLeft}>
          <Text style={[styles.statusBarTime, { color: colors.text }]}>{time}</Text>
        </View>
        <View style={styles.statusBarRight}>
          {isSyncing && (
            <Text style={[styles.statusIcon, { color: colors.primary, marginRight: 8 }]}>🔄</Text>
          )}
          {lastSynced && !isSyncing && (
            <Text style={[styles.statusIconText, { color: colors.textMuted, marginRight: 8 }]}>
              Synced {lastSynced}
            </Text>
          )}
          <Text style={[styles.statusBarText, { color: colors.text }]}>📶 🔋 88%</Text>
        </View>
      </View>

      {/* Unified Navigation Header Bar (Present on every module page!) */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setIsMenuOpen(!isMenuOpen)}
          style={styles.headerMenuButton}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20, color: colors.primary, fontWeight: 'bold' }}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {currentModule === 'launcher' ? 'LifeOS Dashboard' : currentModule.charAt(0).toUpperCase() + currentModule.slice(1)}
        </Text>
        <TouchableOpacity 
          onPress={() => setCurrentModule(currentModule === 'settings' ? 'launcher' : 'settings')}
          style={styles.headerMenuButton}
        >
          <Text style={{ fontSize: 18 }}>{currentModule === 'settings' ? '🏠' : '⚙️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Module Content */}
      <View style={styles.contentContainer}>{renderModule()}</View>

      {/* OS Navigation Bar (Bottom Home Indicator Bar) */}
      <View
        style={[
          styles.navigationBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            height: currentModule === 'launcher' ? 50 : 20,
            paddingBottom: currentModule === 'launcher' ? 8 : 2,
          },
        ]}
      >
        {currentModule === 'launcher' ? (
          <View style={styles.launcherBottomFiller}>
            <Text style={[styles.appTitle, { color: colors.textMuted }]}>LifeOS Launcher</Text>
          </View>
        ) : (
          <View style={[styles.iosHomeIndicator, { backgroundColor: colors.textMuted }]} />
        )}
      </View>

      {/* Dropdown Menu Overlay */}
      {isMenuOpen && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <View style={[styles.menuDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.menuDropdownHeader, { color: colors.textMuted }]}>SWITCH MODULE</Text>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  currentModule === item.id && { backgroundColor: colors.border }
                ]}
                onPress={() => {
                  setCurrentModule(item.id);
                  setIsMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                {currentModule === item.id && (
                  <Text style={[styles.menuActiveIndicator, { color: colors.primary }]}>●</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBarTime: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  statusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBarText: {
    fontSize: 12,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusIconText: {
    fontSize: 10,
  },
  contentContainer: {
    flex: 1,
  },
  navigationBar: {
    height: 64,
    borderTopWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  homeIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  homeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  launcherBottomFiller: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '500',
  },
  // Lock Screen Styles
  lockHeader: {
    alignItems: 'center',
    marginTop: 64,
    paddingHorizontal: 20,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
  },
  dateText: {
    fontSize: 16,
    marginTop: 4,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  lockSubtitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 24,
    marginBottom: 48,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    marginHorizontal: 12,
  },
  keypad: {
    width: width * 0.75,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '400',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuToggleButton: {
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosHomeIndicator: {
    width: 120,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
    alignSelf: 'center',
    marginTop: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 84,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
  },
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerMenuButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  menuDropdown: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuDropdownHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  menuActiveIndicator: {
    fontSize: 10,
  },
});
