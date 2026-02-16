import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Verify } from './pages/Verify';
import { CreateMeeting } from './pages/CreateMeeting';
import { MeetingDetailsPage } from './pages/MeetingDetails';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<CreateMeeting />} />
            <Route path="/auth/verify" element={<Verify />} />
            <Route path="/m/:id" element={<MeetingDetailsPage />} />

            {/* Catch-all: redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
