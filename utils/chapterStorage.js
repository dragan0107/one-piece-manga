import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";

const STORAGE_KEY = "@one_piece_manga_latest_chapter";
const BASE_URLS = [
  "https://hot.planeptune.us/manga/One-Piece",
  "https://scans-hot.planeptune.us/manga/One-Piece",
];

// We know One Piece has at least this many chapters
const BASELINE_CHAPTER = 1100;

/**
 * Get the latest known chapter number from local storage
 */
export const getLatestChapter = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return parseInt(stored, 10);
    }
    return null;
  } catch (error) {
    console.log("Error reading latest chapter:", error);
    return null;
  }
};

/**
 * Save the latest known chapter number to local storage
 */
export const saveLatestChapter = async (chapter) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, chapter.toString());
  } catch (error) {
    console.log("Error saving latest chapter:", error);
  }
};

/**
 * Check if a chapter exists using expo-image's prefetch
 * This is the same library used to display images in the reader
 */
const checkChapterExists = async (chapter) => {
  const chapterNum = String(chapter).padStart(4, "0");

  for (const baseUrl of BASE_URLS) {
    const url = `${baseUrl}/${chapterNum}-001.png`;

    try {
      console.log(`Checking: ${url}`);

      // expo-image prefetch with timeout
      const result = await Promise.race([
        Image.prefetch(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 20000)
        ),
      ]);

      // expo-image prefetch returns true on success
      if (result === true) {
        console.log(`✓ Chapter ${chapter} EXISTS`);
        return true;
      }
    } catch (error) {
      console.log(`Chapter ${chapter} error at ${baseUrl}: ${error.message}`);
      // Try next URL
    }
  }

  console.log(`✗ Chapter ${chapter} NOT FOUND`);
  return false;
};

/**
 * Find the latest chapter using jump + binary search
 */
