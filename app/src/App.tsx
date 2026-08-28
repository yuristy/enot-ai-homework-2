// app/src/App.tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './features/cabinet/AuthProvider';
import { CabinetScreen } from './features/cabinet/CabinetScreen';
import { MapScreen } from './features/map/MapScreen';
import { RequestsScreen } from './features/requests/RequestsScreen';
import { MoodboardScreen } from './features/moodboard/MoodboardScreen';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<MapScreen />} />
            <Route path="/cabinet" element={<CabinetScreen />} />
            <Route path="/requests" element={<RequestsScreen />} />
            <Route path="/moodboard" element={<MoodboardScreen />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </ToastProvider>
  );
}
