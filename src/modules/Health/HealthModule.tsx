import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { database, DoctorVisit, Vaccination, MedicalReport, generateUUID } from '../../db/database';

export default function HealthModule() {
  const { colors } = useTheme();

  // State
  const [visits, setVisits] = useState<DoctorVisit[]>([]);
  const [vaccines, setVaccines] = useState<Vaccination[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);

  const [activeTab, setActiveTab] = useState<'visits' | 'vaccines' | 'reports'>('visits');
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [vaccineModalVisible, setVaccineModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Form State - Doctor Visit
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State - Vaccination
  const [vaxName, setVaxName] = useState('');
  const [vaxDate, setVaxDate] = useState(new Date().toISOString().slice(0, 10));
  const [vaxNextDue, setVaxNextDue] = useState('');

  // Form State - Medical Report
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('PDF');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportUrl, setReportUrl] = useState('');

  // Load Data
  const loadData = async () => {
    try {
      const vList = await database.getDoctorVisits();
      const vcList = await database.getVaccinations();
      const rList = await database.getMedicalReports();

      setVisits(vList.sort((a, b) => b.date.localeCompare(a.date)));
      setVaccines(vcList.sort((a, b) => b.date.localeCompare(a.date)));
      setReports(rList.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddVisit = async () => {
    if (!doctorName.trim() || !visitReason.trim()) return;

    const newVisit: DoctorVisit = {
      id: generateUUID(),
      date: visitDate,
      doctor: doctorName.trim(),
      hospital: hospital.trim() || undefined,
      reason: visitReason.trim(),
      notes: visitNotes.trim() || undefined,
    };

    await database.saveDoctorVisit(newVisit);
    setDoctorName('');
    setHospital('');
    setVisitReason('');
    setVisitNotes('');
    setVisitDate(new Date().toISOString().slice(0, 10));
    setVisitModalVisible(false);
    loadData();
  };

  const handleDeleteVisit = async (id: string) => {
    await database.deleteDoctorVisit(id);
    loadData();
  };

  const handleAddVaccine = async () => {
    if (!vaxName.trim()) return;

    const newVax: Vaccination = {
      id: generateUUID(),
      name: vaxName.trim(),
      date: vaxDate,
      next_due: vaxNextDue.trim() || undefined,
    };

    await database.saveVaccination(newVax);
    setVaxName('');
    setVaxDate(new Date().toISOString().slice(0, 10));
    setVaxNextDue('');
    setVaccineModalVisible(false);
    loadData();
  };

  const handleDeleteVaccine = async (id: string) => {
    await database.deleteVaccination(id);
    loadData();
  };

  const handleAddReport = async () => {
    if (!reportName.trim()) return;

    const newReport: MedicalReport = {
      id: generateUUID(),
      name: reportName.trim(),
      date: reportDate,
      type: reportType,
      file_url: reportUrl.trim() || 'mock-file-url-placeholder',
    };

    await database.saveMedicalReport(newReport);
    setReportName('');
    setReportUrl('');
    setReportDate(new Date().toISOString().slice(0, 10));
    setReportModalVisible(false);
    loadData();
  };

  const handleDeleteReport = async (id: string) => {
    await database.deleteMedicalReport(id);
    loadData();
  };

  const handleViewReport = (report: MedicalReport) => {
    Alert.alert(
      'Medical Report Detail',
      `Name: ${report.name}\nDate: ${report.date}\nType: ${report.type}\nFile Link: ${report.file_url}`,
      [{ text: 'Close' }]
    );
  };

  // Calculations
  const nextVax = vaccines.find(v => {
    if (!v.next_due) return false;
    return new Date(v.next_due) >= new Date();
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* OS Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(['visits', 'vaccines', 'reports'] as const).map(tab => (
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
        {activeTab === 'visits' && (
          <View>
            {/* KPI visits summary */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Doctor Visits Logged</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{visits.length}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setVisitModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Log Visit</Text>
                </TouchableOpacity>
              </View>
              {visits.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Last Consultant</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.text }]}>
                    Dr. {visits[0].doctor} ({visits[0].date})
                  </Text>
                </View>
              )}
            </View>

            {/* List of visits */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Visits History</Text>
              {visits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No doctor visits logged yet.</Text>
                </View>
              ) : (
                visits.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logDate, { color: colors.text, fontWeight: '700' }]}>
                        Dr. {item.doctor}
                      </Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.date} • {item.hospital || 'Private Clinic'} • {item.reason}
                      </Text>
                      {item.notes && (
                        <Text style={[styles.logNotes, { color: colors.text, backgroundColor: colors.background }]}>
                          Notes: {item.notes}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteVisit(item.id)} style={{ paddingLeft: 8 }}>
                      <Text style={{ color: colors.error, fontSize: 11 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'vaccines' && (
          <View>
            {/* Alerts for upcoming vaccines */}
            {nextVax && (
              <View style={[styles.alertCard, { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary }]}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🏥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>Upcoming Vaccination</Text>
                  <Text style={[styles.alertSub, { color: colors.textMuted }]}>
                    {nextVax.name} is scheduled next on {nextVax.next_due}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Vaccination Schedule</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setVaccineModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Add Record</Text>
                </TouchableOpacity>
              </View>

              {vaccines.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No vaccination records logged yet.</Text>
                </View>
              ) : (
                vaccines.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.logDate, { color: colors.text, fontWeight: '700' }]}>{item.name}</Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        Given: {item.date} {item.next_due ? `• Next Due: ${item.next_due}` : ''}
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      {item.next_due && (
                        <View style={[styles.vaxBadge, { backgroundColor: colors.primaryContainer }]}>
                          <Text style={[styles.vaxBadgeText, { color: colors.primary }]}>Scheduled</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteVaccine(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 11, marginTop: 4 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'reports' && (
          <View>
            {/* Reports List */}
            <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Lab Reports & Docs</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setReportModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Add Doc</Text>
                </TouchableOpacity>
              </View>

              {reports.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textMuted }}>No medical reports logged yet.</Text>
                </View>
              ) : (
                reports.map(item => (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => handleViewReport(item)} style={{ flex: 1 }}>
                      <Text style={[styles.logDate, { color: colors.text, fontWeight: '700' }]}>
                        📄 {item.name}
                      </Text>
                      <Text style={[styles.logSub, { color: colors.textMuted }]}>
                        {item.date} • Format: {item.type}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteReport(item.id)} style={{ paddingLeft: 8 }}>
                      <Text style={{ color: colors.error, fontSize: 11 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Doctor Visit Modal */}
      <Modal visible={visitModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Doctor Visit</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Doctor's Name"
              placeholderTextColor={colors.textMuted}
              value={doctorName}
              onChangeText={setDoctorName}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Hospital/Clinic Name"
              placeholderTextColor={colors.textMuted}
              value={hospital}
              onChangeText={setHospital}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Reason for Visit"
              placeholderTextColor={colors.textMuted}
              value={visitReason}
              onChangeText={setVisitReason}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, height: 72 }]}
              placeholder="Diagnosis / Doctor's Notes"
              placeholderTextColor={colors.textMuted}
              multiline
              value={visitNotes}
              onChangeText={setVisitNotes}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={visitDate}
              onChangeText={setVisitDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setVisitModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddVisit}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vaccination Modal */}
      <Modal visible={vaccineModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Vaccination</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Vaccine Name"
              placeholderTextColor={colors.textMuted}
              value={vaxName}
              onChangeText={setVaxName}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date Administered"
              placeholderTextColor={colors.textMuted}
              value={vaxDate}
              onChangeText={setVaxDate}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Next Due Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={vaxNextDue}
              onChangeText={setVaxNextDue}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setVaccineModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddVaccine}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Medical Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Medical Document</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Document Name (e.g. Blood Test Report)"
              placeholderTextColor={colors.textMuted}
              value={reportName}
              onChangeText={setReportName}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>File Format</Text>
            <View style={styles.categoryPicker}>
              {['PDF', 'PNG', 'JPEG'].map(fmt => (
                <TouchableOpacity
                  key={fmt}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    reportType === fmt && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setReportType(fmt)}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{fmt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Simulated File Link (optional)"
              placeholderTextColor={colors.textMuted}
              value={reportUrl}
              onChangeText={setReportUrl}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={reportDate}
              onChangeText={setReportDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddReport}
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
    alignItems: 'center',
    paddingVertical: 12,
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
  logNotes: {
    fontSize: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    lineHeight: 16,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 12,
    marginTop: 2,
  },
  vaxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vaxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
