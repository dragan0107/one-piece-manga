import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import {
  addVisitedChapter,
  isChapterCompleted,
  markChapterCompleted,
  unmarkChapterCompleted,
} from "../utils/chapterStorage";
import { PAGE_HEIGHT, CONTROLS_HEIGHT } from "../utils/mangaConfig";
import { styles, COLORS } from "./manga/styles";
import ZoomablePage from "./manga/ZoomablePage";
import ReaderControls from "./manga/ReaderControls";

const MangaReader = ({ route, navigation }) => {
  const { chapter, startPage = 1 } = route.params || {
    chapter: 237,
    startPage: 1,
  };
  const [currentPage, setCurrentPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [allFailed, setAllFailed] = useState(false);
  const [chapterEnd, setChapterEnd] = useState(null);
  const [maxPagesToShow, setMaxPagesToShow] = useState(25);
  const [workingUrlIndex, setWorkingUrlIndex] = useState(null);
  const [isAnyPageZoomed, setIsAnyPageZoomed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isColored, setIsColored] = useState(false);
  const [coloredAvailable, setColoredAvailable] = useState(false);
  const flatListRef = useRef(null);
  const hasAddedToVisited = useRef(false);

  // Digital Colored Comics are available up to approximately this chapter
  const COLORED_MAX_CHAPTER = 1100;

  // Check completion status and colored availability on mount
  useEffect(() => {
    hasAddedToVisited.current = false;
    isChapterCompleted(chapter).then(setIsCompleted);

    // Colored versions are available for chapters up to ~1100
    // The actual availability will be confirmed when loading the first page
    setColoredAvailable(chapter <= COLORED_MAX_CHAPTER);
    setIsColored(false);
  }, [chapter]);

  // Toggle completion status
  const toggleCompleted = async () => {
    if (isCompleted) {
      await unmarkChapterCompleted(chapter);
      setIsCompleted(false);
    } else {
      await markChapterCompleted(chapter);
      setIsCompleted(true);
    }
  };

  // Toggle colored mode
  const toggleColored = useCallback(() => {
    setIsColored((prev) => !prev);
    // Reset page loading state when switching modes
    setLoadedPages({});
    setTotalPages(0);
    setChapterEnd(null);
    setMaxPagesToShow(25);
    setLoading(true);
  }, []);

  // Handle zoom state changes from ZoomablePage
  const handleZoomChange = useCallback((zoomed) => {
    setIsAnyPageZoomed(zoomed);
  }, []);

  const availablePages = useMemo(() => {
    if (chapterEnd !== null) {
      return Array.from({ length: chapterEnd - 1 }, (_, i) => i + 1);
    }
    return Array.from({ length: maxPagesToShow }, (_, i) => i + 1);
  }, [chapterEnd, maxPagesToShow]);

  // Reset state when chapter changes
  useEffect(() => {
    setLoading(true);
    setLoadedPages({});
    setTotalPages(0);
    setAllFailed(false);
    setChapterEnd(null);
    setMaxPagesToShow(25);
    setWorkingUrlIndex(null);
    setCurrentPage(startPage);
  }, [chapter]);

  // Scroll to start page when loaded
  useEffect(() => {
    if (totalPages > 0 && startPage > 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: Math.min(startPage - 1, availablePages.length - 1),
          animated: false,
        });
      }, 300);
    }
  }, [totalPages, startPage, availablePages.length]);

  const handleImageLoad = useCallback(
    (page, urlIndex) => {
      // Remember which URL works for this chapter
      if (workingUrlIndex === null) {
        setWorkingUrlIndex(urlIndex);
      }

      // Add to visited only once, when first page loads successfully
      if (!hasAddedToVisited.current) {
        hasAddedToVisited.current = true;
        addVisitedChapter(chapter);
      }

      setLoadedPages((prev) => {
        const updated = { ...prev, [page]: "loaded" };
        const loadedCount = Object.values(updated).filter(
          (v) => v === "loaded"
        ).length;
        if (loadedCount > 0) {
          setLoading(false);
          const maxLoaded = Math.max(
            ...Object.keys(updated)
              .filter((k) => updated[k] === "loaded")
              .map(Number)
          );
          setTotalPages(maxLoaded);

          setMaxPagesToShow((currentMax) => {
            if (maxLoaded >= currentMax - 3 && !prev[currentMax + 1]) {
              return currentMax + 20;
            }
            return currentMax;
          });
        }
        return updated;
      });
    },
    [workingUrlIndex, chapter]
  );

  const handleImageError = useCallback((page) => {
    setLoadedPages((prev) => {
      const updated = { ...prev, [page]: "error" };

      const loadedPageNumbers = Object.keys(updated)
        .filter((k) => updated[k] === "loaded")
        .map(Number);

      if (loadedPageNumbers.length > 0) {
        const maxLoaded = Math.max(...loadedPageNumbers);
        let allAfterMaxFailed = true;
        for (let p = maxLoaded + 1; p <= page; p++) {
          if (updated[p] !== "error") {
            allAfterMaxFailed = false;
            break;
          }
        }
        if (allAfterMaxFailed && page >= maxLoaded + 1) {
          setChapterEnd(maxLoaded + 1);
          setTotalPages(maxLoaded);
        }
      } else {
        const totalChecked = Object.keys(updated).length;
        const allErrors = Object.values(updated).every((v) => v === "error");
        if (totalChecked >= 5 && allErrors) {
          setAllFailed(true);
          setLoading(false);
        }
      }

      return updated;
    });
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visiblePage = viewableItems[0].item;
      setCurrentPage(visiblePage);
      setIsAnyPageZoomed(false);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToPage = useCallback(
    (page) => {
      const maxPage = totalPages > 0 ? totalPages : availablePages.length;
      if (page >= 1 && page <= maxPage) {
        flatListRef.current?.scrollToIndex({
          index: page - 1,
          animated: true,
        });
      }
    },
    [totalPages, availablePages.length]
  );

  const goToNextPage = () => {
    const maxPage = totalPages > 0 ? totalPages : availablePages.length;
    if (currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextChapter = () => {
    navigation.replace("MangaReader", {
      chapter: chapter + 1,
      startPage: 1,
    });
  };

  const goToPrevChapter = () => {
    if (chapter > 1) {
      navigation.replace("MangaReader", {
        chapter: chapter - 1,
        startPage: 1,
      });
    }
  };

  const renderPage = useCallback(
    ({ item: page }) => (
      <ZoomablePage
        chapter={chapter}
        page={page}
        isColored={isColored}
        onLoad={(urlIndex) => handleImageLoad(page, urlIndex)}
        onError={() => {}}
        onFinalError={() => handleImageError(page)}
        onZoomChange={handleZoomChange}
      />
    ),
    [chapter, isColored, handleImageLoad, handleImageError, handleZoomChange]
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: PAGE_HEIGHT,
      offset: PAGE_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback(
    (item) => `${item}-${isColored ? "color" : "bw"}`,
    [isColored]
  );

  if (allFailed) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No pages found for Chapter {chapter}
        </Text>
        <Text style={styles.errorSubtext}>
          This chapter may not be available
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator
            size="large"
            color={isColored ? COLORS.rainbow : COLORS.red}
          />
          <Text style={styles.loadingText}>
            Loading Chapter {chapter}
            {isColored ? " (Color)" : ""}...
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={availablePages}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: CONTROLS_HEIGHT }}
        snapToInterval={PAGE_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={100}
        scrollEnabled={!isAnyPageZoomed}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        disableIntervalMomentum={false}
        overScrollMode="never"
        bounces={false}
        nestedScrollEnabled={true}
      />

      <ReaderControls
        currentPage={currentPage}
        totalPages={totalPages}
        chapter={chapter}
        isCompleted={isCompleted}
        isColored={isColored}
        coloredAvailable={coloredAvailable}
        onPrevPage={goToPrevPage}
        onNextPage={goToNextPage}
        onPrevChapter={goToPrevChapter}
        onNextChapter={goToNextChapter}
        onToggleCompleted={toggleCompleted}
        onToggleColored={toggleColored}
      />
    </View>
  );
};

export default MangaReader;
