import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useTheme, ThemeType } from '../../context/ThemeContext';
import { useSecurity } from '../../context/SecurityContext';
import { useSync } from '../../context/SyncContext';
import { database } from '../../db/database';

export default function SettingsModule() {
  const { colors, theme, setTheme } = useTheme();
  const { hasPin, setPin } = useSecurity();
  const { isSyncEnabled, isSyncing, lastSynced, toggleSync, triggerSync } = useSync();

  // Modal control
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);

  // Form State - Security
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Form State - Backup Import
  const [importJsonText, setImportJsonText] = useState('');

  // Handlers
  const handleSavePin = async () => {
    if (newPin.length !== 4 || isNaN(parseInt(newPin))) {
      Alert.alert('Invalid PIN', 'Passcode must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'Passcodes do not match.');
      return;
    }

    await setPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinModalVisible(false);
    Alert.alert('Success', 'PIN security code enabled.');
  };

  const handleDisablePin = async () => {
    Alert.alert(
      'Disable Passcode',
      'Are you sure you want to disable your PIN passcode? Anyone will be able to open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await setPin(null);
            Alert.alert('Success', 'PIN passcode disabled.');
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!isSyncEnabled) {
      Alert.alert('Disabled', 'Please toggle Supabase Sync on first.');
      return;
    }
    const res = await triggerSync();
    Alert.alert(res.success ? 'Success' : 'Failed', res.message);
  };

  const handleExportData = async () => {
    try {
      const dataStr = await database.exportJSON();
      // Native Share Sheet
      await Share.share({
        message: dataStr,
        title: 'LifeOS Backup Data',
      });
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const handleImportData = async () => {
    if (!importJsonText.trim()) return;

    try {
      await database.importJSON(importJsonText);
      setImportJsonText('');
      setBackupModalVisible(false);
      Alert.alert('Success', 'Database restored successfully! Re-opening dashboard.', [
        { text: 'OK' }
      ]);
    } catch (e: any) {
      Alert.alert('Import Failed', 'Invalid backup format: ' + e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Theme Settings */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance Theme</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choose a visual style for the launcher.
          </Text>

          <View style={styles.themeRow}>
            {(['light', 'dark', 'oled'] as ThemeType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.themeButton,
                  { borderColor: colors.border },
                  theme === t && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                ]}
                onPress={() => setTheme(t)}
              >
                <Text
                  style={[
                    styles.themeButtonText,
                    { color: theme === t ? colors.primary : colors.text },
                    theme === t && { fontWeight: '700' },
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security Settings */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Security (PIN Lock)</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Require a 4-digit passcode on app startup.
          </Text>

          <View style={styles.actionRow}>
            {hasPin ? (
              <View style={styles.securityStateContainer}>
                <Text style={[styles.statusLabel, { color: colors.success }]}>🟢 Lock Enabled</Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  onPress={handleDisablePin}
                >
                  <Text style={styles.actionButtonText}>Disable Lock</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.securityStateContainer}>
                <Text style={[styles.statusLabel, { color: colors.textMuted }]}>⚪ Unsecured</Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => setPinModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>Enable PIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Supabase Sync Settings */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Supabase Cloud Sync</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sync data with PostgreSQL via Custom HTTP REST API.
          </Text>

          <View style={styles.syncContainer}>
            <View style={styles.toggleRow}>
              <Text style={[styles.labelText, { color: colors.text }]}>Enable Sync</Text>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  { backgroundColor: isSyncEnabled ? colors.primary : colors.border },
                ]}
                onPress={() => toggleSync(!isSyncEnabled)}
              >
                <View style={[styles.switchCircle, isSyncEnabled && styles.switchCircleActive]} />
              </TouchableOpacity>
            </View>

            {isSyncEnabled && (
              <View style={styles.syncStats}>
                <Text style={[styles.syncStatText, { color: colors.textMuted }]}>
                  Status: {isSyncing ? 'Synchronizing...' : 'Idle'}
                </Text>
                {lastSynced && (
                  <Text style={[styles.syncStatText, { color: colors.textMuted }]}>
                    Last Synced: {lastSynced}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.syncManualButton, { backgroundColor: colors.primaryContainer }]}
                  onPress={handleManualSync}
                  disabled={isSyncing}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Backup & Recovery Settings */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup & Recovery</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Export your database to JSON or restore from backup.
          </Text>

          <View style={styles.backupActionsGrid}>
            <TouchableOpacity
              style={[styles.backupButton, { borderColor: colors.primary }]}
              onPress={handleExportData}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>📤 Export Data (JSON)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backupButton, { borderColor: colors.secondary }]}
              onPress={() => setBackupModalVisible(true)}
            >
              <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 13 }}>📥 Import Data (Restore)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Set PIN Modal */}
      <Modal visible={pinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Configure Lock passcode</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter 4-Digit PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Confirm 4-Digit PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSavePin}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Backup Import Modal */}
      <Modal visible={backupModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Restore Database</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 12 }]}>
              Paste your exported JSON database below. Warning: This will overwrite all local settings and logs!
            </Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, height: 160, textAlignVertical: 'top' }]}
              placeholder="Paste JSON text here..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={importJsonText}
              onChangeText={setImportJsonText}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setBackupModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleImportData}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Restore</Text>
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
  sectionContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeButton: {
    flex: 0.31,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 8,
  },
  securityStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Sync Styles
  syncContainer: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchCircleActive: {
    alignSelf: 'flex-end',
  },
  syncStats: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
  },
  syncStatText: {
    fontSize: 12,
    marginBottom: 6,
  },
  syncManualButton: {
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  // Backup Styles
  backupActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backupButton: {
    flex: 0.48,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
