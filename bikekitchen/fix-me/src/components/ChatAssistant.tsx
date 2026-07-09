"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Wrench,
  ImagePlus,
  Camera,
} from "lucide-react";
import { AIContext, callAI } from "@/lib/ai";
import { compressImageToDataUrl, isImageFile } from "@/lib/image";

interface ChatAssistantProps {
  aiContext?: AIContext | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export default function ChatAssistant({ aiContext }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingImage]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handlePhotoSelect = async (file: File | undefined) => {
    if (!file || isLoading) return;
    if (!isImageFile(file)) return;

    setIsReadingPhoto(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPendingImage(dataUrl);
    } catch {
      // Silent fail in chat; user can retry
      setPendingImage(null);
    } finally {
      setIsReadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !pendingImage) || isLoading) return;

    const image = pendingImage || undefined;
    const userMessage: Message = {
      role: "user",
      content: text || "Please look at this photo of my bike and help me fix it.",
      image,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    try {
      const history = newMessages.map(({ role, content }) => ({ role, content }));
      const response = await callAI(
        "chat",
        userMessage.content,
        aiContext || undefined,
        history,
        image
      );
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Unable to connect to AI service. Make sure LM Studio is running with a vision-capable model.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const canSend = Boolean(input.trim() || pendingImage) && !isLoading && !isReadingPhoto;

  const contextLabel = aiContext
    ? aiContext.stepTitle
      ? `${aiContext.repairTitle} → ${aiContext.stepTitle}`
      : aiContext.repairTitle
    : null;

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center no-print"
        aria-label="Open AI assistant"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      {aiContext && !isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-6 z-40 max-w-[200px] px-3 py-2 bg-card border border-border rounded-xl shadow-lg no-print"
        >
          <p className="text-[10px] text-muted-foreground truncate">
            AI knows you&apos;re on:{" "}
            <span className="font-semibold text-foreground">{contextLabel}</span>
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 h-[500px] bg-card border-2 border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden no-print"
          >
            <div className="p-4 border-b border-border bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">Fix Me AI</h3>
                  {contextLabel ? (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {contextLabel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Bike repair assistant · photo help
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="text-4xl">🚲</div>
                  <p className="text-sm text-muted-foreground">
                    Ask about bike repair or attach a photo of the problem.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs bg-secondary hover:bg-accent text-foreground rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Camera className="h-3 w-3" />
                      Upload bike photo
                    </button>
                    {aiContext &&
                      ["What tools do I need?", "How long will this take?", "Is this safe to do myself?"].map(
                        (q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              setInput(q);
                              inputRef.current?.focus();
                            }}
                            className="px-3 py-1.5 text-xs bg-secondary hover:bg-accent text-foreground rounded-lg transition-colors"
                          >
                            {q}
                          </button>
                        )
                      )}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.image}
                        alt="Attached bike photo"
                        className="mb-2 max-h-32 rounded-lg object-cover w-full"
                      />
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
              />

              {pendingImage && (
                <div className="mb-2 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingImage}
                    alt="Photo to send"
                    className="h-16 w-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isReadingPhoto}
                  className="px-3 py-2 bg-secondary hover:bg-accent text-foreground rounded-xl disabled:opacity-50 transition-colors"
                  aria-label="Attach photo"
                >
                  {isReadingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingImage ? "Add a note (optional)..." : "Ask about bike repair..."}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!canSend}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
