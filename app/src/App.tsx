// app/src/App.tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequestsScreen } from './features/requests/RequestsScreen';
import { MoodboardScreen } from './features/moodboard/MoodboardScreen';

function MapPlaceholder() {
  return <h1>Карта (feature/map-routes)</h1>;
}

function CabinetPlaceholder() {
  return <h1>Кабинет (feature/cabinet)</h1>;
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapPlaceholder />} />
        <Route path="/requests" element={<RequestsScreen />} />
        <Route path="/moodboard" element={<MoodboardScreen />} />
        <Route path="/cabinet" element={<CabinetPlaceholder />} />
      </Routes>
    </Layout>
  );
}
