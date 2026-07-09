"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { bikeComponents, getGuideByComponent } from "@/data/repairGuides";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import BikeDiagram from "@/components/BikeDiagram";
import RepairGuideView from "@/components/RepairGuideView";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Achievements from "@/components/Achievements";
import SearchBar from "@/components/SearchBar";
import ProblemDiagnosis from "@/components/ProblemDiagnosis";
import ToastContainer, { showToast } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChatAssistant from "@/components/ChatAssistant";
import { Bookmark, CheckCircle2 } from "lucide-react";
import { AIContext } from "@/lib/ai";

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [completedComponents, setCompletedComponents] = useLocalStorage<string[]>(
    "fixme-completed",
    []
  );
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("fixme-bookmarks", []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);

  const completedSet = useMemo(() => new Set(completedComponents), [completedComponents]);
  const bookmarksSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const selectedGuide = selectedComponent ? getGuideByComponent(selectedComponent) : undefined;

  const filteredComponents = useMemo(() => {
    let filtered = bikeComponents;

    if (showBookmarksOnly) {
      filtered = filtered.filter((comp) => bookmarksSet.has(comp.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (comp) =>
          comp.name.toLowerCase().includes(query) ||
          comp.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, showBookmarksOnly, bookmarksSet]);

  const handleSelectComponent = useCallback((componentId: string) => {
    setSelectedComponent(componentId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedComponent(null);
  }, []);

  const handleComplete = useCallback(() => {
    if (selectedComponent && !completedSet.has(selectedComponent)) {
      const newCompleted = [...completedComponents, selectedComponent];
      setCompletedComponents(newCompleted);
      showToast("Repair completed! Great job! 🎉", "success");
    }
    setSelectedComponent(null);
  }, [selectedComponent, completedSet, completedComponents, setCompletedComponents]);

  const handleToggleBookmark = useCallback(() => {
    if (!selectedComponent) return;

    if (bookmarksSet.has(selectedComponent)) {
      setBookmarks(bookmarks.filter((b) => b !== selectedComponent));
      showToast("Bookmark removed", "info");
    } else {
      setBookmarks([...bookmarks, selectedComponent]);
      showToast("Bookmark added! ⭐", "success");
    }
  }, [selectedComponent, bookmarksSet, bookmarks, setBookmarks]);

  const handleContextChange = useCallback((context: AIContext | null) => {
    setAiContext(context);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Header completedCount={completedComponents.length} totalCount={bikeComponents.length} />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          <AnimatePresence mode="wait">
            {selectedGuide ? (
              <RepairGuideView
                key="guide"
                guide={selectedGuide}
                onBack={handleBack}
                onComplete={handleComplete}
                isBookmarked={bookmarksSet.has(selectedComponent!)}
                onToggleBookmark={handleToggleBookmark}
                onContextChange={handleContextChange}
              />
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center mb-10">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-foreground mb-3"
                  >
                    What needs fixing?
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground text-lg"
                  >
                    Describe the problem, upload a photo, or click a component to start a guide
                  </motion.p>
                </div>

                <div className="mb-8">
                  <ProblemDiagnosis onNavigateToComponent={handleSelectComponent} />
                </div>

                <BikeDiagram
                  components={bikeComponents}
                  onSelectComponent={handleSelectComponent}
                  completedComponents={completedSet}
                />

                <div className="mt-10 space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        showBookmarksOnly
                          ? "bg-blue-500 text-white"
                          : "bg-secondary text-foreground hover:bg-accent"
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      Bookmarks ({bookmarks.length})
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {filteredComponents.map((comp, index) => {
                        const isCompleted = completedSet.has(comp.id);
                        const isBookmarked = bookmarksSet.has(comp.id);
                        const guide = getGuideByComponent(comp.id);
                        return (
                          <motion.button
                            key={comp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectComponent(comp.id)}
                            className={`text-left p-5 rounded-2xl border-2 transition-all ${
                              isCompleted
                                ? "border-green-500/30 bg-green-500/5 dark:border-green-500/40 dark:bg-green-500/10"
                                : "border-border bg-card hover:border-blue-500/40 dark:hover:border-blue-500/50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3
                                className={`font-bold ${
                                  isCompleted
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-foreground"
                                }`}
                              >
                                {comp.name}
                              </h3>
                              <div className="flex items-center gap-1.5">
                                {isBookmarked && (
                                  <Bookmark className="h-4 w-4 text-blue-500 fill-blue-500" />
                                )}
                                {isCompleted && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{comp.description}</p>
                            {guide && (
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-1 rounded-md font-semibold ${
                                    guide.difficulty === "Easy"
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                      : guide.difficulty === "Medium"
                                      ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                      : "bg-red-500/10 text-red-700 dark:text-red-400"
                                  }`}
                                >
                                  {guide.difficulty}
                                </span>
                                <span className="text-muted-foreground">{guide.estimatedTime}</span>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {filteredComponents.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-muted-foreground">
                        {showBookmarksOnly
                          ? "No bookmarked repairs yet. Add some bookmarks to see them here!"
                          : "No components match your search. Try a different term."}
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="mt-10">
                  <Achievements completedCount={completedComponents.length} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
        <ToastContainer />
        <ChatAssistant aiContext={aiContext} />
      </div>
    </ErrorBoundary>
  );
}
