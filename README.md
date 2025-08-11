# MUSE CORE

Professional music tools for musicians - featuring a metronome and tuner with modern web technologies.

## 🎵 Features

### Metronome
- **BPM Range**: 40-200 BPM with precise control
- **Time Signatures**: Support for common time signatures (4/4, 3/4, 2/4, 6/8, 5/4) and custom signatures
- **Volume Control**: Adjustable volume levels
- **Visual Beat Indicators**: Clear visual feedback for beat tracking
- **Tap Tempo**: Tap to set BPM
- **Accent Beats**: Different sounds for accented beats

### Tuner
- **Real-time Pitch Detection**: Live audio analysis using Web Audio API
- **Note Detection**: Identifies musical notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- **Cents Display**: Shows how many cents sharp or flat
- **Visual Guide**: Intuitive visual feedback for tuning accuracy
- **Frequency Range**: Optimized for musical frequencies (80-2000 Hz)

## 🚀 Tech Stack

- **Framework**: React Router v7 with Hono server
- **Language**: TypeScript/JavaScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **UI Components**: Chakra UI, Lucide React icons
- **Build Tool**: Vite
- **Audio**: Web Audio API

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd musecore2
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:4000`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
src/
├── app/
│   ├── layout.jsx          # Root layout with React Query provider
│   ├── page.jsx            # Home page with tool selection
│   ├── metronome/
│   │   └── page.jsx        # Metronome implementation
│   └── tuner/
│       └── page.jsx        # Tuner implementation
├── utils/                  # Utility functions
└── client-integrations/    # Third-party integrations
```

### Key Technologies

- **React Router v7**: Modern routing with file-based routing
- **Web Audio API**: For metronome sounds and tuner pitch detection
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and dev server

## 🎨 Design

The application features a modern, dark theme with:
- Purple gradient backgrounds
- Glassmorphism effects
- Responsive design
- Smooth animations and transitions
- Professional typography

## 🔧 Configuration

The project uses several configuration files:
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `react-router.config.ts` - React Router configuration

## 📱 Browser Support

This application requires modern browsers with support for:
- Web Audio API
- ES6+ features
- CSS Grid and Flexbox

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ for musicians
