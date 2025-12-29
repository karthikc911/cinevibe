import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Globe, Film, Save, Star, Calendar, DollarSign, MessageSquare, Minus, Plus } from 'lucide-react-native';
import { Colors } from '../lib/constants';
import { useAppStore } from '../lib/store';
import { userApi } from '../lib/api';

// Use SAME language values as website (full names, not codes)
const LANGUAGES = [
  { value: 'English', name: 'English', flag: '🇺🇸' },
  { value: 'Hindi', name: 'Hindi', flag: '🇮🇳' },
  { value: 'Tamil', name: 'Tamil', flag: '🇮🇳' },
  { value: 'Telugu', name: 'Telugu', flag: '🇮🇳' },
  { value: 'Malayalam', name: 'Malayalam', flag: '🇮🇳' },
  { value: 'Kannada', name: 'Kannada', flag: '🇮🇳' },
  { value: 'Korean', name: 'Korean', flag: '🇰🇷' },
  { value: 'Japanese', name: 'Japanese', flag: '🇯🇵' },
  { value: 'Spanish', name: 'Spanish', flag: '🇪🇸' },
  { value: 'French', name: 'French', flag: '🇫🇷' },
  { value: 'German', name: 'German', flag: '🇩🇪' },
  { value: 'Italian', name: 'Italian', flag: '🇮🇹' },
  { value: 'Portuguese', name: 'Portuguese', flag: '🇧🇷' },
  { value: 'Chinese', name: 'Chinese', flag: '🇨🇳' },
  { value: 'Thai', name: 'Thai', flag: '🇹🇭' },
  { value: 'Turkish', name: 'Turkish', flag: '🇹🇷' },
];

// Use SAME genre values as website (capitalized)
const GENRES = [
  { value: 'Action', name: 'Action', emoji: '💥' },
  { value: 'Adventure', name: 'Adventure', emoji: '🗺️' },
  { value: 'Animation', name: 'Animation', emoji: '🎨' },
  { value: 'Comedy', name: 'Comedy', emoji: '😂' },
  { value: 'Crime', name: 'Crime', emoji: '🔍' },
  { value: 'Documentary', name: 'Documentary', emoji: '📹' },
  { value: 'Drama', name: 'Drama', emoji: '🎭' },
  { value: 'Family', name: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'Fantasy', name: 'Fantasy', emoji: '🧙‍♂️' },
  { value: 'History', name: 'History', emoji: '📜' },
  { value: 'Horror', name: 'Horror', emoji: '👻' },
  { value: 'Music', name: 'Music', emoji: '🎵' },
  { value: 'Mystery', name: 'Mystery', emoji: '🕵️' },
  { value: 'Romance', name: 'Romance', emoji: '💕' },
  { value: 'Science Fiction', name: 'Sci-Fi', emoji: '🚀' },
  { value: 'Thriller', name: 'Thriller', emoji: '😱' },
  { value: 'War', name: 'War', emoji: '⚔️' },
  { value: 'Western', name: 'Western', emoji: '🤠' },
];

const currentYear = new Date().getFullYear();

