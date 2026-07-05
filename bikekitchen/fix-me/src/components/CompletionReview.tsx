"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Shield, AlertTriangle } from "lucide-react";
import { callAI, AIContext } from "@/lib/ai";

interface CompletionReviewProps {
  aiContext: AIContext;
  onComplete: () => void;
}

export default function CompletionReview({ aiContext, onComplete }: CompletionReviewProps) {
  const [review, setReview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReview = async () => {
      setIsLoading(true);
      try {
        const result = await callAI("review", "I just completed all steps in this repair guide. Please give me a safety review.", aiContext);
        setReview(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get review");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReview();
  }, [aiContext]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="mt-10"
    >
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border-2 border-green-500/30 dark:border-green-500/40 rounded-3xl p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-4 text-center"
        >
          🎉
        </motion.div>
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-3 text-center">
          Repair Complete!
        </h3>
        <p className="text-green-600 dark:text-green-300 mb-6 text-center">
          Great job! You&apos;ve successfully completed all steps.
        </p>

        <div className="bg-card/50 dark:bg-card/30 border border-green-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-bold text-foreground">AI Safety Review</h4>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-muted-foreground">Generating safety review...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {review && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{review}</p>
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Always test your repair in a safe area before riding in traffic.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onComplete}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-colors"
          >
            Back to Bike Diagram
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
