type PolygonPreviewProps = {
  polygonJson?: string;
  height?: number;
};

type Point = [number, number];

function extractPoints(polygonJson?: string): Point[] {
  if (!polygonJson) return [];
  try {
    const parsed = JSON.parse(polygonJson) as {
      type?: string;
      coordinates?: unknown;
    };
    const coordinates = parsed?.coordinates;
    if (!coordinates) return [];

    if (parsed.type === "Polygon" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
      return (coordinates[0] as unknown[])
        .map((entry) => {
          if (!Array.isArray(entry) || entry.length < 2) return null;
          const lng = Number(entry[0]);
          const lat = Number(entry[1]);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
          return [lng, lat] as Point;
        })
        .filter((point): point is Point => Boolean(point));
    }

    if (
      parsed.type === "MultiPolygon" &&
      Array.isArray(coordinates) &&
      Array.isArray(coordinates[0]) &&
      Array.isArray(coordinates[0][0])
    ) {
      return (coordinates[0][0] as unknown[])
        .map((entry) => {
          if (!Array.isArray(entry) || entry.length < 2) return null;
          const lng = Number(entry[0]);
          const lat = Number(entry[1]);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
          return [lng, lat] as Point;
        })
        .filter((point): point is Point => Boolean(point));
    }
  } catch {
    return [];
  }
  return [];
}

function scalePoints(points: Point[], width: number, height: number): string {
  if (points.length < 3) return "";

  let minX = points[0][0];
  let maxX = points[0][0];
  let minY = points[0][1];
  let maxY = points[0][1];

  points.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const padding = 18;
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const rangeX = Math.max(maxX - minX, 0.000001);
  const rangeY = Math.max(maxY - minY, 0.000001);

  return points
    .map(([x, y]) => {
      const normalizedX = (x - minX) / rangeX;
      const normalizedY = (y - minY) / rangeY;
      const px = padding + normalizedX * usableWidth;
      const py = padding + (1 - normalizedY) * usableHeight;
      return `${px},${py}`;
    })
    .join(" ");
}

function projectPoint(point: Point, bounds: { minX: number; maxX: number; minY: number; maxY: number }, width: number, height: number) {
  const padding = 18;
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const rangeX = Math.max(bounds.maxX - bounds.minX, 0.000001);
  const rangeY = Math.max(bounds.maxY - bounds.minY, 0.000001);
  const normalizedX = (point[0] - bounds.minX) / rangeX;
  const normalizedY = (point[1] - bounds.minY) / rangeY;
  return {
    x: padding + normalizedX * usableWidth,
    y: padding + (1 - normalizedY) * usableHeight,
  };
}

export function PolygonPreview({ polygonJson, height = 220 }: PolygonPreviewProps) {
  const width = 560;
  const points = extractPoints(polygonJson);
  const polygonPoints = scalePoints(points, width, height);
  const bounds = points.reduce(
    (acc, [x, y]) => ({
      minX: Math.min(acc.minX, x),
      maxX: Math.max(acc.maxX, x),
      minY: Math.min(acc.minY, y),
      maxY: Math.max(acc.maxY, y),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Polygon preview">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        {polygonPoints ? (
          <>
            <polygon points={polygonPoints} fill="rgba(37, 99, 235, 0.2)" stroke="rgba(59, 130, 246, 0.95)" strokeWidth="2" />
            {points.map(([lng, lat], index) => {
              const { x: cx, y: cy } = projectPoint([lng, lat], bounds, width, height);
              return <circle key={`${lng}-${lat}-${index}`} cx={cx} cy={cy} r={3.5} fill="#60a5fa" />;
            })}
          </>
        ) : (
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="rgba(148,163,184,0.85)" fontSize="14">
            Enter valid Polygon JSON to preview map
          </text>
        )}
      </svg>
    </div>
  );
}
