import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calculator, 
  History, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  ChevronRight,
  Maximize2,
  Minimize2,
  FlaskConical,
  Variable
} from "lucide-react";
import { create, all } from "mathjs";
import { GoogleGenAI } from "@google/genai";
import { cn } from "./lib/utils";

const math = create(all);

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  label?: string;
}

export default function App() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isScientific, setIsScientific] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("zenith_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("zenith_history", JSON.stringify(history));
  }, [history]);

  const handleCalculate = async (expr: string = expression) => {
    const targetExpr = expr.trim();
    if (!targetExpr) return;

    setIsLoading(true);
    try {
      // Try standard math first
      try {
        const result = math.evaluate(targetExpr);
        const resultStr = typeof result === 'object' ? result.toString() : String(result);
        addHistory(targetExpr, resultStr);
        setDisplay(resultStr);
        setExpression("");
      } catch (e) {
        // If it fails, try Gemini for natural language
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Evaluate this mathematical or financial expression and return ONLY the numerical result or a very short answer: "${targetExpr}"`,
        });
        
        const result = response.text?.trim() || "Error";
        addHistory(targetExpr, result);
        setDisplay(result);
        setExpression("");
      }
    } catch (error) {
      setDisplay("Error");
    } finally {
      setIsLoading(false);
    }
  };

  const addHistory = (expr: string, res: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      expression: expr,
      result: res,
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  const appendToExpression = (val: string) => {
    const functions = ["sin", "cos", "tan", "log", "ln", "sqrt"];
    if (functions.includes(val)) {
      setExpression(prev => prev + val + "(");
    } else {
      setExpression(prev => prev + val);
    }
  };

  const clear = () => {
    setExpression("");
    setDisplay("0");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttons = [
    ["C", "()", "%", "/"],
    ["7", "8", "9", "*"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "DEL", "="],
  ];

  const scientificButtons = [
    ["sin", "cos", "tan"],
    ["log", "ln", "sqrt"],
    ["^", "pi", "e"]
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        layout
        className={cn(
          "relative w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500",
          isCompact ? "max-w-xs" : "max-w-md"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-white/90">Zenith</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsScientific(!isScientific)}
              className={cn(
                "p-2 rounded-full transition-colors",
                isScientific ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"
              )}
              title="Scientific Mode"
            >
              <FlaskConical className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-2 rounded-full transition-colors",
                showHistory ? "bg-white/10 text-cyan-400" : "text-white/40 hover:text-white/60"
              )}
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsCompact(!isCompact)}
              className="p-2 rounded-full text-white/40 hover:text-white/60 transition-colors"
            >
              {isCompact ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="px-8 py-6 flex flex-col items-end justify-end min-h-[160px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={expression || "empty"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-white/40 text-lg font-mono mb-2 h-7 overflow-hidden text-right w-full"
            >
              {expression || " "}
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-4 w-full justify-end">
            {isLoading && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </motion.div>
            )}
            <motion.div 
              layout
              className="text-6xl font-light tracking-tighter text-white truncate max-w-full"
            >
              {display}
            </motion.div>
          </div>
          <button 
            onClick={copyToClipboard}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 transition-all text-xs border border-white/5"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy Result"}
          </button>
        </div>

        {/* Smart Input */}
        <div className="px-8 mb-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 group-focus-within:border-cyan-500/50 transition-all">
              <Sparkles className="w-4 h-4 text-cyan-400 mr-3 shrink-0" />
              <input 
                ref={inputRef}
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type math or ask anything..."
                className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 font-sans"
              />
              {expression && (
                <button 
                  onClick={() => handleCalculate()}
                  className="ml-2 p-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Keypad */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <AnimatePresence>
            {isScientific && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-3 gap-3 overflow-hidden"
              >
                {scientificButtons.flat().map((btn) => (
                  <button
                    key={btn}
                    onClick={() => appendToExpression(btn)}
                    className="h-12 rounded-xl flex items-center justify-center text-sm font-medium bg-white/5 text-cyan-400/80 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                  >
                    {btn}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-4 gap-3">
            {buttons.flat().map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "=") handleCalculate();
                  else if (btn === "C") clear();
                  else if (btn === "DEL") setExpression(prev => prev.slice(0, -1));
                  else if (btn === "()") {
                    const openCount = (expression.match(/\(/g) || []).length;
                    const closeCount = (expression.match(/\)/g) || []).length;
                    appendToExpression(openCount > closeCount ? ")" : "(");
                  }
                  else appendToExpression(btn);
                }}
                className={cn(
                  "h-14 rounded-2xl flex items-center justify-center text-xl font-medium transition-all active:scale-95",
                  btn === "=" 
                    ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30" 
                    : btn === "C" || btn === "DEL"
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/5"
                )}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-50 p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-white">History</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setHistory([])}
                    className="p-2 rounded-full text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="p-2 rounded-full text-white/40 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                    <History className="w-12 h-12" />
                    <p>No history yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group cursor-pointer"
                      onClick={() => {
                        setExpression(item.expression);
                        setDisplay(item.result);
                        setShowHistory(false);
                      }}
                    >
                      <div className="text-white/40 text-sm mb-1 group-hover:text-cyan-400 transition-colors">
                        {item.expression}
                      </div>
                      <div className="text-white text-xl font-medium">
                        {item.result}
                      </div>
                      <div className="text-[10px] text-white/10 mt-2 uppercase tracking-widest">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer Info */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 text-white/20 text-xs tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          AI Powered
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="w-3 h-3" />
          MathJS Core
        </div>
      </div>
    </div>
  );
}
