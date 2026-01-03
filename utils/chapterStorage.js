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
