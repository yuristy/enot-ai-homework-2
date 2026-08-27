// app/src/App.tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './features/cabinet/AuthProvider';
import { CabinetScreen } from './features/cabinet/CabinetScreen';

function MapPlaceholder() {
  return <h1>Карта (feature/map-routes)</h1>;
}

function RequestsPlaceholder() {
  return <h1>Заявки (feature/requests-moodboard)</h1>;
}

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<MapPlaceholder />} />
          <Route path="/requests" element={<RequestsPlaceholder />} />
          <Route path="/cabinet" element={<CabinetScreen />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
