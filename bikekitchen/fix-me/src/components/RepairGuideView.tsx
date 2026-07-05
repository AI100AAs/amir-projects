"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { RepairGuide } from "@/data/repairGuides";
import StepCard from "./StepCard";
import ProgressTracker from "./ProgressTracker";
import CompletionReview from "./CompletionReview";
import { ArrowLeft, Clock, Wrench, Printer, Bookmark, BookmarkCheck } from "lucide-react";
import { AIContext } from "@/lib/ai";

interface RepairGuideViewProps {
  guide: RepairGuide;
  onBack: () => void;
  onComplete: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onContextChange?: (context: AIContext | null) => void;
}

export default function RepairGuideView({
  guide,
  onBack,
  onComplete,
  isBookmarked,
  onToggleBookmark,
  onContextChange,
}: RepairGuideViewProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedStep, setExpandedStep] = useState<string | null>(guide.steps[0]?.id ?? null);

  const allCompleted = completedSteps.size === guide.steps.length;

  const aiContext = useMemo<AIContext>(
    () => ({
      repairTitle: guide.title,
      difficulty: guide.difficulty,
      tools: guide.tools,
      completedSteps: completedSteps.size,
      totalSteps: guide.steps.length,
    }),
    [guide, completedSteps.size]
  );

  const expandedStepData = guide.steps.find((s) => s.id === expandedStep);
  const fullAIContext = useMemo<AIContext>(
    () => ({
      ...aiContext,
      stepTitle: expandedStepData?.title,
      stepDescription: expandedStepData?.description,
    }),
    [aiContext, expandedStepData]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    onContextChange?.(fullAIContext);
    return () => onContextChange?.(null);
  }, [fullAIContext, onContextChange]);

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleExpanded = (stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  const difficultyConfig = {
    Easy: { color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", icon: "🟢" },
    Medium: { color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20", icon: "🟡" },
    Hard: { color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20", icon: "🔴" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6 no-print">
        <motion.button
          whileHover={{ scale: 1.05, x: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bike Diagram
        </motion.button>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-secondary hover:bg-accent transition-colors"
            aria-label="Print guide"
          >
            <Printer className="h-4 w-4 text-foreground" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleBookmark}
            className={`p-2.5 rounded-xl transition-colors ${
              isBookmarked
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-secondary hover:bg-accent text-foreground"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-3">{guide.title}</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">{guide.description}</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${difficultyConfig[guide.difficulty].color}`}>
            {difficultyConfig[guide.difficulty].icon} {guide.difficulty}
          </span>
          <span className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {guide.estimatedTime}
          </span>
          <span className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
            {guide.steps.length} steps
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary/50 dark:bg-muted/50 border-2 border-border rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-foreground" />
            <h3 className="text-sm font-bold text-foreground">Tools Needed</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {guide.tools.map((tool) => (
              <motion.span
                key={tool}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {tool}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <ProgressTracker totalSteps={guide.steps.length} completedSteps={completedSteps.size} />

      <div className="space-y-4 mt-8">
        {guide.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isExpanded={expandedStep === step.id}
            isCompleted={completedSteps.has(step.id)}
            onToggleExpanded={() => toggleExpanded(step.id)}
            onToggleCompleted={() => toggleStep(step.id)}
            aiContext={aiContext}
          />
        ))}
      </div>

      {allCompleted && (
        <CompletionReview aiContext={aiContext} onComplete={onComplete} />
      )}
    </motion.div>
  );
}
