# One Piece Manga Reader

A React Native app for reading One Piece manga, fetching images from external sources.

## Features

- 📖 Read One Piece manga chapters
- 🖼️ High-quality image loading with caching
- 📱 Smooth page navigation
- 🔄 Chapter navigation
- 🎨 Modern, dark-themed UI
- ⚡ Fast image loading with Expo Image

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

3. Run on your device:
   - **iOS**: Press `i` in the terminal or scan the QR code with the Expo Go app
   - **Android**: Press `a` in the terminal or scan the QR code with the Expo Go app
   - **Web**: Press `w` in the terminal

## Usage

1. Select a chapter from the chapter list
2. Or enter a chapter number in the search box
3. Swipe up/down or use the navigation buttons to navigate between pages
4. Use the chapter navigation buttons to move to the next/previous chapter

## Image Source

Images are fetched from: `https://hot.planeptune.us/manga/One-Piece/[CHAPTER]-[PAGE].png`

Format:
- Chapter: 4-digit number (e.g., `0237`)
- Page: 3-digit number (e.g., `012`)

## Requirements

- Node.js 14+ 
- npm or yarn
- Expo CLI (installed globally or via npx)
- Expo Go app on your mobile device (for testing)

## Project Structure

```
one-piece-manga/
├── App.js                 # Main app component with navigation
├── components/
│   ├── MangaReader.js     # Manga reading component
│   └── ChapterList.js     # Chapter selection component
├── package.json
├── app.json
└── README.md
```

## Notes

- The app automatically detects available pages in each chapter
- Images are cached for faster loading
- The app supports chapters 1-100+ (adjustable in ChapterList.js)

## License

This project is for educational purposes only.

