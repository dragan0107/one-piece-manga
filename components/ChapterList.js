import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native";

const ChapterList = ({ navigation }) => {
  const [selectedChapter, setSelectedChapter] = useState("");
  // One Piece has 1100+ chapters - show from newest to oldest
  const [chapters] = useState(
    Array.from({ length: 1125 }, (_, i) => i + 1).reverse()
  );

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

  const renderChapterItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chapterItem}
      onPress={() => handleChapterPress(item)}
    >
      <View style={styles.chapterContent}>
        <Text style={styles.chapterNumber}>Chapter {item}</Text>
        <Text style={styles.chapterArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>One Piece Manga Reader</Text>
        <Text style={styles.subtitle}>Select a chapter to start reading</Text>
        <Text style={styles.tip}>
          💡 Try chapter 237 or higher for best results
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter chapter number"
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
  },
  tip: {
    fontSize: 12,
    color: "#FF6B35",
    marginTop: 8,
    fontStyle: "italic",
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
  chapterNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  chapterArrow: {
    color: "#FF6B35",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default ChapterList;
