import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import GrainOverlay from './components/GrainOverlay.jsx'
import { PlayerProvider } from './player/PlayerProvider.jsx'
import JourneyShell from './components/JourneyShell.jsx'
import Landing from './pages/Landing.jsx'
import RoadIndex from './pages/RoadIndex.jsx'
import ChapterPage from './pages/ChapterPage.jsx'
import EndPage from './pages/EndPage.jsx'

/**
 * Every stop on both roads is a real route with its own URL, so chapters are
 * deep-linkable, survive a refresh, and move under browser back/forward.
 * The static /end route is declared before the :chapterSlug route it would
 * otherwise be captured by.
 */
export default function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
      <GrainOverlay />
      <Routes>
        <Route element={<JourneyShell />}>
          <Route path="/" element={<Landing />} />

          <Route path="/within-you" element={<RoadIndex roadId="within-you" />} />
          <Route path="/within-you/end" element={<EndPage roadId="within-you" />} />
          <Route path="/within-you/:chapterSlug" element={<ChapterPage roadId="within-you" />} />

          <Route path="/for-fun" element={<RoadIndex roadId="for-fun" />} />
          <Route path="/for-fun/end" element={<EndPage roadId="for-fun" />} />
          <Route path="/for-fun/:chapterSlug" element={<ChapterPage roadId="for-fun" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </PlayerProvider>
    </BrowserRouter>
  )
}
