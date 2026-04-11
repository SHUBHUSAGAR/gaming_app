import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import WinGo from './pages/WinGo';
import Aviator from './pages/Aviator';
import ABFun from './pages/ABFun';
import LuckyHit from './pages/LuckyHit';
import SoccerGo from './pages/SoccerGo';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || user === false) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

function AppContent() {
  return (
    <>
      <Navbar />
      <main className="pb-16 lg:pb-0 min-h-[calc(100vh-3.5rem)]">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
          <Route path="/games/wingo" element={<ProtectedRoute><WinGo /></ProtectedRoute>} />
          <Route path="/games/aviator" element={<ProtectedRoute><Aviator /></ProtectedRoute>} />
          <Route path="/games/abfun" element={<ProtectedRoute><ABFun /></ProtectedRoute>} />
          <Route path="/games/luckyhit" element={<ProtectedRoute><LuckyHit /></ProtectedRoute>} />
          <Route path="/games/soccergo" element={<ProtectedRoute><SoccerGo /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
      <Toaster richColors position="bottom-right" />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
