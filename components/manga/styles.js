import { StyleSheet } from "react-native";
import { SCREEN_WIDTH, PAGE_HEIGHT } from "../../utils/mangaConfig";

// One Piece Crimson Theme - Luffy's Red
export const COLORS = {
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

  // Colored mode
  rainbow: "#FF6B35",
  rainbowMuted: "rgba(255, 107, 53, 0.15)",
};

export const styles = StyleSheet.create({
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
    justifyContent: "center",
    alignItems: "center",
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
  // Color toggle styles
  colorToggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    gap: 8,
  },
  colorToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "transparent",
    minWidth: 70,
    alignItems: "center",
  },
  colorToggleButtonActive: {
    backgroundColor: COLORS.redMuted,
    borderColor: COLORS.red,
  },
  colorToggleButtonActiveColored: {
    backgroundColor: COLORS.rainbowMuted,
    borderColor: COLORS.rainbow,
  },
  colorToggleText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  colorToggleTextActive: {
    color: COLORS.red,
  },
  colorToggleTextActiveColored: {
    color: COLORS.rainbow,
  },
});
