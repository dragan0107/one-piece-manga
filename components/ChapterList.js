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
        <ActivityIndicator size="large" color="#FF6B35" />
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
              <ActivityIndicator size="small" color="#FF6B35" />
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
            tintColor="#FF6B35"
            colors={["#FF6B35"]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  loadingSubtext: {
    color: "#888",
    marginTop: 8,
    fontSize: 12,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  refreshButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  refreshButtonText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "500",
  },
  rediscoverButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rediscoverButtonText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  input: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginRight: 8,
  },
  goButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  goButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  chapterItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  chapterContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  chapterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  chapterNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  newBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FF6B35",
    borderRadius: 4,
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    overflow: "hidden",
  },
  chapterArrow: {
    color: "#FF6B35",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default ChapterList;
