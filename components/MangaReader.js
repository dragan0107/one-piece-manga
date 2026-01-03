import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import ImageZoom from 'react-native-image-pan-zoom';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_URL = 'https://hot.planeptune.us/manga/One-Piece';
const CONTROLS_HEIGHT = 130;
const PAGE_HEIGHT = SCREEN_HEIGHT - CONTROLS_HEIGHT;

// Generate image URL based on chapter and page
const getImageUrl = (chapter, page) => {
  const chapterNum = String(chapter).padStart(4, '0');
  const pageNum = String(page).padStart(3, '0');
  return `${BASE_URL}/${chapterNum}-${pageNum}.png`;
};

// Memoized zoomable image component for better performance
const ZoomablePage = memo(({ chapter, page, onLoad, onError, hasError }) => {
  return (
    <View style={styles.pageContainer}>
      <ImageZoom
        cropWidth={SCREEN_WIDTH}
        cropHeight={PAGE_HEIGHT}
        imageWidth={SCREEN_WIDTH}
        imageHeight={PAGE_HEIGHT - 20}
        minScale={1}
        maxScale={4}
        enableSwipeDown={false}
        enableCenterFocus={true}
        style={styles.imageZoom}
      >
        <Image
          source={{ uri: getImageUrl(chapter, page) }}
          style={styles.image}
          contentFit="contain"
          transition={100}
          cachePolicy="memory-disk"
          onLoad={onLoad}
          onError={onError}
        />
      </ImageZoom>
      {hasError && (
        <View style={styles.errorPage}>
          <Text style={styles.errorPageText}>Page {page} not available</Text>
        </View>
      )}
    </View>
  );
});

const MangaReader = ({ route, navigation }) => {
  const { chapter, startPage = 1 } = route.params || { chapter: 237, startPage: 1 };
  const [currentPage, setCurrentPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [allFailed, setAllFailed] = useState(false);
  const flatListRef = useRef(null);
  
  const MAX_PAGES = 25;
  const pages = Array.from({ length: MAX_PAGES }, (_, i) => i + 1);

  useEffect(() => {
    setLoading(true);
    setLoadedPages({});
    setTotalPages(0);
    setAllFailed(false);
    setCurrentPage(startPage);
  }, [chapter]);

  useEffect(() => {
    if (totalPages > 0 && startPage > 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: startPage - 1,
          animated: false,
        });
      }, 300);
    }
  }, [totalPages, startPage]);

  const handleImageLoad = useCallback((page) => {
    setLoadedPages(prev => {
      const updated = { ...prev, [page]: 'loaded' };
      const loadedCount = Object.values(updated).filter(v => v === 'loaded').length;
      if (loadedCount > 0) {
        setLoading(false);
        const maxLoaded = Math.max(...Object.keys(updated).filter(k => updated[k] === 'loaded').map(Number));
        setTotalPages(prevTotal => Math.max(prevTotal, maxLoaded));
      }
      return updated;
    });
  }, []);

  const handleImageError = useCallback((page) => {
    setLoadedPages(prev => {
      const updated = { ...prev, [page]: 'error' };
      const totalChecked = Object.keys(updated).length;
      const allErrors = Object.values(updated).every(v => v === 'error');
      if (totalChecked >= 5 && allErrors) {
        setAllFailed(true);
        setLoading(false);
      }
      return updated;
    });
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visiblePage = viewableItems[0].item;
      setCurrentPage(visiblePage);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= MAX_PAGES) {
      flatListRef.current?.scrollToIndex({
        index: page - 1,
        animated: true,
      });
    }
  }, []);

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && goToPage(currentPage - 1);

  const goToNextChapter = () => {
    navigation.replace('MangaReader', {
      chapter: chapter + 1,
      startPage: 1,
    });
  };

  const goToPrevChapter = () => {
    if (chapter > 1) {
      navigation.replace('MangaReader', {
        chapter: chapter - 1,
        startPage: 1,
      });
    }
  };

  const renderPage = useCallback(({ item: page }) => (
    <ZoomablePage
      chapter={chapter}
      page={page}
      onLoad={() => handleImageLoad(page)}
      onError={() => handleImageError(page)}
      hasError={loadedPages[page] === 'error'}
    />
  ), [chapter, loadedPages, handleImageLoad, handleImageError]);

  const getItemLayout = useCallback((_, index) => ({
    length: PAGE_HEIGHT,
    offset: PAGE_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item) => item.toString(), []);

  if (allFailed) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No pages found for Chapter {chapter}</Text>
        <Text style={styles.errorSubtext}>This chapter may not be available</Text>
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
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading Chapter {chapter}...</Text>
        </View>
      )}
      
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        contentContainerStyle={styles.scrollContent}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={100}
      />

      {/* Page Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, currentPage === 1 && styles.controlButtonDisabled]}
            onPress={goToPrevPage}
            disabled={currentPage === 1}
          >
            <Text style={styles.controlButtonText}>‹ Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageInfo}>
            <Text style={styles.pageText}>
              {currentPage} {totalPages > 0 ? `/ ${totalPages}` : ''}
            </Text>
            <Text style={styles.chapterText}>Chapter {chapter}</Text>
          </View>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={goToNextPage}
          >
            <Text style={styles.controlButtonText}>Next ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chapterControls}>
          <TouchableOpacity
            style={[styles.chapterButton, chapter === 1 && styles.controlButtonDisabled]}
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
    backgroundColor: '#000',
  },
  flatList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: CONTROLS_HEIGHT,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  imageZoom: {
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: PAGE_HEIGHT - 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorPage: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPageText: {
    color: '#666',
    fontSize: 14,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chapterText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  chapterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  chapterButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  chapterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MangaReader;
