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
import { useTheme } from '../../context/ThemeContext';
import { database, Book, ReadingSession, RecallEntry, generateUUID } from '../../db/database';

const { width } = Dimensions.get('window');

// Spaced Repetition Intervals (Tiers)
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

export default function KnowledgeModule() {
  const { colors } = useTheme();

  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [recalls, setRecalls] = useState<RecallEntry[]>([]);
  
  const [activeTab, setActiveTab] = useState<'shelf' | 'review'>('shelf');
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [recallModalVisible, setRecallModalVisible] = useState(false);

  // Selected Book context
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Form State - Book
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCover, setBookCover] = useState('');
  const [bookStatus, setBookStatus] = useState<Book['status']>('Not Started');

  // Form State - Reading Session
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionPages, setSessionPages] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State - Flashcard (Recall Entry)
  const [cardQuestion, setCardQuestion] = useState('');
  const [cardAnswer, setCardAnswer] = useState('');

  // Spaced Repetition Review Deck State
  const [dueCards, setDueCards] = useState<RecallEntry[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      const bList = await database.getBooks();
      const sList = await database.getReadingSessions();
      const rList = await database.getRecallEntries();

      setBooks(bList);
      setSessions(sList.sort((a, b) => b.date.localeCompare(a.date)));
      setRecalls(rList);

      // Filter due cards (review_date <= today)
      const todayStr = new Date().toISOString().slice(0, 10);
      const due = rList.filter(card => card.review_date <= todayStr);
      setDueCards(due);
      setCurrentReviewIndex(0);
      setShowAnswer(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddBook = async () => {
    if (!bookTitle.trim()) return;

    const newBook: Book = {
      id: generateUUID(),
      title: bookTitle.trim(),
      author: bookAuthor.trim() || undefined,
      cover_image: bookCover.trim() || undefined,
      status: bookStatus,
      started_date: bookStatus === 'Reading' ? new Date().toISOString().slice(0, 10) : undefined,
      finished_date: bookStatus === 'Finished' ? new Date().toISOString().slice(0, 10) : undefined,
    };

    await database.saveBook(newBook);
    setBookTitle('');
    setBookAuthor('');
    setBookCover('');
    setBookStatus('Not Started');
    setBookModalVisible(false);
    loadData();
  };

  const handleUpdateBookStatus = async (book: Book, newStatus: Book['status']) => {
    const updated: Book = {
      ...book,
      status: newStatus,
      started_date: newStatus === 'Reading' && !book.started_date ? new Date().toISOString().slice(0, 10) : book.started_date,
      finished_date: newStatus === 'Finished' ? new Date().toISOString().slice(0, 10) : book.finished_date,
    };
    await database.saveBook(updated);
    loadData();
  };

  const handleDeleteBook = async (id: string) => {
    await database.deleteBook(id);
    loadData();
  };

  const handleAddSession = async () => {
    if (!selectedBook || !sessionDuration || !sessionPages) return;

    const newSession: ReadingSession = {
      id: generateUUID(),
      book_id: selectedBook.id,
      date: sessionDate,
      duration: parseInt(sessionDuration),
      pages_read: parseInt(sessionPages),
    };

    await database.saveReadingSession(newSession);

    // Automatically update book status to "Reading" if it was "Not Started"
    if (selectedBook.status === 'Not Started') {
      await handleUpdateBookStatus(selectedBook, 'Reading');
    }

    setSessionDuration('');
    setSessionPages('');
    setSessionDate(new Date().toISOString().slice(0, 10));
    setSessionModalVisible(false);
    loadData();
  };

  const handleAddFlashcard = async () => {
    if (!selectedBook || !cardQuestion.trim() || !cardAnswer.trim()) return;

    const newCard: RecallEntry = {
      id: generateUUID(),
      book_id: selectedBook.id,
      question: cardQuestion.trim(),
      answer: cardAnswer.trim(),
      difficulty: 0, // Start at interval index 0 (Day 1)
      review_date: new Date().toISOString().slice(0, 10), // Review today immediately
    };

    await database.saveRecallEntry(newCard);
    setCardQuestion('');
    setCardAnswer('');
    setRecallModalVisible(false);
    loadData();
  };

  const handleDeleteFlashcard = async (id: string) => {
    await database.deleteRecallEntry(id);
    loadData();
  };

  // Spaced Repetition Scheduling
  const handleReviewCard = async (rating: 'easy' | 'medium' | 'hard') => {
    const card = dueCards[currentReviewIndex];
    if (!card) return;

    let nextDifficulty = card.difficulty;
    
    if (rating === 'easy') {
      // Advance to next interval tier
      nextDifficulty = Math.min(REVIEW_INTERVALS.length - 1, card.difficulty + 1);
    } else if (rating === 'hard') {
      // Reset back to Day 1
      nextDifficulty = 0;
    }
    // 'medium' keeps card.difficulty unchanged

    const intervalDays = REVIEW_INTERVALS[nextDifficulty];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    const nextReviewStr = nextReviewDate.toISOString().slice(0, 10);

    const updatedCard: RecallEntry = {
      ...card,
      difficulty: nextDifficulty,
      review_date: nextReviewStr,
    };

    await database.saveRecallEntry(updatedCard);

    // Advance index
    setShowAnswer(false);
    if (currentReviewIndex + 1 < dueCards.length) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      // Done reviewing
      loadData();
    }
  };

  // Calculations
  const booksFinished = books.filter(b => b.status === 'Finished').length;
  const totalPages = sessions.reduce((sum, s) => sum + s.pages_read, 0);

  const getBookProgressPercent = (bookId: string) => {
    const bookSessions = sessions.filter(s => s.book_id === bookId);
    const read = bookSessions.reduce((sum, s) => sum + s.pages_read, 0);
    return read; // Returns total pages read for this book
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* OS Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'shelf' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('shelf')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'shelf' ? colors.primary : colors.textMuted }]}>
            LIBRARY SHELF
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'review' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('review')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'review' ? colors.primary : colors.textMuted }]}>
            RECALL REVIEWS ({dueCards.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {activeTab === 'shelf' && (
          <View>
            {/* Library stats */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Books Completed</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{booksFinished}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setBookModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Add Book</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Total Pages Read</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.text }]}>{totalPages} pages</Text>
                </View>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted, textAlign: 'right' }]}>Due Flashcards</Text>
                  <Text style={[styles.kpiSubValue, { color: colors.secondary, textAlign: 'right' }]}>
                    {dueCards.length} cards
                  </Text>
                </View>
              </View>
            </View>

            {/* Books Shelf Grid */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>My Books</Text>
            {books.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.textMuted }}>No books in library shelf yet.</Text>
              </View>
            ) : (
              books.map(item => (
                <View key={item.id} style={[styles.bookCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.bookLeft}>
                    {/* Dummy Cover */}
                    <View style={[styles.bookCoverMock, { backgroundColor: item.status === 'Finished' ? colors.primaryContainer : colors.secondaryContainer }]}>
                      <Text style={styles.bookCoverIcon}>📚</Text>
                    </View>
                    <View style={styles.bookDetails}>
                      <Text style={[styles.bookTitleText, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.bookAuthorText, { color: colors.textMuted }]}>{item.author || 'Unknown Author'}</Text>
                      <Text style={[styles.bookStatusBadge, { color: item.status === 'Finished' ? colors.success : colors.secondary }]}>
                        {item.status} • {getBookProgressPercent(item.id)} pages logged
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookActions}>
                    {item.status !== 'Finished' && (
                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: colors.primaryContainer }]}
                        onPress={() => {
                          setSelectedBook(item);
                          setSessionModalVisible(true);
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>Log Pages</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: colors.secondaryContainer }]}
                      onPress={() => {
                        setSelectedBook(item);
                        setRecallModalVisible(true);
                      }}
                    >
                      <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: 'bold' }}>+ Flashcard</Text>
                    </TouchableOpacity>
                    
                    {/* Status change actions */}
                    <View style={styles.statusCycleRow}>
                      {item.status !== 'Reading' && item.status !== 'Finished' && (
                        <TouchableOpacity onPress={() => handleUpdateBookStatus(item, 'Reading')} style={styles.miniLink}>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>Start</Text>
                        </TouchableOpacity>
                      )}
                      {item.status === 'Reading' && (
                        <TouchableOpacity onPress={() => handleUpdateBookStatus(item, 'Finished')} style={styles.miniLink}>
                          <Text style={{ color: colors.success, fontSize: 10, fontWeight: 'bold' }}>Finish</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteBook(item.id)} style={styles.miniLink}>
                        <Text style={{ color: colors.error, fontSize: 10 }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'review' && (
          <View>
            {dueCards.length === 0 ? (
              <View style={[styles.reviewFinishedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.reviewFinishedIcon}>🎉</Text>
                <Text style={[styles.reviewFinishedTitle, { color: colors.text }]}>All Caught Up!</Text>
                <Text style={[styles.reviewFinishedSub, { color: colors.textMuted }]}>
                  No flashcards due for active recall review today.
                </Text>
              </View>
            ) : (
              <View style={[styles.flashcardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardHeaderInfo, { color: colors.textMuted }]}>
                  Review Card {currentReviewIndex + 1} of {dueCards.length}
                </Text>

                {/* Question */}
                <View style={styles.questionBox}>
                  <Text style={[styles.cardRoleLabel, { color: colors.secondary }]}>QUESTION</Text>
                  <Text style={[styles.cardTextContent, { color: colors.text }]}>
                    {dueCards[currentReviewIndex].question}
                  </Text>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                {/* Answer flip */}
                {!showAnswer ? (
                  <TouchableOpacity
                    style={[styles.flipButton, { backgroundColor: colors.secondaryContainer }]}
                    onPress={() => setShowAnswer(true)}
                  >
                    <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 14 }}>Show Answer</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.answerBox}>
                    <Text style={[styles.cardRoleLabel, { color: colors.primary }]}>ANSWER</Text>
                    <Text style={[styles.cardTextContent, { color: colors.text }]}>
                      {dueCards[currentReviewIndex].answer}
                    </Text>

                    <Text style={[styles.rateLabel, { color: colors.textMuted }]}>How well did you recall?</Text>
                    <View style={styles.rateRow}>
                      <TouchableOpacity
                        style={[styles.rateButton, { backgroundColor: colors.error }]}
                        onPress={() => handleReviewCard('hard')}
                      >
                        <Text style={styles.rateButtonText}>Hard (Day 1)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rateButton, { backgroundColor: colors.border }]}
                        onPress={() => handleReviewCard('medium')}
                      >
                        <Text style={[styles.rateButtonText, { color: colors.text }]}>Medium</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rateButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleReviewCard('easy')}
                      >
                        <Text style={styles.rateButtonText}>Easy (Skip Tier)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* List of all active flashcards */}
            {recalls.length > 0 && (
              <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>All Flashcards ({recalls.length})</Text>
                {recalls.map(card => (
                  <View key={card.id} style={[styles.flashcardRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.flashcardQ, { color: colors.text }]} numberOfLines={1}>Q: {card.question}</Text>
                      <Text style={[styles.flashcardSub, { color: colors.textMuted }]}>Next Review: {card.review_date} (Tier {card.difficulty})</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteFlashcard(card.id)}>
                      <Text style={{ color: colors.error, fontSize: 11 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Book Modal */}
      <Modal visible={bookModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Book to Library</Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Book Title"
              placeholderTextColor={colors.textMuted}
              value={bookTitle}
              onChangeText={setBookTitle}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Author"
              placeholderTextColor={colors.textMuted}
              value={bookAuthor}
              onChangeText={setBookAuthor}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Reading Status</Text>
            <View style={styles.categoryPicker}>
              {(['Not Started', 'Reading', 'Finished'] as Book['status'][]).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.pickerChip,
                    { borderColor: colors.border },
                    bookStatus === status && { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary },
                  ]}
                  onPress={() => setBookStatus(status)}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setBookModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddBook}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Pages Modal */}
      <Modal visible={sessionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Reading Session for "{selectedBook?.title}"
            </Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Session Duration (minutes)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={sessionDuration}
              onChangeText={setSessionDuration}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Pages Read"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={sessionPages}
              onChangeText={setSessionPages}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={sessionDate}
              onChangeText={setSessionDate}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setSessionModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddSession}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Flashcard Modal */}
      <Modal visible={recallModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Create Recall Flashcard for "{selectedBook?.title}"
            </Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, height: 72 }]}
              placeholder="Active Recall Question"
              placeholderTextColor={colors.textMuted}
              multiline
              value={cardQuestion}
              onChangeText={setCardQuestion}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, height: 72 }]}
              placeholder="Expected Answer"
              placeholderTextColor={colors.textMuted}
              multiline
              value={cardAnswer}
              onChangeText={setCardAnswer}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setRecallModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddFlashcard}
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
  bookCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  bookLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookCoverMock: {
    width: 48,
    height: 64,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookCoverIcon: {
    fontSize: 20,
  },
  bookDetails: {
    flex: 1,
  },
  bookTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bookAuthorText: {
    fontSize: 12,
    marginTop: 2,
  },
  bookStatusBadge: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  bookActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E3E6EB',
  },
  actionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
  },
  statusCycleRow: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
  },
  miniLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Flashcard Deck
  reviewFinishedBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFinishedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  reviewFinishedTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  reviewFinishedSub: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  flashcardContainer: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderInfo: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  cardDivider: {
    height: 0.5,
    marginVertical: 16,
  },
  questionBox: {
    minHeight: 80,
  },
  answerBox: {
    minHeight: 120,
  },
  cardRoleLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardTextContent: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  flipButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateButton: {
    flex: 0.31,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  flashcardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  flashcardQ: {
    fontSize: 13,
    fontWeight: '600',
  },
  flashcardSub: {
    fontSize: 11,
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
