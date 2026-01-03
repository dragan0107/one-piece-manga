import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import ImageZoom from "react-native-image-pan-zoom";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Two possible base URLs - older chapters use one, newer chapters use the other
const BASE_URLS = [
  "https://hot.planeptune.us/manga/One-Piece",
  "https://scans-hot.planeptune.us/manga/One-Piece",
];

const CONTROLS_HEIGHT = 130;
const PAGE_HEIGHT = SCREEN_HEIGHT - CONTROLS_HEIGHT;

// Render images at 2x resolution for sharp zooming
const IMAGE_SCALE = 2;

// Generate image URL based on chapter, page, and URL index
const getImageUrl = (chapter, page, urlIndex = 0) => {
  const chapterNum = String(chapter).padStart(4, "0");
  const pageNum = String(page).padStart(3, "0");
  return `${BASE_URLS[urlIndex]}/${chapterNum}-${pageNum}.png`;
};

// Memoized zoomable image component with high-res support
const ZoomablePage = memo(
  ({ chapter, page, onLoad, onError, onFinalError, onZoomChange }) => {
    const [urlIndex, setUrlIndex] = useState(0);
    const [hasTriedAll, setHasTriedAll] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const imageZoomRef = useRef(null);

    // High-res dimensions
    const imageWidth = SCREEN_WIDTH * IMAGE_SCALE;
    const imageHeight = (PAGE_HEIGHT - 20) * IMAGE_SCALE;

    const minScale = 1 / IMAGE_SCALE;

    // Reset when chapter changes
    useEffect(() => {
      setUrlIndex(0);
      setHasTriedAll(false);
      setIsZoomed(false);
      setHasInitialized(false);
    }, [chapter]);

    // Mark as initialized after first render
    useEffect(() => {
      if (!hasInitialized) {
        const timer = setTimeout(() => setHasInitialized(true), 100);
        return () => clearTimeout(timer);
      }
    }, [hasInitialized]);

    // Initial position - only used on first render
    const initialPosition = useMemo(
      () => ({
        x: 0,
        y: 0,
        scale: minScale,
        duration: 0,
      }),
      [minScale]
    );

    const handleLoad = useCallback(() => {
      onLoad(urlIndex);
    }, [onLoad, urlIndex]);

    const handleError = useCallback(() => {
      if (urlIndex < BASE_URLS.length - 1) {
        // Try next URL
        setUrlIndex((prev) => prev + 1);
      } else {
        // All URLs failed
        setHasTriedAll(true);
        onFinalError();
      }
    }, [urlIndex, onFinalError]);

    // Track when user zooms in/out
    const handleMove = useCallback(
      (position) => {
        const zoomed = position.scale > minScale + 0.05;
        if (zoomed !== isZoomed) {
          setIsZoomed(zoomed);
          onZoomChange?.(zoomed);
        }
      },
      [minScale, isZoomed, onZoomChange]
    );

    // Reset zoom to initial state
    const handleDoubleClick = useCallback(() => {
      // Do nothing - we want to disable double-click zoom entirely
    }, []);

    return (
      <View style={styles.pageContainer}>
        <ImageZoom
          ref={imageZoomRef}
          cropWidth={SCREEN_WIDTH}
          cropHeight={PAGE_HEIGHT}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          minScale={minScale}
          maxScale={4}
          enableSwipeDown={false}
          enableCenterFocus={false}
          enableDoubleClickZoom={false}
          doubleClickInterval={0}
          onMove={handleMove}
          onDoubleClick={handleDoubleClick}
          centerOn={!hasInitialized ? initialPosition : undefined}
          style={styles.imageZoom}
        >
          <Image
            source={{ uri: getImageUrl(chapter, page, urlIndex) }}
            style={{ width: imageWidth, height: imageHeight }}
            contentFit="contain"
            transition={100}
            cachePolicy="disk"
            onLoad={handleLoad}
            onError={handleError}
          />
        </ImageZoom>
        {hasTriedAll && (
          <View style={styles.errorPage}>
            <Text style={styles.errorPageText}>Page {page} not available</Text>
          </View>
        )}
      </View>
    );
  }
);

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
  const [workingUrlIndex, setWorkingUrlIndex] = useState(null); // Track which URL works for this chapter
  const [isAnyPageZoomed, setIsAnyPageZoomed] = useState(false); // Track if any page is zoomed
  const flatListRef = useRef(null);

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
    [workingUrlIndex]
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
      // Reset zoom state when changing pages
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
        onLoad={(urlIndex) => handleImageLoad(page, urlIndex)}
        onError={() => {}}
        onFinalError={() => handleImageError(page)}
        onZoomChange={handleZoomChange}
      />
    ),
    [chapter, handleImageLoad, handleImageError, handleZoomChange]
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: PAGE_HEIGHT,
      offset: PAGE_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item) => item.toString(), []);

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

  const displayTotalPages = totalPages > 0 ? totalPages : "...";
  const isLastPage = totalPages > 0 && currentPage >= totalPages;
  const isFirstPage = currentPage === 1;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading Chapter {chapter}...</Text>
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
        snapToInterval={PAGE_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={100}
        scrollEnabled={!isAnyPageZoomed}
      />

      {/* Page Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              isFirstPage && styles.controlButtonDisabled,
            ]}
            onPress={goToPrevPage}
            disabled={isFirstPage}
          >
            <Text style={styles.controlButtonText}>‹ Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageInfo}>
            <Text style={styles.pageText}>
              {currentPage} / {displayTotalPages}
            </Text>
            <Text style={styles.chapterText}>Chapter {chapter}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isLastPage && styles.controlButtonDisabled,
            ]}
            onPress={goToNextPage}
            disabled={isLastPage}
          >
            <Text style={styles.controlButtonText}>Next ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chapterControls}>
          <TouchableOpacity
            style={[
              styles.chapterButton,
              chapter === 1 && styles.controlButtonDisabled,
            ]}
            onPress={goToPrevChapter}
            disabled={chapter === 1}
          >
            <Text style={styles.chapterButtonText}>‹ Previous Chapter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chapterButton}
            onPress={goToNextChapter}
          >
            <Text style={styles.chapterButtonText}>Next Chapter ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  flatList: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  imageZoom: {
    backgroundColor: "#000",
  },
  image: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT - 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    zIndex: 10,
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  errorPage: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  errorPageText: {
    color: "#666",
    fontSize: 14,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  controlButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  controlButtonDisabled: {
    backgroundColor: "#444",
    opacity: 0.5,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  chapterText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  chapterControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  chapterButton: {
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  chapterButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MangaReader;
