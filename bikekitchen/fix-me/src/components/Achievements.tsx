"use client";

import { motion } from "framer-motion";
import { Award, Star, Trophy, Zap } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: "award" | "star" | "trophy" | "zap";
  unlocked: boolean;
}

interface AchievementsProps {
  completedCount: number;
}

export default function Achievements({ completedCount }: AchievementsProps) {
  const achievements: Achievement[] = [
    {
      id: "first-repair",
      title: "First Fix",
      description: "Complete your first repair",
      icon: "star",
      unlocked: completedCount >= 1,
    },
    {
      id: "three-repairs",
      title: "Getting Handy",
      description: "Complete 3 repairs",
      icon: "award",
      unlocked: completedCount >= 3,
    },
    {
      id: "all-repairs",
      title: "Master Mechanic",
      description: "Complete all repairs",
      icon: "trophy",
      unlocked: completedCount >= 6,
    },
    {
      id: "quick-learner",
      title: "Quick Learner",
      description: "Complete 2 repairs",
      icon: "zap",
      unlocked: completedCount >= 2,
    },
  ];

  const icons = {
    award: Award,
    star: Star,
    trophy: Trophy,
    zap: Zap,
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (unlockedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-6"
    >
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        Achievements
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {achievements.map((achievement) => {
          const Icon = icons[achievement.icon];
          return (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: achievement.unlocked ? 1.05 : 1 }}
              className={`p-4 rounded-xl text-center transition-all ${
                achievement.unlocked
                  ? "bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30"
                  : "bg-muted/50 border border-border opacity-40"
              }`}
            >
              <Icon
                className={`h-8 w-8 mx-auto mb-2 ${
                  achievement.unlocked
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-muted-foreground"
                }`}
              />
              <p className="text-xs font-bold text-foreground mb-1">{achievement.title}</p>
              <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
