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
  Animated,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import {
  addVisitedChapter,
  isChapterCompleted,
  markChapterCompleted,
  unmarkChapterCompleted,
} from "../utils/chapterStorage";

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

// Custom pinch-zoom component that ONLY captures 2-finger gestures
// Single-finger gestures pass through to FlatList for scrolling
const ZoomablePage = memo(
  ({ chapter, page, onLoad, onError, onFinalError, onZoomChange }) => {
    const [urlIndex, setUrlIndex] = useState(0);
    const [hasTriedAll, setHasTriedAll] = useState(false);

    // Animated values for transform
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    // Refs for gesture tracking
    const baseScale = useRef(1);
    const lastScale = useRef(1);
    const baseTranslateX = useRef(0);
    const baseTranslateY = useRef(0);
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);
    const initialPinchDistance = useRef(0);
    const isZoomedRef = useRef(false);
    const isPinching = useRef(false);
    const isPanning = useRef(false);

    // Reset when chapter/page changes
    useEffect(() => {
      setUrlIndex(0);
      setHasTriedAll(false);
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      baseScale.current = 1;
      lastScale.current = 1;
      baseTranslateX.current = 0;
      baseTranslateY.current = 0;
      lastTranslateX.current = 0;
      lastTranslateY.current = 0;
      isZoomedRef.current = false;
      onZoomChange?.(false);
    }, [chapter, page]);

    const handleLoad = useCallback(() => {
      onLoad(urlIndex);
    }, [onLoad, urlIndex]);

    const handleError = useCallback(() => {
      if (urlIndex < BASE_URLS.length - 1) {
        setUrlIndex((prev) => prev + 1);
      } else {
        setHasTriedAll(true);
        onFinalError();
      }
    }, [urlIndex, onFinalError]);

    // Calculate distance between two touch points
    const getDistance = (touches) => {
      const [t1, t2] = touches;
      const dx = t1.pageX - t2.pageX;
      const dy = t1.pageY - t2.pageY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Clamp translation to keep image within bounds
    const clampTranslation = (x, y, currentScale) => {
      if (currentScale <= 1) return { x: 0, y: 0 };
      const maxX = (SCREEN_WIDTH * (currentScale - 1)) / 2;
      const maxY = (PAGE_HEIGHT * (currentScale - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    };

    const panResponder = useRef(
      PanResponder.create({
        // Only claim responder for 2-finger gestures OR when zoomed
        onStartShouldSetPanResponder: (evt) => {
          // 2 fingers = pinch, claim it
          if (evt.nativeEvent.touches.length >= 2) {
            return true;
          }
          // 1 finger + zoomed = pan, claim it
          if (isZoomedRef.current && evt.nativeEvent.touches.length === 1) {
            return true;
          }
          // 1 finger + not zoomed = let FlatList scroll
          return false;
        },

        onMoveShouldSetPanResponder: (evt) => {
          // Same logic as above
          if (evt.nativeEvent.touches.length >= 2) {
            return true;
          }
          if (isZoomedRef.current && evt.nativeEvent.touches.length === 1) {
            return true;
          }
          return false;
        },

        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            isPinching.current = true;
            isPanning.current = false;
            initialPinchDistance.current = getDistance(touches);
            baseScale.current = lastScale.current;
          } else if (isZoomedRef.current) {
            isPanning.current = true;
            isPinching.current = false;
            baseTranslateX.current = lastTranslateX.current;
            baseTranslateY.current = lastTranslateY.current;
          }
        },

        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;

          // Handle transition from pan to pinch when second finger added
          if (touches.length >= 2) {
            if (!isPinching.current) {
              // Switching from pan to pinch
              isPinching.current = true;
              isPanning.current = false;
              initialPinchDistance.current = getDistance(touches);
              baseScale.current = lastScale.current;
            }

            // Pinch zoom
            const currentDistance = getDistance(touches);
            const scaleRatio = currentDistance / initialPinchDistance.current;
            let newScale = baseScale.current * scaleRatio;
            newScale = Math.max(1, Math.min(4, newScale)); // Clamp 1-4x

            scale.setValue(newScale);
            lastScale.current = newScale;

            // Update zoom state
            const zoomed = newScale > 1.05;
            if (zoomed !== isZoomedRef.current) {
              isZoomedRef.current = zoomed;
              onZoomChange?.(zoomed);
            }
          } else if (touches.length === 1 && isZoomedRef.current) {
            if (!isPanning.current) {
              // Switching from pinch to pan (one finger lifted)
              isPanning.current = true;
              isPinching.current = false;
              baseTranslateX.current = lastTranslateX.current;
              baseTranslateY.current = lastTranslateY.current;
            }

            // Pan when zoomed
            const newX = baseTranslateX.current + gestureState.dx;
            const newY = baseTranslateY.current + gestureState.dy;
            const clamped = clampTranslation(newX, newY, lastScale.current);

            translateX.setValue(clamped.x);
            translateY.setValue(clamped.y);
            lastTranslateX.current = clamped.x;
            lastTranslateY.current = clamped.y;
          }
        },

        onPanResponderRelease: () => {
          isPinching.current = false;
          isPanning.current = false;

          // Snap to 1x if close to it
          if (lastScale.current < 1.1) {
            Animated.parallel([
              Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
            ]).start();
            lastScale.current = 1;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
            isZoomedRef.current = false;
            onZoomChange?.(false);
          }
        },

        onPanResponderTerminate: () => {
          isPinching.current = false;
          isPanning.current = false;
        },
      })
    ).current;

    return (
      <View style={styles.pageContainer}>
        <Animated.View
          style={[
            styles.zoomContainer,
            {
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: getImageUrl(chapter, page, urlIndex) }}
            style={styles.pageImage}
            contentFit="contain"
            contentPosition="center"
            transition={100}
            cachePolicy="disk"
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
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
  const [isCompleted, setIsCompleted] = useState(false); // Track if chapter is marked completed
  const flatListRef = useRef(null);
  const hasAddedToVisited = useRef(false); // Track if we've added this chapter to visited

  // Check completion status on mount (but don't add to visited yet)
  useEffect(() => {
    hasAddedToVisited.current = false; // Reset for new chapter
    isChapterCompleted(chapter).then(setIsCompleted);
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
          <ActivityIndicator size="large" color="#DC3545" />
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
            <Text style={styles.chapterButtonText}>‹ Prev Ch.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              isCompleted && styles.completeButtonActive,
            ]}
            onPress={toggleCompleted}
          >
            <Text
              style={[
                styles.completeButtonText,
                isCompleted && styles.completeButtonTextActive,
              ]}
            >
              {isCompleted ? "✓ Completed" : "Mark Complete"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chapterButton}
            onPress={goToNextChapter}
          >
            <Text style={styles.chapterButtonText}>Next Ch. ›</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  error: "#DC3545",
  success: "#22C55E",
  successMuted: "rgba(34, 197, 94, 0.15)",
  border: "rgba(255, 255, 255, 0.08)",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  flatList: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: COLORS.bgDeep,
    overflow: "hidden",
  },
  zoomContainer: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  pageImage: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgDeep,
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 20,
    fontSize: 17,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgDeep,
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    color: COLORS.textMuted,
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
    color: COLORS.textMuted,
    fontSize: 14,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  controlButton: {
    backgroundColor: COLORS.red,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 85,
    alignItems: "center",
  },
  controlButtonDisabled: {
    backgroundColor: COLORS.bgCard,
    opacity: 0.5,
  },
  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  chapterText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  chapterControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chapterButton: {
    backgroundColor: COLORS.bgElevated,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 3,
    alignItems: "center",
  },
  chapterButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: COLORS.bgElevated,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1.2,
    marginHorizontal: 3,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  completeButtonActive: {
    backgroundColor: COLORS.successMuted,
    borderColor: COLORS.success,
  },
  completeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  completeButtonTextActive: {
    color: COLORS.success,
  },
  button: {
    backgroundColor: COLORS.red,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default MangaReader;
