import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

type Theme = { id: string; label: string };

interface ThemeMapProps {
  themes: Theme[];
  onThemeClick?: (theme: Theme) => void;
}

export default function ThemeMap({ themes, onThemeClick }: ThemeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || themes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<Theme>().value(() => 1);
    const arc = d3.arc<d3.PieArcDatum<Theme>>().innerRadius(0).outerRadius(radius);

    const arcs = g.selectAll('.arc').data(pie(themes)).enter().append('g').attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', (_, i) => d3.schemeCategory10[i % 10])
      .style('cursor', 'pointer')
      .on('click', (_, d) => onThemeClick?.(d.data));

    arcs
      .append('text')
      .attr('transform', (d) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .text((d) => d.data.label.substring(0, 15))
      .style('font-size', '12px')
      .style('fill', 'white');
  }, [themes, onThemeClick]);

  return (
    <div className="border rounded p-4">
      <h3 className="text-lg font-semibold mb-4">Theme Distribution</h3>
      <svg ref={svgRef} width="600" height="400" />
    </div>
  );
}
