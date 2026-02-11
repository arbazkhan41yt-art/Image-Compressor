# SVG Surgical Cleaner

A high-performance, minimalist web tool for optimizing SVG files and converting them to production-ready code for Web, React (JSX), or Tailwind CSS environments.

## 🎯 Features

- **Split-Screen Interface**: Left side for input (drag & drop + textarea), right side for output and live preview
- **No-Click Workflow**: Instant optimization as soon as you paste code or drop a file
- **Multiple Output Formats**: Clean SVG, React Component, and Tailwind Config
- **Surgical Options**: 
  - Remove Width/Height (responsive)
  - Replace Fill with 'currentColor' (CSS styling)
  - Minify Code (remove metadata/comments)
  - Prettify Code (readable format)
- **Real-time Size Comparison**: Shows original vs optimized size with percentage saved
- **One-Click Copy**: Copy optimized code to clipboard
- **Live Preview**: Visual preview with checkered background
- **Drag & Drop Support**: Drop SVG files directly onto the input area

## 🚀 Tech Stack

- **React.js** with Vite for fast development
- **Tailwind CSS** for styling
- **Lucide React** for UI icons
- **SVGO** (SVG Optimizer) for core optimization logic
- **Client-side only** - no backend required

## 📁 Project Structure

```
svg-surgical-cleaner/
├── index.html              # Main HTML file
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── src/
│   ├── main.jsx           # React entry point
│   ├── index.css          # Global styles
│   ├── App.jsx            # Main application component
│   └── utils/
│       └── svgOptimizer.js # SVG optimization utilities
└── README.md
```

## 🛠 Installation & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🎯 How to Use

1. **Input SVG**: Paste SVG code or drag & drop an SVG file onto the left panel
2. **Configure Options**: Use the surgical checkboxes to customize optimization
3. **View Output**: Switch between Clean SVG, React Component, and Tailwind Config tabs
4. **Copy Code**: Click the "Copy" button to copy the optimized code
5. **Preview**: See the live preview in the bottom section

## 🔧 Core Features

### SVG Optimization
- Uses SVGO with optimized plugin configuration
- Removes unnecessary metadata and comments
- Optimizes path data and transforms
- Supports multiple output formats

### React Component Generation
- Converts SVG attributes to React-compatible JSX
- Removes XML declarations and DOCTYPE
- Creates importable React components

### Tailwind Integration
- Provides configuration suggestions
- Supports currentColor for easy styling
- Compatible with Tailwind CSS classes

## 📊 Size Optimization

The tool provides real-time size comparison showing:
- Original file size
- Optimized file size  
- Percentage reduction
- Visual size badges

## 🎨 UI/UX Design

- **Dark theme** by default for developer comfort
- **Split-screen layout** for efficient workflow
- **Real-time processing** with debounced input
- **Drag & drop** with visual feedback
- **Responsive design** that works on all screen sizes
- **Professional tool feel** with clean, minimal interface

## 🔒 Browser Compatibility

- Modern browsers supporting ES6+
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- No server-side requirements

## 🚀 Deployment

The application is built as a static site and can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## 📈 Performance

- **Client-side processing** for instant results
- **Debounced input** to prevent excessive processing
- **Efficient SVGO configuration** for optimal output
- **Minimal dependencies** for fast loading

## 🔧 Customization

The tool can be easily extended with:
- Additional output formats
- Custom SVGO plugins
- More surgical options
- Theme customization
- Export functionality

## 📄 License

MIT License - feel free to use and modify as needed.