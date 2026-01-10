import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Two possible base URLs for B&W - older chapters use one, newer chapters use the other
export const BASE_URLS = [
  "https://hot.planeptune.us/manga/One-Piece",
  "https://scans-hot.planeptune.us/manga/One-Piece",
];

// Colored version URL (Digital Colored Comics - behind by ~100 chapters)
export const COLORED_URL = "https://scans-hot.planeptune.us/manga/One-Piece-Digital-Colored-Comics";

export const CONTROLS_HEIGHT = 130;
export const PAGE_HEIGHT = SCREEN_HEIGHT - CONTROLS_HEIGHT;

// Render images at 2x resolution for sharp zooming
export const IMAGE_SCALE = 2;

export { SCREEN_WIDTH, SCREEN_HEIGHT };

// Generate image URL based on chapter, page, URL index, and color mode
export const getImageUrl = (chapter, page, urlIndex = 0, isColored = false) => {
  const chapterNum = String(chapter).padStart(4, "0");
  const pageNum = String(page).padStart(3, "0");
  
  if (isColored) {
    return `${COLORED_URL}/${chapterNum}-${pageNum}.png`;
  }
  
  return `${BASE_URLS[urlIndex]}/${chapterNum}-${pageNum}.png`;
};
