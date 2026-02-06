import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingQuiz from './pages/OnboardingQuiz';
import Dashboard from './pages/Dashboard';
import WealthCenterPage from './pages/WealthCenterPage';
import GoalsPage from './pages/GoalsPage';
import MarketplacePage from './pages/MarketplacePage';
import PlaygroundPage from './pages/PlaygroundPage';
import GoalIntakePage from './pages/GoalIntakePage';
import GoalGalleryPage from './pages/GoalGalleryPage';
import GoalDetailPage from './pages/GoalDetailPage';
import SettingsPage from './pages/SettingsPage';
import ComponentShowcase from './pages/ComponentShowcase';
import { SidebarProvider } from './context/SidebarContext';
import { SimulationProvider } from './context/SimulationContext';
import { HelpProvider } from './context/HelpContext';


function App() {
  return (
    <SidebarProvider>
      <SimulationProvider>
        <HelpProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/onboarding" element={<OnboardingQuiz />} />
              
              {/* Protected Routes (Should Wrap in Auth Middleware later) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/wealth" element={<WealthCenterPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/goals/new" element={<GoalIntakePage />} />
              <Route path="/goals/new/ai" element={<GoalIntakePage />} />
              <Route path="/goals/new/gallery" element={<GoalGalleryPage />} />
              <Route path="/goals/:id" element={<GoalDetailPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/playground" element={<PlaygroundPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/showcase" element={<ComponentShowcase />} />
              

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </HelpProvider>
      </SimulationProvider>
    </SidebarProvider>
  );
}

export default App;
