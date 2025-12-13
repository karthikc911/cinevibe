"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, Brain, Database, Wand2, CheckCircle2, Loader2, X, Clock, Search, Film, Tv, TrendingUp } from "lucide-react";

export type AISubStep = {
  id: string;
  label: string;
  status: "loading" | "completed" | "error";
  timestamp?: number;
  details?: string;
};

export type AIStep = {
  id: string;
  label: string;
  status: "pending" | "loading" | "completed" | "error";
  description?: string;
  icon?: "sparkles" | "brain" | "database" | "wand" | "check" | "search" | "film" | "tv" | "trending";
  timestamp?: number;
  duration?: number;
  subSteps?: AISubStep[];
  result?: string;
  isExpanded?: boolean;
};

interface AIThinkingPanelProps {
  steps: AIStep[];
  isVisible: boolean;
  onClose?: () => void;
  title?: string;
  persistent?: boolean; // Keep visible after completion
}

export function AIThinkingPanel({
  steps,
  isVisible,
  onClose,
  title = "AI Recommendations Engine",
  persistent = false
}: AIThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Auto-expand when new steps are added
  useEffect(() => {
    if (steps.some(s => s.status === "loading")) {
      setIsExpanded(true);
    }
  }, [steps]);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const getIcon = (iconType?: string) => {
    switch (iconType) {
      case "sparkles":
        return Sparkles;
      case "brain":
        return Brain;
      case "database":
        return Database;
      case "wand":
        return Wand2;
      case "check":
        return CheckCircle2;
      case "search":
        return Search;
      case "film":
        return Film;
      case "tv":
        return Tv;
      case "trending":
        return TrendingUp;
      default:
        return Sparkles;
    }
  };

  const getStatusColor = (status: AIStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-blue-400"; // Changed from green to blue
      case "loading":
        return "text-cyan-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400"; // Changed from gray-500 to gray-400 for better visibility
    }
  };

  const getStatusBg = (status: AIStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-blue-500/15 border-blue-400/25"; // Changed from green to elegant blue
      case "loading":
        return "bg-cyan-500/15 border-cyan-400/25";
      case "error":
        return "bg-red-500/15 border-red-400/25";
      default:
        return "bg-gray-700/10 border-gray-500/20"; // More subtle for pending
    }
  };

  if (!isVisible) return null;

  const completedCount = steps.filter(s => s.status === "completed").length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
        className="w-full mb-6"
      >
              <div className="bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-blue-600/5 backdrop-blur-xl border border-blue-400/20 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div
                  className="px-6 py-4 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border-b border-blue-400/20 cursor-pointer select-none"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"
                      >
                        <Sparkles className="w-5 h-5 text-white" />
                      </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                  <p className="text-xs text-gray-300">
                    {completedCount === totalCount
                      ? "✨ Complete! Found your perfect matches"
                      : `Working on it... ${completedCount}/${totalCount} steps completed`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {persistent && onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-2 rounded-full hover:bg-red-500/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 rounded-full shadow-lg shadow-blue-500/50"
                    />
                  </div>
          </div>

          {/* Steps */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {steps.map((step, index) => {
                    const Icon = getIcon(step.icon);
                    const isStepExpanded = expandedSteps.has(step.id);
                    const hasExpandableContent = (step.subSteps && step.subSteps.length > 0) || step.result;
                    
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="space-y-2"
                      >
                        <div
                          className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusBg(
                            step.status
                          )} transition-all duration-300 ${
                            hasExpandableContent ? 'cursor-pointer hover:bg-white/5' : ''
                          }`}
                          onClick={() => hasExpandableContent && toggleStepExpansion(step.id)}
                        >
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {step.status === "loading" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <Loader2 className={`w-5 h-5 ${getStatusColor(step.status)}`} />
                              </motion.div>
                            ) : step.status === "completed" ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                              </motion.div>
                            ) : (
                              <Icon className={`w-5 h-5 ${getStatusColor(step.status)}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-semibold ${getStatusColor(step.status)}`}
                              >
                                {step.label}
                              </span>
                              {step.status === "loading" && (
                                <motion.span
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="text-xs text-cyan-400"
                                >
                                  processing...
                                </motion.span>
                              )}
                              {step.timestamp && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(step.timestamp)}
                                </span>
                              )}
                              {step.duration && step.status === "completed" && (
                                <span className="text-xs text-gray-500">
                                  ({formatDuration(step.duration)})
                                </span>
                              )}
                              {hasExpandableContent && (
                                <motion.div
                                  animate={{ rotate: isStepExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                </motion.div>
                              )}
                            </div>
                            {step.description && !isStepExpanded && (
                              <p className="text-sm text-gray-400 mt-1">
                                {step.description}
                              </p>
                            )}
                            {step.result && !isStepExpanded && (
                              <p className="text-sm text-blue-300 mt-1 font-medium">
                                {step.result}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Expandable Content */}
                        <AnimatePresence>
                          {isStepExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden ml-8 space-y-2"
                            >
                              {step.description && (
                                <p className="text-sm text-gray-400 p-3 bg-black/20 rounded-lg border border-white/10">
                                  {step.description}
                                </p>
                              )}
                              {step.result && (
                                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
                                  <p className="text-sm text-blue-300 font-medium">
                                    ✓ {step.result}
                                  </p>
                                </div>
                              )}
                              {step.subSteps && step.subSteps.map((subStep) => (
                                <motion.div
                                  key={subStep.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-start gap-2 p-2 bg-black/20 rounded border border-white/10"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {subStep.status === "loading" ? (
                                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                    ) : subStep.status === "completed" ? (
                                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    ) : (
                                      <X className="w-4 h-4 text-red-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-300">{subStep.label}</p>
                                    {subStep.details && (
                                      <p className="text-xs text-gray-500 mt-0.5">{subStep.details}</p>
                                    )}
                                    {subStep.timestamp && (
                                      <span className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {formatTimestamp(subStep.timestamp)}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

