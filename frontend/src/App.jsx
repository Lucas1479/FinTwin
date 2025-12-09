import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import WealthPage from './pages/WealthPage';
import GoalsPage from './pages/GoalsPage';
import MarketplacePage from './pages/MarketplacePage';
import PlaygroundPage from './pages/PlaygroundPage';
import GoalCreatePathways from './pages/GoalCreatePathways';
import GoalIntakePage from './pages/GoalIntakePage';
import GoalGalleryPage from './pages/GoalGalleryPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes (Should Wrap in Auth Middleware later) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wealth" element={<WealthPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/new" element={<GoalCreatePathways />} />
        <Route path="/goals/new/ai" element={<GoalIntakePage />} />
        <Route path="/goals/new/gallery" element={<GoalGalleryPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/playground" element={<PlaygroundPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
