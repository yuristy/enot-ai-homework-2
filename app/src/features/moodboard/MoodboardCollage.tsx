// app/src/features/moodboard/MoodboardCollage.tsx
import { collageGridTemplate } from './palette';
import type { Place } from '../../lib/types';

export function MoodboardCollage({ places }: { places: Place[] }) {
  const { columns } = collageGridTemplate(places.length || 1);

  return (
    <div
      className="moodboard-collage"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '4px' }}
    >
      {places.map((place) => (
        <div key={place.id} className="moodboard-collage__tile">
          {place.photoUrl ? (
            <img src={place.photoUrl} alt={place.name} style={{ width: '100%', display: 'block' }} />
          ) : (
            <div className="moodboard-collage__placeholder">{place.name}</div>
          )}
        </div>
      ))}
    </div>
  );
}
