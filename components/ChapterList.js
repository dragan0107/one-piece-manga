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
  Image,
} from "react-native";
import {
  initializeChapters,
  discoverNewChapters,
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
        <ActivityIndicator size="large" color="#DC3545" />
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
        <View style={styles.titleRow}>
          <Image
            source={require("../assets/splash.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleText}>
            <Text style={styles.title}>One Piece Manga</Text>
            <Text style={styles.subtitle}>
              {latestChapter} chapters available
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={checkForNewChapters}
          disabled={checkingNew}
        >
          {checkingNew ? (
            <ActivityIndicator size="small" color="#DC3545" />
          ) : (
            <Text style={styles.refreshButtonText}>Check for new chapters</Text>
          )}
        </TouchableOpacity>
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
            tintColor="#DC3545"
            colors={["#DC3545"]}
            progressBackgroundColor="#121214"
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

// One Piece Crimson Theme - Luffy's Red
const COLORS = {
  // Backgrounds - clean dark slate
  bgDeep: "#0A0A0C",
  bgSurface: "#121214",
  bgElevated: "#1A1A1E",
  bgCard: "#222228",

  // Crimson accent - Luffy's signature red
  red: "#DC3545",
  redDark: "#B52A37",
  redLight: "#FF6B78",
  redMuted: "rgba(220, 53, 69, 0.12)",

  // Text - warm and readable
  textPrimary: "#F5F5F5",
  textSecondary: "#A0A0A8",
  textMuted: "#5C5C66",

  // Utility
  success: "#22C55E",
  border: "rgba(255, 255, 255, 0.08)",
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
  },
  loadingSubtext: {
    color: COLORS.textMuted,
    marginTop: 8,
    fontSize: 13,
  },
  header: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 18,
    backgroundColor: COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 52,
    height: 52,
    marginRight: 14,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.red,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.redMuted,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  refreshButtonText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    fontSize: 16,
    marginRight: 10,
  },
  goButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
    justifyContent: "center",
  },
  goButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  listContainer: {
    padding: 14,
    paddingTop: 10,
  },
  chapterItem: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  chapterContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingVertical: 15,
  },
  chapterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  chapterNumber: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  newBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.red,
    borderRadius: 5,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
  },
  chapterArrow: {
    color: COLORS.textMuted,
    fontSize: 20,
  },
});

export default ChapterList;
