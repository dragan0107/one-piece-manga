import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_URL = 'https://hot.planeptune.us/manga/One-Piece';

// Generate image URL based on chapter and page
const getImageUrl = (chapter, page) => {
  const chapterNum = String(chapter).padStart(4, '0');
  const pageNum = String(page).padStart(3, '0');
  return `${BASE_URL}/${chapterNum}-${pageNum}.png`;
};

const MangaReader = ({ route, navigation }) => {
  const { chapter, startPage = 1 } = route.params || { chapter: 237, startPage: 1 };
  const [currentPage, setCurrentPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [allFailed, setAllFailed] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Assume max 25 pages per chapter initially, we'll detect actual count
  const MAX_PAGES = 25;

  useEffect(() => {
    // Reset state when chapter changes
    setLoading(true);
    setLoadedPages({});
    setTotalPages(0);
    setAllFailed(false);
    setCurrentPage(startPage);
  }, [chapter]);

  useEffect(() => {
    if (totalPages > 0 && startPage > 1) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: (startPage - 1) * SCREEN_HEIGHT,
          animated: false,
        });
      }, 300);
    }
  }, [totalPages, startPage]);

  const handleImageLoad = (page) => {
    setLoadedPages(prev => {
      const updated = { ...prev, [page]: 'loaded' };
      // Count successful loads
      const loadedCount = Object.values(updated).filter(v => v === 'loaded').length;
      if (loadedCount > 0) {
        setLoading(false);
        // Update total pages based on highest loaded page
        const maxLoaded = Math.max(...Object.keys(updated).filter(k => updated[k] === 'loaded').map(Number));
        setTotalPages(prev => Math.max(prev, maxLoaded));
      }
      return updated;
    });
  };

  const handleImageError = (page) => {
    setLoadedPages(prev => {
      const updated = { ...prev, [page]: 'error' };
      // Check if all pages failed
      const totalChecked = Object.keys(updated).length;
      const allErrors = Object.values(updated).every(v => v === 'error');
      if (totalChecked >= 5 && allErrors) {
        setAllFailed(true);
        setLoading(false);
      }
      return updated;
    });
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const page = Math.round(offsetY / SCREEN_HEIGHT) + 1;
    if (page !== currentPage && page >= 1) {
      setCurrentPage(page);
    }
  };

  const goToPage = (page) => {
    if (page >= 1) {
      setCurrentPage(page);
      scrollViewRef.current?.scrollTo({
        y: (page - 1) * SCREEN_HEIGHT,
        animated: true,
      });
    }
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

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

  // Generate page array
  const pages = Array.from({ length: MAX_PAGES }, (_, i) => i + 1);

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
      
      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {pages.map((page) => (
          <View key={page} style={styles.pageContainer}>
            <Image
              source={{ uri: getImageUrl(chapter, page) }}
              style={styles.image}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
              onLoad={() => handleImageLoad(page)}
              onError={() => handleImageError(page)}
            />
            {loadedPages[page] === 'error' && (
              <View style={styles.errorPage}>
                <Text style={styles.errorPageText}>Page {page} not available</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
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
