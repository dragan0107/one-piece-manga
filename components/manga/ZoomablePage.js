import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { View, Text, Animated, PanResponder } from "react-native";
import { Image } from "expo-image";
import {
  BASE_URLS,
  SCREEN_WIDTH,
  PAGE_HEIGHT,
  IMAGE_SCALE,
  getImageUrl,
} from "../../utils/mangaConfig";
import { styles } from "./styles";

// Custom pinch-zoom component that ONLY captures 2-finger gestures
// Single-finger gestures pass through to FlatList for scrolling
// Uses 2x resolution for sharp zooming
const ZoomablePage = memo(
  ({
    chapter,
    page,
    isColored = false,
    onLoad,
    onError,
    onFinalError,
    onZoomChange,
  }) => {
    const [urlIndex, setUrlIndex] = useState(0);
    const [hasTriedAll, setHasTriedAll] = useState(false);
    // If colored fails for THIS page, fall back to B&W just for this page
    const [useColoredFallback, setUseColoredFallback] = useState(false);

    // Determine if we should actually use colored for this page
    const effectiveColored = isColored && !useColoredFallback;

    // 2x image dimensions for sharp zoom
    const imageWidth = SCREEN_WIDTH * IMAGE_SCALE;
    const imageHeight = PAGE_HEIGHT * IMAGE_SCALE;
    const minScale = 1 / IMAGE_SCALE; // 0.5

    // Animated values for transform
    const scale = useRef(new Animated.Value(minScale)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    // Refs for gesture tracking
    const baseScale = useRef(minScale);
    const lastScale = useRef(minScale);
    const baseTranslateX = useRef(0);
    const baseTranslateY = useRef(0);
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);
    const initialPinchDistance = useRef(0);
    const isZoomedRef = useRef(false);
    const isPinching = useRef(false);
    const isPanning = useRef(false);

    // Reset when chapter/page/color mode changes
    useEffect(() => {
      setUrlIndex(0);
      setHasTriedAll(false);
      setUseColoredFallback(false);
      scale.setValue(minScale);
      translateX.setValue(0);
      translateY.setValue(0);
      baseScale.current = minScale;
      lastScale.current = minScale;
      baseTranslateX.current = 0;
      baseTranslateY.current = 0;
      lastTranslateX.current = 0;
      lastTranslateY.current = 0;
      isZoomedRef.current = false;
      onZoomChange?.(false);
    }, [chapter, page, isColored]);

    const handleLoad = useCallback(() => {
      onLoad(urlIndex);
    }, [onLoad, urlIndex]);

    const handleError = useCallback(() => {
      if (effectiveColored) {
        // Colored failed for this page - fall back to B&W just for this page
        // Don't notify parent, just handle it locally
        setUseColoredFallback(true);
        setUrlIndex(0); // Reset URL index for B&W fallback
      } else {
        // B&W has 2 fallback URLs
        if (urlIndex < BASE_URLS.length - 1) {
          setUrlIndex((prev) => prev + 1);
        } else {
          setHasTriedAll(true);
          onFinalError();
        }
      }
    }, [urlIndex, onFinalError, effectiveColored]);

    // Calculate distance between two touch points
    const getDistance = (touches) => {
      const [t1, t2] = touches;
      const dx = t1.pageX - t2.pageX;
      const dy = t1.pageY - t2.pageY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Clamp translation to keep image within bounds
    const clampTranslation = (x, y, currentScale) => {
      if (currentScale <= minScale) return { x: 0, y: 0 };
      // Calculate how much the scaled image exceeds the viewport
      const scaledWidth = imageWidth * currentScale;
      const scaledHeight = imageHeight * currentScale;
      const maxX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
      const maxY = Math.max(0, (scaledHeight - PAGE_HEIGHT) / 2);
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
            // Clamp: minScale (0.5) to 2 (= 4x effective zoom)
            newScale = Math.max(minScale, Math.min(2, newScale));

            scale.setValue(newScale);
            lastScale.current = newScale;

            // Update zoom state
            const zoomed = newScale > minScale + 0.05;
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

          // Snap to minScale if close to it
          if (lastScale.current < minScale + 0.1) {
            Animated.parallel([
              Animated.spring(scale, {
                toValue: minScale,
                useNativeDriver: true,
              }),
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
            ]).start();
            lastScale.current = minScale;
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
            source={{ uri: getImageUrl(chapter, page, urlIndex, effectiveColored) }}
            style={{ width: imageWidth, height: imageHeight }}
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

export default ZoomablePage;
