"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, HelpCircle, Loader2, Sparkles, X } from "lucide-react";
import { callAI, AIContext } from "@/lib/ai";

interface StepAIHelpProps {
  aiContext: AIContext;
}

export default function StepAIHelp({ aiContext }: StepAIHelpProps) {
  const [mode, setMode] = useState<"explain" | "stuck" | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (requestMode: "explain" | "stuck") => {
    if (isLoading) return;

    if (mode === requestMode && response) {
      setMode(null);
      setResponse(null);
      return;
    }

    setMode(requestMode);
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const prompts = {
      explain: `Please explain this step in more detail. Why is this step important and what's happening mechanically?`,
      stuck: `I'm having trouble with this step. What are common mistakes and alternative approaches I can try?`,
    };

    try {
      const result = await callAI(requestMode, prompts[requestMode], aiContext);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI help");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleRequest("explain")}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === "explain" && response
              ? "bg-blue-500 text-white"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
          } disabled:opacity-50`}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Explain this
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleRequest("stuck")}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === "stuck" && response
              ? "bg-orange-500 text-white"
              : "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20"
          } disabled:opacity-50`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          I&apos;m stuck
        </motion.button>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl"
          >
            <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-400">AI is thinking...</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {response && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-3 p-4 rounded-xl border ${
              mode === "explain"
                ? "bg-blue-500/10 border-blue-500/20"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${mode === "explain" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`} />
                <span className={`text-xs font-bold ${mode === "explain" ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                  {mode === "explain" ? "AI Explanation" : "AI Help"}
                </span>
              </div>
              <button
                onClick={() => {
                  setMode(null);
                  setResponse(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
