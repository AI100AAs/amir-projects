"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { DiagnosisResult, callAI } from "@/lib/ai";

interface ProblemDiagnosisProps {
  onNavigateToComponent: (componentId: string) => void;
}

export default function ProblemDiagnosis({ onNavigateToComponent }: ProblemDiagnosisProps) {
  const [symptom, setSymptom] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    if (!symptom.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await callAI("diagnose", symptom.trim());
      const parsed = JSON.parse(response);
      setResult(parsed);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("AI returned an unexpected response. Try rephrasing your problem.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to diagnose");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceColor = {
    high: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    low: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  };

  const componentNames: Record<string, string> = {
    "front-wheel": "Front Wheel",
    "rear-wheel": "Rear Wheel",
    brakes: "Brakes",
    chain: "Chain & Drivetrain",
    seat: "Seat & Seatpost",
    handlebars: "Handlebars & Stem",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10 border-2 border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-bold text-foreground">AI Problem Diagnosis</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Describe what&apos;s wrong with your bike and AI will suggest the right repair guide.
      </p>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDiagnose()}
            placeholder="e.g. My brakes are squeaking when I ride..."
            disabled={isLoading}
            className="w-full pl-12 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDiagnose}
          disabled={!symptom.trim() || isLoading}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Diagnose
              <Sparkles className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-5 bg-card border-2 border-border rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-foreground">{result.diagnosis}</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${confidenceColor[result.confidence]}`}>
                {result.confidence} confidence
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{result.explanation}</p>

            {result.alternative && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  <strong>Alternative:</strong> {result.alternative}
                </p>
              </div>
            )}

            {result.componentId && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToComponent(result.componentId!)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                Open {componentNames[result.componentId] || "Repair Guide"}
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}

            {!result.componentId && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  This issue may require professional help. Visit your local bike shop for assistance.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