export default function PreferencesScreen() {
  const router = useRouter();
  const { user, isUsingDemoMode, setUser } = useAppStore();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [aiInstructions, setAiInstructions] = useState('');
  const [recYearFrom, setRecYearFrom] = useState(1900);
  const [recYearTo, setRecYearTo] = useState(currentYear);
  const [recMinImdb, setRecMinImdb] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      if (!isUsingDemoMode) {
        console.log('[PREFERENCES] Loading from API...');
        const prefs = await userApi.getPreferences();
        console.log('[PREFERENCES] Loaded:', prefs);
        
        if (prefs.languages && Array.isArray(prefs.languages)) {
          setSelectedLanguages(prefs.languages);
        }
        if (prefs.genres && Array.isArray(prefs.genres)) {
          setSelectedGenres(prefs.genres);
        }
        if (prefs.aiInstructions) {
          setAiInstructions(prefs.aiInstructions);
        }
        if (prefs.recYearFrom !== null && prefs.recYearFrom !== undefined) {
          setRecYearFrom(prefs.recYearFrom);
        }
        if (prefs.recYearTo !== null && prefs.recYearTo !== undefined) {
          setRecYearTo(prefs.recYearTo);
        }
        if (prefs.recMinImdb !== null && prefs.recMinImdb !== undefined) {
          setRecMinImdb(prefs.recMinImdb);
        }
      } else {
        // Demo defaults
        setSelectedLanguages(['English', 'Hindi']);
        setSelectedGenres(['Action', 'Drama', 'Thriller']);
      }
    } catch (error) {
      console.error('[PREFERENCES] Error loading preferences:', error);
      // Use user object from store as fallback
      if (user?.languages && Array.isArray(user.languages)) {
        setSelectedLanguages(user.languages);
      }
      if (user?.genres && Array.isArray(user.genres)) {
        setSelectedGenres(user.genres);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (value: string) => {
    setSelectedLanguages(prev =>
      prev.includes(value)
        ? prev.filter(l => l !== value)
        : [...prev, value]
    );
  };

  const toggleGenre = (value: string) => {
    setSelectedGenres(prev =>
      prev.includes(value)
        ? prev.filter(g => g !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (selectedLanguages.length === 0) {
      Alert.alert('Error', 'Please select at least one language');
      return;
    }

    setSaving(true);
    try {
      if (!isUsingDemoMode) {
        console.log('[PREFERENCES] Saving:', { 
          selectedLanguages, 
          selectedGenres, 
          aiInstructions,
          recYearFrom,
          recYearTo,
          recMinImdb
        });
        
        await userApi.updatePreferences(
          selectedLanguages, 
          selectedGenres,
          aiInstructions,
          recYearFrom,
          recYearTo,
          recMinImdb
        );
        
        // Update local user object in store
        if (user) {
          setUser({
            ...user,
            languages: selectedLanguages,
            genres: selectedGenres,
          });
        }
      }
      Alert.alert('Success', 'Preferences saved! Your recommendations will now be personalized.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[PREFERENCES] Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Preferences</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <>
              <Save color={Colors.background} size={18} />
              <Text style={styles.saveText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Current Selection Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} • {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''} selected
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Languages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe color={Colors.primary} size={22} />
            <Text style={styles.sectionTitle}>Preferred Languages</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Select languages for movie/TV show recommendations
          </Text>
          <View style={styles.optionsGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.optionChip,
                  selectedLanguages.includes(lang.value) && styles.optionChipSelected,
                ]}
                onPress={() => toggleLanguage(lang.value)}
              >
                <Text style={styles.optionEmoji}>{lang.flag}</Text>
                <Text style={[
                  styles.optionText,
                  selectedLanguages.includes(lang.value) && styles.optionTextSelected,
                ]}>
                  {lang.name}
                </Text>
                {selectedLanguages.includes(lang.value) && (
                  <Check color={Colors.background} size={16} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Genres Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Film color={Colors.secondary} size={22} />
            <Text style={styles.sectionTitle}>Favorite Genres</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Select genres you enjoy watching
          </Text>
          <View style={styles.optionsGrid}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre.value}
                style={[
                  styles.optionChip,
                  selectedGenres.includes(genre.value) && styles.optionChipSelectedGenre,
                ]}
                onPress={() => toggleGenre(genre.value)}
              >
                <Text style={styles.optionEmoji}>{genre.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedGenres.includes(genre.value) && styles.optionTextSelected,
                ]}>
                  {genre.name}
                </Text>
                {selectedGenres.includes(genre.value) && (
                  <Check color={Colors.background} size={16} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Recommendation Filters */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star color="#fbbf24" size={22} />
            <Text style={styles.sectionTitle}>AI Recommendation Filters</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Fine-tune what AI recommends to you
          </Text>

          {/* Year Range */}
          <View style={styles.filterItem}>
            <View style={styles.filterHeader}>
              <Calendar color={Colors.textSecondary} size={18} />
              <Text style={styles.filterLabel}>Year Range</Text>
            </View>
            <View style={styles.stepperRow}>
              <View style={styles.stepperItem}>
                <Text style={styles.stepperLabel}>From</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity 
                    style={styles.stepperButton}
                    onPress={() => setRecYearFrom(Math.max(1900, recYearFrom - 5))}
                  >
                    <Minus color={Colors.text} size={18} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{recYearFrom === 1900 ? 'Any' : recYearFrom}</Text>
                  <TouchableOpacity 
                    style={styles.stepperButton}
                    onPress={() => setRecYearFrom(Math.min(recYearTo - 1, recYearFrom + 5))}
                  >
                    <Plus color={Colors.text} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.yearSeparator}>→</Text>
              <View style={styles.stepperItem}>
                <Text style={styles.stepperLabel}>To</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity 
                    style={styles.stepperButton}
                    onPress={() => setRecYearTo(Math.max(recYearFrom + 1, recYearTo - 5))}
                  >
                    <Minus color={Colors.text} size={18} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{recYearTo}</Text>
                  <TouchableOpacity 
                    style={styles.stepperButton}
                    onPress={() => setRecYearTo(Math.min(currentYear, recYearTo + 5))}
                  >
                    <Plus color={Colors.text} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Min IMDB Rating */}
          <View style={styles.filterItem}>
            <View style={styles.filterHeader}>
              <Star color="#fbbf24" size={18} fill="#fbbf24" />
              <Text style={styles.filterLabel}>Minimum IMDB Rating</Text>
            </View>
            <View style={styles.imdbStepperContainer}>
              <TouchableOpacity 
                style={styles.imdbStepperButton}
                onPress={() => {
                  const newVal = (recMinImdb ?? 0) - 0.5;
                  setRecMinImdb(newVal <= 0 ? null : newVal);
                }}
              >
                <Minus color="#fbbf24" size={20} />
              </TouchableOpacity>
              <View style={styles.imdbValue}>
                <Star color="#fbbf24" size={24} fill="#fbbf24" />
                <Text style={styles.imdbValueText}>
                  {recMinImdb !== null ? `${recMinImdb.toFixed(1)}/10` : 'Any'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.imdbStepperButton}
                onPress={() => {
                  const newVal = Math.min(9, (recMinImdb ?? 0) + 0.5);
                  setRecMinImdb(newVal);
                }}
              >
                <Plus color="#fbbf24" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sliderHint}>Tap - to set "Any Rating"</Text>
          </View>
        </View>

        {/* AI Instructions / User Note */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare color={Colors.primary} size={22} />
            <Text style={styles.sectionTitle}>AI Instructions (User Note)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Tell the AI what kind of content you prefer or want to avoid
          </Text>
          <TextInput
            style={styles.aiInstructionsInput}
            placeholder="E.g., I prefer movies with strong female leads, avoid horror with jumpscares, love psychological thrillers..."
            placeholderTextColor={Colors.textMuted}
            value={aiInstructions}
            onChangeText={setAiInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionChipSelectedGenre: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.background,
  },
  filterItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  yearRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  yearInput: {
    alignItems: 'center',
  },
  yearLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  yearValue: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  yearSeparator: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperItem: {
    alignItems: 'center',
  },
  stepperLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  sliderHint: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  imdbStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  imdbStepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  imdbValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imdbValueText: {
    color: '#fbbf24',
    fontSize: 28,
    fontWeight: '700',
  },
  aiInstructionsInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomPadding: {
    height: 40,
  },
});
