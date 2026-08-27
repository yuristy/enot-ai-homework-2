// app/src/App.tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MapScreen } from './features/map/MapScreen';

function RequestsPlaceholder() {
  return <h1>Заявки (feature/requests-moodboard)</h1>;
}

function CabinetPlaceholder() {
  return <h1>Кабинет (feature/cabinet)</h1>;
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapScreen />} />
        <Route path="/requests" element={<RequestsPlaceholder />} />
        <Route path="/cabinet" element={<CabinetPlaceholder />} />
      </Routes>
    </Layout>
  );
}
