"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RepairStep } from "@/data/repairGuides";
import { ChevronDown, Lightbulb, AlertTriangle, Check } from "lucide-react";
import StepAIHelp from "./StepAIHelp";
import { AIContext } from "@/lib/ai";

interface StepCardProps {
  step: RepairStep;
  index: number;
  isExpanded: boolean;
  isCompleted: boolean;
  onToggleExpanded: () => void;
  onToggleCompleted: () => void;
  aiContext: AIContext;
}

export default function StepCard({
  step,
  index,
  isExpanded,
  isCompleted,
  onToggleExpanded,
  onToggleCompleted,
  aiContext,
}: StepCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
        isCompleted
          ? "border-green-500/30 bg-green-500/5 dark:border-green-500/40 dark:bg-green-500/10"
          : isExpanded
          ? "border-blue-500/40 bg-card shadow-lg dark:border-blue-500/50"
          : "border-border bg-card hover:border-blue-500/30 dark:hover:border-blue-500/40"
      }`}
    >
      <div
        className="flex items-center gap-4 p-5 cursor-pointer select-none"
        onClick={onToggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpanded();
          }
        }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted();
          }}
          className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-muted-foreground/30 hover:border-blue-500 dark:border-muted-foreground/50"
          }`}
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted && <Check className="h-4 w-4" strokeWidth={3} />}
        </motion.button>

        <div
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
            isCompleted
              ? "bg-green-500/20 text-green-700 dark:text-green-400"
              : "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          }`}
        >
          {index + 1}
        </div>

        <span
          className={`flex-1 font-semibold ${
            isCompleted
              ? "text-green-700 dark:text-green-400 line-through"
              : "text-foreground"
          }`}
        >
          {step.title}
        </span>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 ml-[4.5rem]">
              <p className="text-muted-foreground leading-relaxed mb-4">{step.description}</p>

              {step.tip && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 p-4 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 rounded-xl mb-3"
                >
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 dark:text-blue-200">{step.tip}</p>
                </motion.div>
              )}

              {step.warning && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-xl"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-200">{step.warning}</p>
                </motion.div>
              )}

              <StepAIHelp
                aiContext={{
                  ...aiContext,
                  stepTitle: step.title,
                  stepDescription: step.description,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
