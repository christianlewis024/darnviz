# DarnViz

![DarnViz](https://via.placeholder.com/800x200?text=DarnViz+Music+Visualizer)

DarnViz is a web-based music visualizer that captures audio from any source on your PC (YouTube, Spotify, MP3 files, etc.) and displays dynamic, real-time visualizations in your browser.

## ✨ Features

- **Universal Audio Capture**: Capture audio from any tab or system-wide sources using a lightweight browser extension
- **Real-Time Visualizations**: Experience dynamic 2D and 3D visualizations that respond to your music
- **No Login Required**: Start visualizing immediately - no accounts or sign-ups
- **Customizable Experience**: Choose from different themes, visualization styles, and complexity levels
- **High Performance**: Hardware-accelerated rendering for smooth visuals on various devices
- **Minimal Interface**: UI fades away automatically, leaving only your visualization

## 🎵 Visualization Styles

- **2D Visualizations**: Waveforms, equalizer bars, pulsing circles, and abstract patterns
- **3D Visualizations**: Rotating geometries, particle systems, and fluid simulations
- **Audio Reactivity**: Bass affects different visual elements than mids or treble
- **"Find the Vibe"**: One-click randomization to match the mood of your music

## 🚀 Getting Started

### Requirements

- A modern web browser (Chrome or Firefox recommended)
- The DarnViz browser extension
- Audio playing on your device

### Quick Start

1. **Install the DarnViz Extension**:
   - [Chrome Extension](https://chrome.google.com/webstore/category/extensions) (coming soon)
   - [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/) (coming soon)

2. **Visit the Web App**:
   - Go to [https://darnviz.example.com](https://darnviz.example.com) (coming soon)
   - Grant audio capture permissions when prompted
   - Start playing audio from any source
   - Enjoy the visualizations!

## 🎮 Controls

DarnViz features a minimal interface that appears when you move your mouse and fades away after a few seconds:

- **Theme Selector**: Choose from Dark, Neon, Pastel, or create your own color palette
- **Visualization Selector**: Switch between different visualization styles
- **Intricacy Level**: Adjust visualization complexity (Simple, Medium, High-Detail)
- **Full-Screen**: Toggle full-screen mode for an immersive experience
- **Find the Vibe**: Randomize settings based on audio mood

## 🛠️ For Developers

### Technology Stack

- **Frontend**: React, Three.js, Web Audio API
- **Extension**: Chrome Extensions API, Firefox WebExtensions API
- **Rendering**: WebGL, Canvas API
- **Audio Processing**: Web Audio API with real-time frequency analysis

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/darnviz.git
cd darnviz

# Install dependencies
npm install

# Start development server for web app
npm run dev:webapp

# Build the extension
npm run build:extension
```

### Project Structure

- `/extension` - Browser extension source code
- `/webapp` - React web application
- `/shared` - Shared utilities and types
- `/docs` - Documentation and guides

For detailed implementation information, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).

## Current Status: Phase 0

- Initial setup and architecture planning complete
- Project structure created with necessary directories
- Core configuration files in place (webpack, ESLint, etc.)
- Placeholder components created for future implementation
- Chrome extension manifest and basic structure implemented
- Next step: Begin Phase 1 - Browser Extension Development

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Future Plans

- System-wide audio capture support
- Additional visualization styles
- Audio effects and filters
- Mobile device support
- Music analysis and recommendations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Feedback

If you have any feedback or ideas, please open an issue in this repository.

---

Built with ♥ by DarnViz Team
