import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "./styles";

const ReaderControls = ({
  currentPage,
  totalPages,
  chapter,
  isCompleted,
  isColored,
  coloredAvailable,
  onPrevPage,
  onNextPage,
  onPrevChapter,
  onNextChapter,
  onToggleCompleted,
  onToggleColored,
}) => {
  const displayTotalPages = totalPages > 0 ? totalPages : "...";
  const isLastPage = totalPages > 0 && currentPage >= totalPages;
  const isFirstPage = currentPage === 1;

  return (
    <View style={styles.controlsContainer}>
      {/* Color Toggle Row - only show if colored is available */}
      {coloredAvailable && (
        <View style={styles.colorToggleRow}>
          <TouchableOpacity
            style={[
              styles.colorToggleButton,
              !isColored && styles.colorToggleButtonActive,
            ]}
            onPress={() => isColored && onToggleColored?.()}
          >
            <Text
              style={[
                styles.colorToggleText,
                !isColored && styles.colorToggleTextActive,
              ]}
            >
              B&W
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.colorToggleButton,
              isColored && styles.colorToggleButtonActiveColored,
            ]}
            onPress={() => !isColored && onToggleColored?.()}
          >
            <Text
              style={[
                styles.colorToggleText,
                isColored && styles.colorToggleTextActiveColored,
              ]}
            >
              Color
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isFirstPage && styles.controlButtonDisabled,
          ]}
          onPress={onPrevPage}
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
          onPress={onNextPage}
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
          onPress={onPrevChapter}
          disabled={chapter === 1}
        >
          <Text style={styles.chapterButtonText}>‹ Prev Ch.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.completeButton,
            isCompleted && styles.completeButtonActive,
          ]}
          onPress={onToggleCompleted}
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

        <TouchableOpacity style={styles.chapterButton} onPress={onNextChapter}>
          <Text style={styles.chapterButtonText}>Next Ch. ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReaderControls;
