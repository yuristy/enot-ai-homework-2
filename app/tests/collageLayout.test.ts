import { describe, expect, it } from 'vitest';
import { collageGridTemplate } from '../src/features/moodboard/palette';

describe('collageGridTemplate', () => {
  it('uses a single column for 1 photo', () => {
    expect(collageGridTemplate(1)).toEqual({ columns: 1, rows: 1 });
  });

  it('uses a 2x2 grid for 4 photos', () => {
    expect(collageGridTemplate(4)).toEqual({ columns: 2, rows: 2 });
  });

  it('uses a 3-column grid for 7 photos (3 columns, 3 rows)', () => {
    expect(collageGridTemplate(7)).toEqual({ columns: 3, rows: 3 });
  });
});
