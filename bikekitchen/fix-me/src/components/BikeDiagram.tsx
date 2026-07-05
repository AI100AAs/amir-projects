"use client";

import { motion } from "framer-motion";
import { BikeComponent } from "@/data/repairGuides";

interface BikeDiagramProps {
  components: BikeComponent[];
  onSelectComponent: (componentId: string) => void;
  completedComponents: Set<string>;
}

export default function BikeDiagram({
  components,
  onSelectComponent,
  completedComponents,
}: BikeDiagramProps) {
  const FW = { cx: 170, cy: 290, r: 68 };
  const RW = { cx: 530, cy: 290, r: 68 };
  const BB = { x: 350, y: 300 };
  const HT_TOP = { x: 195, y: 155 };
  const HT_BOT = { x: 205, y: 195 };
  const ST_TOP = { x: 375, y: 155 };

  const hotspots: Record<string, { x: number; y: number; w: number; h: number }> = {
    "front-wheel": { x: FW.cx - FW.r - 10, y: FW.cy - FW.r - 10, w: FW.r * 2 + 20, h: FW.r * 2 + 20 },
    "rear-wheel": { x: RW.cx - RW.r - 10, y: RW.cy - RW.r - 10, w: RW.r * 2 + 20, h: RW.r * 2 + 20 },
    brakes: { x: 145, y: 195, w: 70, h: 55 },
    chain: { x: BB.x - 30, y: BB.y - 25, w: 110, h: 50 },
    seat: { x: ST_TOP.x - 45, y: ST_TOP.y - 45, w: 90, h: 55 },
    handlebars: { x: HT_TOP.x - 55, y: HT_TOP.y - 50, w: 110, h: 60 },
  };

  const spokeAngles = [0, 30, 60, 90, 120, 150];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-3xl mx-auto"
    >
      <svg viewBox="0 0 700 420" className="w-full h-auto" role="img" aria-label="Interactive bicycle diagram">
        {/* Frame */}
        <g strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-gray-700 dark:stroke-gray-300">
          {/* Top tube */}
          <line x1={HT_TOP.x} y1={HT_TOP.y} x2={ST_TOP.x} y2={ST_TOP.y} />
          {/* Down tube */}
          <line x1={HT_BOT.x} y1={HT_BOT.y} x2={BB.x} y2={BB.y} />
          {/* Seat tube */}
          <line x1={ST_TOP.x} y1={ST_TOP.y} x2={BB.x} y2={BB.y} />
          {/* Chain stays */}
          <line x1={BB.x} y1={BB.y} x2={RW.cx} y2={RW.cy} />
          {/* Seat stays */}
          <line x1={ST_TOP.x} y1={ST_TOP.y + 10} x2={RW.cx} y2={RW.cy} />
          {/* Head tube */}
          <line x1={HT_TOP.x} y1={HT_TOP.y} x2={HT_BOT.x} y2={HT_BOT.y} strokeWidth="7" />
          {/* Fork */}
          <line x1={HT_BOT.x} y1={HT_BOT.y} x2={FW.cx} y2={FW.cy} strokeWidth="4" />
        </g>

        {/* Stem */}
        <line x1={HT_TOP.x} y1={HT_TOP.y} x2={HT_TOP.x - 10} y2={HT_TOP.y - 25} strokeWidth="4" fill="none" strokeLinecap="round" className="stroke-gray-700 dark:stroke-gray-300" />
        {/* Handlebars */}
        <path d={`M ${HT_TOP.x - 50} ${HT_TOP.y - 20} Q ${HT_TOP.x - 10} ${HT_TOP.y - 35} ${HT_TOP.x + 30} ${HT_TOP.y - 15}`} strokeWidth="5" fill="none" strokeLinecap="round" className="stroke-gray-700 dark:stroke-gray-300" />
        {/* Grips */}
        <circle cx={HT_TOP.x - 50} cy={HT_TOP.y - 20} r="4" className="fill-gray-500 dark:fill-gray-400" />
        <circle cx={HT_TOP.x + 30} cy={HT_TOP.y - 15} r="4" className="fill-gray-500 dark:fill-gray-400" />

        {/* Seatpost */}
        <line x1={ST_TOP.x} y1={ST_TOP.y} x2={ST_TOP.x + 5} y2={ST_TOP.y - 30} strokeWidth="4" fill="none" strokeLinecap="round" className="stroke-gray-700 dark:stroke-gray-300" />
        {/* Saddle */}
        <path d={`M ${ST_TOP.x - 30} ${ST_TOP.y - 32} Q ${ST_TOP.x + 5} ${ST_TOP.y - 42} ${ST_TOP.x + 35} ${ST_TOP.y - 28}`} strokeWidth="7" fill="none" strokeLinecap="round" className="stroke-gray-600 dark:stroke-gray-400" />

        {/* Front wheel */}
        <circle cx={FW.cx} cy={FW.cy} r={FW.r} strokeWidth="4" fill="none" className="stroke-gray-600 dark:stroke-gray-400" />
        <circle cx={FW.cx} cy={FW.cy} r={FW.r - 5} strokeWidth="1" fill="none" className="stroke-gray-300 dark:stroke-gray-600" />
        <circle cx={FW.cx} cy={FW.cy} r="5" className="fill-gray-500 dark:fill-gray-400" />
        {spokeAngles.map((angle) => (
          <line
            key={`fs-${angle}`}
            x1={FW.cx + 6 * Math.cos((angle * Math.PI) / 180)}
            y1={FW.cy + 6 * Math.sin((angle * Math.PI) / 180)}
            x2={FW.cx + (FW.r - 8) * Math.cos((angle * Math.PI) / 180)}
            y2={FW.cy + (FW.r - 8) * Math.sin((angle * Math.PI) / 180)}
            strokeWidth="1"
            className="stroke-gray-400 dark:stroke-gray-500"
          />
        ))}
        {spokeAngles.map((angle) => (
          <line
            key={`fs2-${angle}`}
            x1={FW.cx - 6 * Math.cos((angle * Math.PI) / 180)}
            y1={FW.cy - 6 * Math.sin((angle * Math.PI) / 180)}
            x2={FW.cx - (FW.r - 8) * Math.cos((angle * Math.PI) / 180)}
            y2={FW.cy - (FW.r - 8) * Math.sin((angle * Math.PI) / 180)}
            strokeWidth="1"
            className="stroke-gray-400 dark:stroke-gray-500"
          />
        ))}

        {/* Rear wheel */}
        <circle cx={RW.cx} cy={RW.cy} r={RW.r} strokeWidth="4" fill="none" className="stroke-gray-600 dark:stroke-gray-400" />
        <circle cx={RW.cx} cy={RW.cy} r={RW.r - 5} strokeWidth="1" fill="none" className="stroke-gray-300 dark:stroke-gray-600" />
        <circle cx={RW.cx} cy={RW.cy} r="5" className="fill-gray-500 dark:fill-gray-400" />
        {spokeAngles.map((angle) => (
          <line
            key={`rs-${angle}`}
            x1={RW.cx + 6 * Math.cos((angle * Math.PI) / 180)}
            y1={RW.cy + 6 * Math.sin((angle * Math.PI) / 180)}
            x2={RW.cx + (RW.r - 8) * Math.cos((angle * Math.PI) / 180)}
            y2={RW.cy + (RW.r - 8) * Math.sin((angle * Math.PI) / 180)}
            strokeWidth="1"
            className="stroke-gray-400 dark:stroke-gray-500"
          />
        ))}
        {spokeAngles.map((angle) => (
          <line
            key={`rs2-${angle}`}
            x1={RW.cx - 6 * Math.cos((angle * Math.PI) / 180)}
            y1={RW.cy - 6 * Math.sin((angle * Math.PI) / 180)}
            x2={RW.cx - (RW.r - 8) * Math.cos((angle * Math.PI) / 180)}
            y2={RW.cy - (RW.r - 8) * Math.sin((angle * Math.PI) / 180)}
            strokeWidth="1"
            className="stroke-gray-400 dark:stroke-gray-500"
          />
        ))}

        {/* Cassette (rear gears) */}
        <circle cx={RW.cx} cy={RW.cy} r="16" strokeWidth="2" fill="none" className="stroke-gray-500 dark:stroke-gray-400" />

        {/* Chainring */}
        <circle cx={BB.x} cy={BB.y} r="22" strokeWidth="2.5" fill="none" className="stroke-gray-500 dark:stroke-gray-400" />
        <circle cx={BB.x} cy={BB.y} r="6" className="fill-gray-500 dark:fill-gray-400" />

        {/* Chain (top run) */}
        <line x1={BB.x + 22} y1={BB.y - 4} x2={RW.cx - 16} y2={RW.cy - 4} strokeWidth="2" strokeDasharray="5 3" className="stroke-gray-400 dark:stroke-gray-500" />
        {/* Chain (bottom run) */}
        <line x1={BB.x + 22} y1={BB.y + 4} x2={RW.cx - 16} y2={RW.cy + 4} strokeWidth="2" strokeDasharray="5 3" className="stroke-gray-400 dark:stroke-gray-500" />

        {/* Crank arms */}
        <line x1={BB.x} y1={BB.y} x2={BB.x - 18} y2={BB.y + 28} strokeWidth="3.5" strokeLinecap="round" className="stroke-gray-600 dark:stroke-gray-400" />
        <line x1={BB.x} y1={BB.y} x2={BB.x + 18} y2={BB.y - 28} strokeWidth="3.5" strokeLinecap="round" className="stroke-gray-600 dark:stroke-gray-400" />
        {/* Pedals */}
        <rect x={BB.x - 28} y={BB.y + 24} width="16" height="6" rx="2" className="fill-gray-500 dark:fill-gray-400" />
        <rect x={BB.x + 14} y={BB.y - 34} width="16" height="6" rx="2" className="fill-gray-500 dark:fill-gray-400" />

        {/* Front brake caliper */}
        <path d={`M ${FW.cx + 15} ${FW.cy - FW.r + 5} L ${FW.cx + 5} ${FW.cy - FW.r + 18} L ${FW.cx - 5} ${FW.cy - FW.r + 5}`} strokeWidth="2.5" fill="none" strokeLinecap="round" className="stroke-red-500 dark:stroke-red-400" />
        {/* Rear brake caliper */}
        <path d={`M ${RW.cx + 15} ${RW.cy - RW.r + 5} L ${RW.cx + 5} ${RW.cy - RW.r + 18} L ${RW.cx - 5} ${RW.cy - RW.r + 5}`} strokeWidth="2.5" fill="none" strokeLinecap="round" className="stroke-red-500 dark:stroke-red-400" />

        {/* Brake cables */}
        <path d={`M ${HT_TOP.x - 30} ${HT_TOP.y - 18} Q ${FW.cx + 30} ${FW.cy - FW.r - 20} ${FW.cx + 10} ${FW.cy - FW.r + 8}`} strokeWidth="1.5" fill="none" className="stroke-gray-400 dark:stroke-gray-500" />
        <path d={`M ${HT_TOP.x + 10} ${HT_TOP.y - 12} Q ${ST_TOP.x + 40} ${ST_TOP.y - 20} ${RW.cx + 10} ${RW.cy - RW.r + 8}`} strokeWidth="1.5" fill="none" className="stroke-gray-400 dark:stroke-gray-500" />

        {/* Ground shadow */}
        <ellipse cx="350" cy={FW.cy + FW.r + 12} rx="250" ry="6" className="fill-gray-200/50 dark:fill-gray-700/30" />

        {/* Interactive hotspots */}
        {components.map((comp) => {
          const spot = hotspots[comp.id];
          if (!spot) return null;
          const isCompleted = completedComponents.has(comp.id);
          return (
            <g
              key={comp.id}
              onClick={() => onSelectComponent(comp.id)}
              className="cursor-pointer group"
              role="button"
              aria-label={`Select ${comp.name}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectComponent(comp.id);
                }
              }}
            >
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.w}
                height={spot.h}
                rx="12"
                className={`transition-all duration-300 ${
                  isCompleted
                    ? "fill-green-500/10 stroke-green-500 dark:fill-green-500/20 dark:stroke-green-400"
                    : "fill-blue-500/5 stroke-blue-500/40 group-hover:fill-blue-500/10 group-hover:stroke-blue-500 dark:fill-blue-500/10 dark:stroke-blue-400/40 dark:group-hover:fill-blue-500/20 dark:group-hover:stroke-blue-400"
                }`}
                strokeWidth="2"
                strokeDasharray={isCompleted ? "none" : "6 3"}
              />
              <rect
                x={spot.x + spot.w / 2 - 55}
                y={spot.y - 32}
                width="110"
                height="28"
                rx="14"
                className={`transition-all shadow-sm ${
                  isCompleted
                    ? "fill-green-500 dark:fill-green-600"
                    : "fill-blue-500 dark:fill-blue-600 group-hover:fill-blue-600 dark:group-hover:fill-blue-500"
                }`}
              />
              <text
                x={spot.x + spot.w / 2}
                y={spot.y - 14}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="600"
              >
                {isCompleted ? "✓ Completed" : comp.name}
              </text>
            </g>
          );
        })}
      </svg>
    </motion.div>
  );
}
