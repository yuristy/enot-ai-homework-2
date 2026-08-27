export function extractAverageColor(imageData: ImageData): { r: number; g: number; b: number } {
  const { data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount),
  };
}

export function collageGridTemplate(count: number): { columns: number; rows: number } {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { columns, rows };
}