const findLatestChapter = async (startFrom) => {
  console.log(`\n========================================`);
  console.log(`Starting chapter discovery from ${startFrom}`);
  console.log(`========================================\n`);

  // Step 1: Verify our starting point works
  console.log(`Step 1: Verifying chapter ${startFrom}...`);
  let verified = await checkChapterExists(startFrom);

  if (!verified) {
    console.log(`Could not verify ${startFrom}, trying lower chapters...`);
    for (let test = 1050; test >= 900; test -= 50) {
      console.log(`Testing ${test}...`);
      if (await checkChapterExists(test)) {
        startFrom = test;
        verified = true;
        console.log(`Found working chapter: ${test}`);
        break;
      }
    }
    if (!verified) {
      console.log("ERROR: Cannot connect to server!");
      return BASELINE_CHAPTER;
    }
  }

  // Step 2: Jump ahead to find where chapters stop existing
  console.log(`\nStep 2: Finding upper bound (jumping by 25)...`);

  let lastConfirmed = startFrom;
  let current = startFrom;
  const jump = 25;

  while (current < 2000) {
    current += jump;
    console.log(`Checking ${current}...`);

    const exists = await checkChapterExists(current);

    if (exists) {
      lastConfirmed = current;
      console.log(`  → Chapter ${current} exists, continuing...`);
    } else {
      console.log(`  → Chapter ${current} doesn't exist, found upper bound!`);
      break;
    }
  }

  // Step 3: Binary search between lastConfirmed and current
  let low = lastConfirmed;
  let high = current;

  console.log(`\nStep 3: Binary search between ${low} and ${high}...`);

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    console.log(`Checking ${mid}...`);

    const exists = await checkChapterExists(mid);

    if (exists) {
      low = mid;
      console.log(`  → Exists, low = ${low}`);
    } else {
      high = mid - 1;
      console.log(`  → Doesn't exist, high = ${high}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`DISCOVERY COMPLETE: Latest = ${low}`);
  console.log(`========================================\n`);

  return low;
};

/**
 * Discover the actual latest chapter
 */
export const discoverLatestChapter = async (startFrom = null) => {
  const start = startFrom || BASELINE_CHAPTER;
  const latest = await findLatestChapter(start);
  await saveLatestChapter(latest);
  return latest;
};

/**
 * Check for new chapters beyond current known latest
 */
export const discoverNewChapters = async (currentLatest) => {
  console.log(`\nChecking for chapters beyond ${currentLatest}...`);

  let latestFound = currentLatest;
  let consecutiveMisses = 0;
  let chapter = currentLatest + 1;

  while (consecutiveMisses < 5 && chapter <= currentLatest + 20) {
    console.log(`Checking chapter ${chapter}...`);

    const exists = await checkChapterExists(chapter);

    if (exists) {
      latestFound = chapter;
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
    }

    chapter++;
  }

  if (latestFound > currentLatest) {
    const newCount = latestFound - currentLatest;
    console.log(`Found ${newCount} new chapter(s)!`);
    await saveLatestChapter(latestFound);
  } else {
    console.log("No new chapters found");
  }

  return latestFound;
};

/**
 * Initialize chapters - load from cache or discover
 */
export const initializeChapters = async () => {
  const stored = await getLatestChapter();

  if (stored !== null && stored >= BASELINE_CHAPTER) {
    console.log(`Using cached latest chapter: ${stored}`);
    return stored;
  }

  console.log("No cache, starting discovery...");
  return await discoverLatestChapter();
};

/**
 * Force a full rediscovery (clears cache)
 */
export const forceRediscover = async () => {
  console.log("\n*** FORCE REDISCOVERY ***\n");
  await AsyncStorage.removeItem(STORAGE_KEY);
  return await discoverLatestChapter(BASELINE_CHAPTER);
};

/**
 * Clear storage (for debugging)
 */
export const clearStorage = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log("Storage cleared");
};

// ============================================
// VISITED & COMPLETED CHAPTERS (Simple)
// ============================================

const VISITED_KEY = "@one_piece_visited_chapters";
const COMPLETED_KEY = "@one_piece_completed_chapters";

/**
 * Add a chapter to visited list (called when opening a chapter)
 * Keeps only the last 10 visited, excludes completed chapters
 */
export const addVisitedChapter = async (chapterNum) => {
  try {
    const [visitedJson, completedJson] = await Promise.all([
      AsyncStorage.getItem(VISITED_KEY),
      AsyncStorage.getItem(COMPLETED_KEY),
    ]);
    
    const visited = visitedJson ? JSON.parse(visitedJson) : [];
    const completed = completedJson ? JSON.parse(completedJson) : [];
    
    // Don't add to visited if it's already completed
    if (completed.includes(chapterNum)) {
      return;
    }
    
    // Remove if already in visited (will re-add at top)
    const filtered = visited.filter((v) => v.chapter !== chapterNum);
    
    // Add to front with timestamp
    filtered.unshift({
      chapter: chapterNum,
      visitedAt: new Date().toISOString(),
    });
    
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    
    await AsyncStorage.setItem(VISITED_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.log("Error adding visited chapter:", error);
  }
};

/**
 * Get recently visited chapters (up to 10, excludes completed)
 */
export const getVisitedChapters = async () => {
  try {
    const [visitedJson, completedJson] = await Promise.all([
      AsyncStorage.getItem(VISITED_KEY),
      AsyncStorage.getItem(COMPLETED_KEY),
    ]);
    
    const visited = visitedJson ? JSON.parse(visitedJson) : [];
    const completed = completedJson ? JSON.parse(completedJson) : [];
    
    // Filter out any that are now completed
    return visited.filter((v) => !completed.includes(v.chapter));
  } catch (error) {
    console.log("Error getting visited chapters:", error);
    return [];
  }
};

/**
 * Mark a chapter as completed
 */
export const markChapterCompleted = async (chapterNum) => {
  try {
    const [completedJson, visitedJson] = await Promise.all([
      AsyncStorage.getItem(COMPLETED_KEY),
      AsyncStorage.getItem(VISITED_KEY),
    ]);
    
    const completed = completedJson ? JSON.parse(completedJson) : [];
    const visited = visitedJson ? JSON.parse(visitedJson) : [];
    
    // Add to completed if not already there
    if (!completed.includes(chapterNum)) {
      completed.push(chapterNum);
      await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
    }
    
    // Remove from visited
    const filteredVisited = visited.filter((v) => v.chapter !== chapterNum);
    if (filteredVisited.length !== visited.length) {
      await AsyncStorage.setItem(VISITED_KEY, JSON.stringify(filteredVisited));
    }
    
    console.log(`✓ Chapter ${chapterNum} marked as completed`);
  } catch (error) {
    console.log("Error marking chapter completed:", error);
  }
};

/**
 * Unmark a chapter as completed
 */
export const unmarkChapterCompleted = async (chapterNum) => {
  try {
    const completedJson = await AsyncStorage.getItem(COMPLETED_KEY);
    const completed = completedJson ? JSON.parse(completedJson) : [];
    
    const filtered = completed.filter((c) => c !== chapterNum);
    await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(filtered));
    
    console.log(`✗ Chapter ${chapterNum} unmarked as completed`);
  } catch (error) {
    console.log("Error unmarking chapter completed:", error);
  }
};

/**
 * Check if a chapter is completed
 */
export const isChapterCompleted = async (chapterNum) => {
  try {
    const completedJson = await AsyncStorage.getItem(COMPLETED_KEY);
    const completed = completedJson ? JSON.parse(completedJson) : [];
    return completed.includes(chapterNum);
  } catch (error) {
    console.log("Error checking chapter completed:", error);
    return false;
  }
};

/**
 * Get all completed chapters (sorted descending)
 */
export const getCompletedChapters = async () => {
  try {
    const completedJson = await AsyncStorage.getItem(COMPLETED_KEY);
    const completed = completedJson ? JSON.parse(completedJson) : [];
    return completed.sort((a, b) => b - a); // Sort descending
  } catch (error) {
    console.log("Error getting completed chapters:", error);
    return [];
  }
};

/**
 * Get set of completed chapters for quick lookup
 */
export const getCompletedChaptersSet = async () => {
  try {
    const completedJson = await AsyncStorage.getItem(COMPLETED_KEY);
    const completed = completedJson ? JSON.parse(completedJson) : [];
    return new Set(completed);
  } catch (error) {
    console.log("Error getting completed set:", error);
    return new Set();
  }
};