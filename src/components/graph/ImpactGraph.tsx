import React, { useState } from 'react';
import {
  Server,
  Database,
  Radio,
  Layers,
  ShieldAlert,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { mockGraphNodes, mockGraphEdges, GraphNodeData } from '../../data/mockGraph';
import { GraphInspector } from './GraphInspector';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export const ImpactGraph: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(mockGraphNodes[1]); // default Checkout API
  const [zoomLevel, setZoomLevel] = useState(1);

  const getNodeIcon = (type: GraphNodeData['type']) => {
    switch (type) {
      case 'DATABASE':
        return <Database size={14} className="text-indigo-600" />;
      case 'API_GATEWAY':
        return <Layers size={14} className="text-brand-600" />;
      case 'CACHE':
        return <Radio size={14} className="text-rose-600" />;
      case 'QUEUE':
        return <Radio size={14} className="text-amber-600" />;
      default:
        return <Server size={14} className="text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Graph Visualizer Canvas */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-card p-4 shadow-card flex flex-col min-h-[580px] relative overflow-hidden">
        {/* Canvas Controls Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Interactive Blast Radius & Service Topology
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any node to inspect upstream/downstream dependencies and real-time risk propagation
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.4))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200/60"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.7))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200/60"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200/60"
              title="Reset Zoom"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 py-1.5 px-2 bg-slate-50/70 rounded-md border border-slate-200/50 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" /> Service Node
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-50 border border-indigo-200" /> Database / Store
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-orange-500" /> High-Risk Propagation Path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400" /> Normal Traffic Link
          </span>
        </div>

        {/* SVG Interactive Canvas */}
        <div className="flex-1 relative overflow-auto border border-slate-100 rounded-lg bg-[#FAFBFC] min-h-[460px] flex items-center justify-center">
          <div
            className="w-[820px] h-[540px] relative transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="arrow-blue"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#93C5FD" />
                </marker>
                <marker
                  id="arrow-orange"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#EA580C" />
                </marker>
              </defs>

              {mockGraphEdges.map(edge => {
                const sourceNode = mockGraphNodes.find(n => n.id === edge.source);
                const targetNode = mockGraphNodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isSelectedEdge =
                  selectedNode &&
                  (selectedNode.id === edge.source || selectedNode.id === edge.target);

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x + 80}
                      y1={sourceNode.y + 35}
                      x2={targetNode.x + 80}
                      y2={targetNode.y + 15}
                      stroke={
                        edge.isHighRiskPath
                          ? '#EA580C'
                          : isSelectedEdge
                          ? '#2563EB'
                          : '#CBD5E1'
                      }
                      strokeWidth={edge.isHighRiskPath ? 2.5 : isSelectedEdge ? 2 : 1.5}
                      strokeDasharray={edge.isHighRiskPath ? '4 3' : undefined}
                      markerEnd={edge.isHighRiskPath ? 'url(#arrow-orange)' : 'url(#arrow-blue)'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodes Container */}
            {mockGraphNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isHighRisk = node.risk === 'HIGH' || node.risk === 'CRITICAL';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    'absolute w-[160px] p-2.5 rounded-lg border bg-white shadow-card cursor-pointer transition-all select-none z-10 hover:shadow-dropdown',
                    isSelected
                      ? 'ring-2 ring-brand-500 border-brand-500 shadow-md -translate-y-0.5'
                      : isHighRisk
                      ? 'border-orange-300 hover:border-orange-400'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getNodeIcon(node.type)}
                      <span className="font-semibold text-slate-900 text-xs truncate">
                        {node.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        node.status === 'HEALTHY'
                          ? 'bg-emerald-500'
                          : node.status === 'WARNING'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-100 pt-1 mt-1">
                    <span>{node.type}</span>
                    <span
                      className={cn(
                        'font-bold',
                        node.risk === 'HIGH' ? 'text-orange-600' : 'text-slate-700'
                      )}
                    >
                      {node.riskScore}/100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Inspector Panel */}
      <GraphInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
};
