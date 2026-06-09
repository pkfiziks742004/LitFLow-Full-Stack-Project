import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, Loader2, Maximize, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/context/AppContext';
import { categories } from '@/data/mockData';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  category: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'cites' | 'related';
}

function truncateLabel(value: string, length = 30) {
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function linkKey(source: string, target: string) {
  return `${source}::${target}`;
}

async function loadExportModules() {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  return { html2canvas, jsPDF };
}

function buildFallbackLinks(nodes: GraphNode[], realLinks: GraphLink[]) {
  const links = [...realLinks];
  const seen = new Set(
    realLinks.map((link) =>
      linkKey(
        typeof link.source === 'string' ? link.source : link.source.id,
        typeof link.target === 'string' ? link.target : link.target.id,
      ),
    ),
  );
  const groups = new Map<string, GraphNode[]>();

  nodes.forEach((node) => {
    const group = groups.get(node.category) || [];
    group.push(node);
    groups.set(node.category, group);
  });

  groups.forEach((group) => {
    group
      .sort((left, right) => right.citations - left.citations)
      .slice(0, 8)
      .forEach((node, index, groupNodes) => {
        const nextNode = groupNodes[index + 1];

        if (!nextNode) return;

        const key = linkKey(node.id, nextNode.id);

        if (!seen.has(key)) {
          seen.add(key);
          links.push({ source: node.id, target: nextNode.id, type: 'related' });
        }
      });
  });

  const sortedNodes = [...nodes].sort((left, right) => right.citations - left.citations);
  const hub = sortedNodes[0];

  if (hub) {
    sortedNodes.slice(1, Math.min(sortedNodes.length, 10)).forEach((node) => {
      const key = linkKey(hub.id, node.id);

      if (!seen.has(key)) {
        seen.add(key);
        links.push({ source: hub.id, target: node.id, type: 'related' });
      }
    });
  }

  return links;
}

export function GraphVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const {
    papers,
    edges,
    filteredPapers,
    selectedPaper,
    setSelectedPaper,
    collections,
    isSearching,
    searchPapers,
    searchQuery,
    planCapabilities,
    siteConfig,
    upgradeToPro,
    isAuthenticated,
    toggleLoginModal,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);

  const getNodeColor = useCallback((category: string) => {
    const categoryItem = categories.find((entry) => entry.id === category);
    return categoryItem?.color || '#6B7280';
  }, []);

  const getNodeSize = useCallback((citations: number) => {
    const minSize = 10;
    const maxSize = 30;
    const normalized = Math.min(Math.log10(Math.max(citations, 0) + 10) / Math.log10(250000), 1);

    return minSize + normalized * (maxSize - minSize);
  }, []);

  const getYearLabel = useCallback((year: number) => {
    return year > 0 ? year.toString() : '';
  }, []);

  const getYearFontSize = useCallback((citations: number) => {
    const radius = getNodeSize(citations);

    if (radius >= 26) return '9.5px';
    if (radius >= 20) return '8.5px';
    if (radius >= 15) return '7.5px';
    return '6.5px';
  }, [getNodeSize]);

  const isInCollection = useCallback((paperId: string) => {
    return collections.some((collection) => collection.paperIds.includes(paperId));
  }, [collections]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 560;
    const isCompactViewport = width < 640 || height < 520;

    simulationRef.current?.stop();
    svg.selectAll('*').remove();

    const g = svg.append('g');
    const visiblePaperIds = new Set(filteredPapers.map((paper) => paper.id));
    const ringRadius = Math.min(width, height) * (isCompactViewport ? (filteredPapers.length <= 6 ? 0.11 : 0.17) : 0.27);

    const nodes: GraphNode[] = filteredPapers.map((paper, index) => {
      const angle = (index / Math.max(filteredPapers.length, 1)) * Math.PI * 2;
      const layer = 0.62 + (index % 4) * 0.12;

      return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        citations: paper.citations,
        category: paper.category,
        x: width / 2 + Math.cos(angle) * ringRadius * layer,
        y: height / 2 + Math.sin(angle) * ringRadius * layer,
      };
    });

    const realLinks: GraphLink[] = edges
      .filter((edge) => visiblePaperIds.has(edge.source) && visiblePaperIds.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
      }));

    const links =
      realLinks.length >= Math.min(nodes.length - 1, 3) ? realLinks : buildFallbackLinks(nodes, realLinks);

    const defs = svg.append('defs');

    defs
      .append('marker')
      .attr('id', 'arrow-cites')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    defs
      .append('marker')
      .attr('id', 'arrow-related')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#cbd5e1');

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'graph-edge')
      .attr('stroke', (edge) => (edge.type === 'cites' ? '#94a3b8' : '#cbd5e1'))
      .attr('stroke-opacity', (edge) => (edge.type === 'cites' ? 0.72 : 0.48))
      .attr('stroke-width', (edge) => (edge.type === 'cites' ? 1.8 : 1.1))
      .attr('stroke-dasharray', (edge) => (edge.type === 'related' ? '5,5' : 'none'))
      .attr('marker-end', (edge) => (edge.type === 'cites' ? 'url(#arrow-cites)' : 'url(#arrow-related)'));

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', (nodeItem) => `graph-node ${selectedPaper?.id === nodeItem.id ? 'selected' : ''}`)
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, nodeItem) => {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0.25).restart();
            }
            nodeItem.fx = nodeItem.x;
            nodeItem.fy = nodeItem.y;
          })
          .on('drag', (event, nodeItem) => {
            nodeItem.fx = event.x;
            nodeItem.fy = event.y;
          })
          .on('end', (event, nodeItem) => {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0);
            }
            nodeItem.fx = null;
            nodeItem.fy = null;
          }),
      );

    node
      .append('circle')
      .attr('r', (nodeItem) => getNodeSize(nodeItem.citations) + 8)
      .attr('fill', (nodeItem) => getNodeColor(nodeItem.category))
      .attr('opacity', 0.08);

    node
      .append('circle')
      .attr('r', (nodeItem) => getNodeSize(nodeItem.citations))
      .attr('fill', 'white')
      .attr('stroke', (nodeItem) => getNodeColor(nodeItem.category))
      .attr('stroke-width', (nodeItem) => (selectedPaper?.id === nodeItem.id ? 4 : 3))
      .attr('filter', (nodeItem) =>
        selectedPaper?.id === nodeItem.id
          ? 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.5))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
      );

    node
      .filter((nodeItem) => isInCollection(nodeItem.id))
      .append('circle')
      .attr('r', (nodeItem) => getNodeSize(nodeItem.citations) + 4)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3');

    node
      .append('text')
      .text((nodeItem) =>
        truncateLabel(
          nodeItem.title,
          isCompactViewport ? (nodeItem.citations > 20000 ? 20 : 16) : nodeItem.citations > 20000 ? 36 : 26,
        ),
      )
      .attr('text-anchor', 'middle')
      .attr('dy', (nodeItem) => getNodeSize(nodeItem.citations) + (isCompactViewport ? 12 : 15))
      .attr('font-size', (nodeItem) => (isCompactViewport ? '8px' : nodeItem.citations > 20000 ? '10.5px' : '9px'))
      .attr('font-weight', (nodeItem) => (nodeItem.citations > 20000 ? '600' : '500'))
      .attr('fill', '#374151')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
      .style('pointer-events', 'none');

    node
      .append('text')
      .text((nodeItem) => getYearLabel(nodeItem.year))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.34em')
      .attr('font-size', (nodeItem) => getYearFontSize(nodeItem.citations))
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.02em')
      .attr('fill', '#334155')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .style('pointer-events', 'none');

    node.on('click', (event, nodeItem) => {
      event.stopPropagation();
      const paper = papers.find((entry) => entry.id === nodeItem.id);

      if (paper) {
        setSelectedPaper(paper);
      }
    });

    node.on('dblclick', (event, nodeItem) => {
      event.stopPropagation();

      if (zoomRef.current && svgRef.current) {
        const currentSvg = d3.select(svgRef.current);
        const scale = 2;
        const x = -nodeItem.x! * scale + width / 2;
        const y = -nodeItem.y! * scale + height / 2;

        currentSvg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      }
    });

    const tooltip = d3
      .select('body')
      .append('div')
      .attr(
        'class',
        'absolute z-50 bg-white rounded-lg shadow-lg p-3 text-sm max-w-xs pointer-events-none opacity-0 transition-opacity duration-200',
      )
      .style('border', '1px solid #e5e7eb');

    node
      .on('mouseenter', (_event, nodeItem) => {
        tooltip.style('opacity', '1').html(`
          <div class="font-semibold text-gray-900 mb-1">${escapeHtml(nodeItem.title)}</div>
          <div class="text-gray-600 text-xs mb-1">${escapeHtml(nodeItem.authors.slice(0, 3).join(', '))}${nodeItem.authors.length > 3 ? ' et al.' : ''}</div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-blue-600 font-medium">${nodeItem.year || 'Unknown year'}</span>
            <span class="text-gray-400">-</span>
            <span class="text-gray-600">${nodeItem.citations.toLocaleString()} citations</span>
          </div>
        `);
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 10}px`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0');
      });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.18, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    const updatePositions = () => {
      link
        .attr('x1', (edge) => (edge.source as GraphNode).x!)
        .attr('y1', (edge) => (edge.source as GraphNode).y!)
        .attr('x2', (edge) => (edge.target as GraphNode).x!)
        .attr('y2', (edge) => (edge.target as GraphNode).y!);

      node.attr('transform', (nodeItem) => `translate(${nodeItem.x},${nodeItem.y})`);
    };

    const fitGraphToView = () => {
      const graphElement = g.node();

      if (!graphElement || nodes.length === 0) return;

      const bounds = graphElement.getBBox();

      if (!bounds.width || !bounds.height) return;

      const usableWidth = Math.max(width - (isCompactViewport ? 88 : 128), 1);
      const usableHeight = Math.max(height - (isCompactViewport ? 120 : 112), 1);
      const scale = Math.min(
        isCompactViewport ? 1.24 : 1.35,
        Math.max(0.32, 0.86 / Math.max(bounds.width / usableWidth, bounds.height / usableHeight)),
      );
      const translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
      const targetCenterY = isCompactViewport ? height * 0.45 : height / 2;
      const translateY = targetCenterY - scale * (bounds.y + bounds.height / 2);

      svg
        .transition()
        .duration(650)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
    };

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((nodeItem) => nodeItem.id)
          .distance((edge) => {
            if (isCompactViewport) {
              return edge.type === 'cites' ? 82 : 66;
            }

            return edge.type === 'cites' ? 118 : 92;
          })
          .strength((edge) => (edge.type === 'cites' ? 0.42 : isCompactViewport ? 0.22 : 0.18)),
      )
      .force('charge', d3.forceManyBody().strength(isCompactViewport ? (nodes.length > 24 ? -148 : -172) : nodes.length > 24 ? -210 : -280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX<GraphNode>(width / 2).strength(0.045))
      .force('y', d3.forceY<GraphNode>(height / 2).strength(0.045))
      .force(
        'collision',
        d3.forceCollide<GraphNode>().radius((nodeItem) => getNodeSize(nodeItem.citations) + (isCompactViewport ? 16 : 24)),
      )
      .alphaDecay(0.045);

    simulationRef.current = simulation;
    simulation.on('tick', updatePositions);
    simulation.tick(nodes.length > 28 ? 120 : 90);
    updatePositions();
    requestAnimationFrame(fitGraphToView);
    simulation.alpha(0.18).restart();
    simulation.on('end', fitGraphToView);

    svg.on('click', () => {
      setSelectedPaper(null);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [papers, edges, filteredPapers, selectedPaper, setSelectedPaper, getNodeColor, getNodeSize, getYearFontSize, getYearLabel, isInCollection]);

  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const ensureCanExport = () => {
    if (planCapabilities.graphExport) {
      return true;
    }

    if (siteConfig.pricing.enabled === false) {
      toast.info('Graph export is unavailable for this workspace right now.');
      return false;
    }

    toast.info('Graph export is available on the Pro plan.');

    if (isAuthenticated) {
      void upgradeToPro();
    } else {
      toggleLoginModal();
    }

    return false;
  };

  const exportAsPNG = async () => {
    if (!ensureCanExport()) return;
    if (!containerRef.current) return;
    setIsExporting(true);

    try {
      const { html2canvas } = await loadExportModules();
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `research-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!ensureCanExport()) return;
    if (!containerRef.current) return;
    setIsExporting(true);

    try {
      const { html2canvas, jsPDF } = await loadExportModules();
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`research-graph-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={containerRef} className="graph-workspace relative h-full w-full bg-transparent">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfcfe_0%,#f7f9fc_56%,#eef6fb_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(31,111,229,0.08),transparent_44%)]" />
        <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:32px_32px] sm:opacity-[0.18]" />
      </div>

      <svg
        ref={svgRef}
        className="relative z-[1] h-full min-h-[360px] w-full sm:min-h-[500px]"
      />

      {isSearching && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white/92 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: siteConfig.branding.primaryColor }} />
            <span className="text-sm font-medium text-slate-700">Searching real papers...</span>
          </div>
        </div>
      )}

      {!isSearching && papers.length === 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <div className="mx-4 max-w-[30rem] text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] border border-slate-200 bg-white text-slate-900 shadow-sm">
              <Search className="h-7 w-7" style={{ color: siteConfig.branding.primaryColor }} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Research map</p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2.3rem]">
              Search real research papers
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Enter a topic in the top search bar to load papers into your LitFlow workspace.
            </p>
            <Button
              className="mt-6 h-11 rounded-full px-5 text-white hover:opacity-95"
              disabled={!searchQuery.trim()}
              onClick={() => void searchPapers()}
              style={{ backgroundColor: siteConfig.branding.primaryColor }}
            >
              Search now
            </Button>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex flex-col gap-2 sm:bottom-4 sm:right-4">
        <div className="flex flex-col gap-1 rounded-[18px] border border-slate-200 bg-white/94 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 sm:h-9 sm:w-9">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 sm:h-9 sm:w-9">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetZoom} className="h-8 w-8 sm:h-9 sm:w-9">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-[18px] border border-slate-200 bg-white/94 shadow-[0_14px_36px_rgba(15,23,42,0.08)] hover:bg-white sm:h-10 sm:w-10"
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportAsPNG}>Export as PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsPDF}>Export as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="absolute left-3 top-3 hidden rounded-lg border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur-sm sm:block sm:left-4 sm:top-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-xs text-gray-600">{category.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-0.5 bg-gray-400" />
            <span className="text-xs text-gray-500">Cites</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-300 border-dashed" style={{ borderTop: '1px dashed #cbd5e1' }} />
            <span className="text-xs text-gray-500">Related</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded-2xl border border-gray-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4 sm:px-4">
        <span className="text-xs text-gray-600 sm:text-sm">
          <span className="sm:hidden">
            <span className="font-semibold text-gray-900">{filteredPapers.length}</span> papers
          </span>
          <span className="hidden sm:inline">
            Showing <span className="font-semibold text-gray-900">{filteredPapers.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{papers.length}</span> papers
          </span>
        </span>
      </div>
    </div>
  );
}
