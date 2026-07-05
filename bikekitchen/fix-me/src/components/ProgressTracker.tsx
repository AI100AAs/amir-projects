"use client";

import { motion } from "framer-motion";

interface ProgressTrackerProps {
  totalSteps: number;
  completedSteps: number;
}

export default function ProgressTracker({ totalSteps, completedSteps }: ProgressTrackerProps) {
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-2 border-border rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-foreground">Progress</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {completedSteps} / {totalSteps} steps
          </span>
          <span className="text-sm font-bold text-primary">{percentage}%</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-green-500"
        />
      </div>
      {percentage === 100 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-green-600 dark:text-green-400 font-bold mt-3 flex items-center gap-1"
        >
          <span className="text-base">🎉</span> All steps completed!
        </motion.p>
      )}
    </motion.div>
  );
}
