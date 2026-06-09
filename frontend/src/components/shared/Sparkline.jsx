export default function Sparkline({ direction = 'flat', color, width = 60, height = 28 }) {
  const paths = {
    up:   `M0,${height} L${width*0.2},${height*0.7} L${width*0.4},${height*0.5} L${width*0.6},${height*0.3} L${width*0.8},${height*0.15} L${width},${height*0.05}`,
    down: `M0,${height*0.05} L${width*0.2},${height*0.15} L${width*0.4},${height*0.3} L${width*0.6},${height*0.5} L${width*0.8},${height*0.7} L${width},${height}`,
    flat: `M0,${height*0.5} L${width*0.2},${height*0.45} L${width*0.4},${height*0.55} L${width*0.6},${height*0.42} L${width*0.8},${height*0.52} L${width},${height*0.48}`,
  };
  const colors = { up: '#16A34A', down: '#DC2626', flat: '#D97706' };
  const lineColor = color || colors[direction] || colors.flat;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={paths[direction] || paths.flat}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
