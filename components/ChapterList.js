import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  initializeChapters,
  discoverNewChapters,
  forceRediscover,
} from "../utils/chapterStorage";

const ChapterList = ({ navigation }) => {
  const [selectedChapter, setSelectedChapter] = useState("");
  const [latestChapter, setLatestChapter] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingNew, setCheckingNew] = useState(false);
  const [initialLatest, setInitialLatest] = useState(0); // Track what we started with

  // Generate chapter list from latest to 1
  const generateChapterList = (latest) => {
    return Array.from({ length: latest }, (_, i) => latest - i);
  };

  // Initial load - discover or load cached chapters
  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const latest = await initializeChapters();
      setLatestChapter(latest);
      setInitialLatest(latest);
      setChapters(generateChapterList(latest));
    } catch (error) {
      console.log("Error loading chapters:", error);
      // Fallback to a reasonable default
      setLatestChapter(1000);
      setChapters(generateChapterList(1000));
    }
    setLoading(false);
  };

  // Check for new chapters (incremental)
  const checkForNewChapters = async () => {
    setCheckingNew(true);
    try {
      const newLatest = await discoverNewChapters(latestChapter);
      if (newLatest > latestChapter) {
        const newCount = newLatest - latestChapter;
        setLatestChapter(newLatest);
        setChapters(generateChapterList(newLatest));
        Alert.alert(
          "New Chapters Found! 🎉",
          `Found ${newCount} new chapter${
            newCount > 1 ? "s" : ""
          }! Latest is now Chapter ${newLatest}.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Up to Date",
          `No new chapters found. Latest is Chapter ${latestChapter}.`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.log("Error checking for new chapters:", error);
      Alert.alert(
        "Error",
        "Could not check for new chapters. Please try again later.",
        [{ text: "OK" }]
      );
    }
    setCheckingNew(false);
  };

  // Force full rediscovery
  const handleForceRediscover = () => {
    Alert.alert(
      "Rediscover All Chapters",
      "This will scan to find the actual latest chapter. This may take a moment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rediscover",
          onPress: async () => {
            setLoading(true);
            try {
              const latest = await forceRediscover();
              setLatestChapter(latest);
              setInitialLatest(latest);
              setChapters(generateChapterList(latest));
              Alert.alert(
                "Discovery Complete",
                `Found ${latest} chapters available.`,
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to rediscover chapters.", [
                { text: "OK" },
              ]);
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkForNewChapters();
    setRefreshing(false);
  }, [latestChapter]);

  const handleChapterPress = (chapter) => {
    navigation.navigate("MangaReader", {
      chapter: chapter,
      startPage: 1,
    });
  };

  const handleGoToChapter = () => {
    const chapterNum = parseInt(selectedChapter);
    if (chapterNum && chapterNum > 0) {
      handleChapterPress(chapterNum);
    }
  };

  const renderChapterItem = ({ item }) => {
    const isNew = item > initialLatest && initialLatest > 0;
    return (
      <TouchableOpacity
        style={styles.chapterItem}
        onPress={() => handleChapterPress(item)}
      >
        <View style={styles.chapterContent}>
          <View style={styles.chapterInfo}>
            <Text style={styles.chapterNumber}>Chapter {item}</Text>
            {isNew && <Text style={styles.newBadge}>NEW</Text>}
          </View>
          <Text style={styles.chapterArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E6A54A" />
        <Text style={styles.loadingText}>
          {latestChapter === 0
            ? "Discovering chapters..."
            : "Loading chapters..."}
        </Text>
        <Text style={styles.loadingSubtext}>
          This may take a moment on first launch
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>One Piece Manga</Text>
        <Text style={styles.subtitle}>{latestChapter} chapters available</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkForNewChapters}
            disabled={checkingNew}
          >
            {checkingNew ? (
              <ActivityIndicator size="small" color="#E6A54A" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄 Check New</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rediscoverButton}
            onPress={handleForceRediscover}
            disabled={loading}
          >
            <Text style={styles.rediscoverButtonText}>🔍 Rediscover</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Jump to chapter..."
          placeholderTextColor="#888"
          value={selectedChapter}
          onChangeText={setSelectedChapter}
          keyboardType="numeric"
          returnKeyType="go"
          onSubmitEditing={handleGoToChapter}
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGoToChapter}>
          <Text style={styles.goButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chapters}
        renderItem={renderChapterItem}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E6A54A"
            colors={["#E6A54A"]}
            progressBackgroundColor="#16161A"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={15}
        getItemLayout={(_, index) => ({
          length: 68,
          offset: 68 * index,
          index,
        })}
      />
    </View>
  );
};

// One Piece Treasure Gold Theme
const COLORS = {
  // Backgrounds
  bgDeep: "#0D0D0F",
  bgSurface: "#16161A",
  bgElevated: "#1E1E24",
  bgCard: "#252530",

  // Gold accent spectrum
  gold: "#E6A54A",
  goldDark: "#C8893A",
  goldLight: "#F5C97A",
  goldMuted: "rgba(230, 165, 74, 0.15)",

  // Text
  textPrimary: "#FAFAFA",
  textSecondary: "#B8B8C0",
  textMuted: "#6B6B78",

  // Accents
  success: "#4ADE80",
  error: "#EF4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgDeep,
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 20,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  loadingSubtext: {
    color: COLORS.textMuted,
    marginTop: 8,
    fontSize: 13,
  },
  header: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.goldMuted,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.gold,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  refreshButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.goldMuted,
  },
  refreshButtonText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "600",
  },
  rediscoverButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rediscoverButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  goButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goButtonText: {
    color: COLORS.bgDeep,
    fontSize: 16,
    fontWeight: "700",
  },
  listContainer: {
    padding: 16,
    paddingTop: 12,
  },
  chapterItem: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  chapterContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    paddingVertical: 16,
  },
  chapterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  chapterNumber: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  newBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    color: COLORS.bgDeep,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    overflow: "hidden",
  },
  chapterArrow: {
    color: COLORS.goldDark,
    fontSize: 22,
    fontWeight: "300",
    opacity: 0.7,
  },
});

export default ChapterList;
