"use client";

import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50 no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>for cyclists everywhere</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Fix Me © 2026</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Always prioritize safety. When in doubt, consult a professional bike mechanic.
          </p>
        </div>
      </div>
    </footer>
  );
}
