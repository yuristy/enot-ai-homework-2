import { Card } from '../../components/Card';
import { buildRouteUrl } from '../../lib/route';
import { useMyRoutes } from './useMyRoutes';

export function MyRoutesList() {
  const { routes } = useMyRoutes();

  if (routes.length === 0) {
    return <p>Сохранённых маршрутов пока нет.</p>;
  }

  return (
    <div>
      {routes.map((route) => (
        <Card key={route.id}>
          {/* buildRouteUrl returns a query-only reference ("?start=...&places=...");
              anchoring it to "/" is required so the link opens the map screen
              (mounted at "/" by feature/map-routes) rather than resolving against
              the current "/cabinet" path per RFC 3986 §5.3. */}
          <a href={`/${buildRouteUrl(route.startLat, route.startLng, route.placeIds)}`}>
            {route.title ?? `Маршрут от ${new Date(route.createdAt).toLocaleDateString('ru-RU')}`}
          </a>
        </Card>
      ))}
    </div>
  );
}
