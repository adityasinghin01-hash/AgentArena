"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Swords, Trophy, Activity, AlertCircle, Loader2 } from "lucide-react";

type Agent = {
  agentId: string;
  name: string;
  avatar: string;
  category: string;
  provider: string;
};

type Output = {
  agentId: string;
  text: string;
  scores: any;
  responseTimeMs: number;
};

type Round = {
  round: number;
  slotName: string;
  slotTask: string;
  evaluationCriteria: string;
  outputs: Output[];
  isComplete: boolean;
};

export default function ArenaPage() {
  const router = useRouter();
  const [userInput, setUserInput] = useState("");
  const [status, setStatus] = useState<"idle" | "assembling" | "battling" | "finished" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Silent ping on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/health`).catch(() => {});
    
    // Check auth
    if (!localStorage.getItem("userToken")) {
      router.push("/login");
    }
  }, [router]);

  const handleFight = async () => {
    if (!userInput.trim()) return;
    setStatus("assembling");
    setErrorMessage("");
    
    try {
      const token = localStorage.getItem("userToken");
      
      // Step 1: Decompose Outcome
      const decompRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/outcome/decompose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ outcomeText: userInput }),
      });
      if (!decompRes.ok) throw new Error("Failed to parse goals. Try making it more detailed.");
      const { data: { slots } } = await decompRes.json();

      // Step 2: Create Pipeline
      const pipeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/pipeline/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ outcomeText: userInput, slots }),
      });
      if (!pipeRes.ok) throw new Error("Failed to assemble pipeline agents.");
      const { data: pipeline } = await pipeRes.json();
      
      setPipelineId(pipeline._id);
      
      // Step 3: Start SSE Audition
      startAudition(pipeline._id);
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  const startAudition = async (pId: string) => {
    setStatus("battling");
    setRounds([]);
    setAgents([]);
    
    const token = localStorage.getItem("userToken");
    
    try {
      // POST request using Fetch to consume SSE stream
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/audition/run/${pId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userInput }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // Stream processor
      while (true) {
         const { value, done } = await reader.read();
         if (done) break;
         
         buffer += decoder.decode(value, { stream: true });
         
         const lines = buffer.split("\n\n");
         buffer = lines.pop() || ""; // keep incomplete event in buffer

         for (const line of lines) {
           if (line.startsWith("data: ")) {
             const dataStr = line.replace("data: ", "");
             if (dataStr === "[DONE]") {
               break;
             }
             try {
               const eventData = JSON.parse(dataStr);
               handleSseEvent(eventData);
             } catch (e) {
               console.error("SSE parse error", e, dataStr);
             }
           }
         }
      }
    } catch (err: any) {
      setErrorMessage("Stream disconnected unexpectedly.");
      setStatus("error");
    }
  };

  const handleSseEvent = (data: any) => {
    switch (data.event) {
      case "round_start":
        setCurrentRound(data.round);
        if (agents.length === 0 && data.agents) {
          setAgents(data.agents);
        }
        setRounds((prev) => [
          ...prev, 
          { round: data.round, slotName: data.slot.name, slotTask: data.slot.task, evaluationCriteria: data.slot.evaluationCriteria, outputs: [], isComplete: false }
        ]);
        break;
      
      case "agent_output":
        setRounds((prev) => {
          const newRounds = [...prev];
          const rd = newRounds.find(r => r.round === data.round);
          if (rd) {
            rd.outputs.push({
              agentId: data.agentId,
              text: data.output,
              scores: data.scores,
              responseTimeMs: data.responseTimeMs
            });
          }
          return newRounds;
        });
        break;
        
      case "round_complete":
        setLeaderboard(data.leaderboard);
        setRounds((prev) => {
          const newRounds = [...prev];
          const rd = newRounds.find(r => r.round === data.round);
          if (rd) rd.isComplete = true;
          return newRounds;
        });
        break;
        
      case "overall_winner":
        setStatus("finished");
        if (data.auditionId) {
          setTimeout(() => {
            router.push(`/results/${data.auditionId}`);
          }, 3000); // Redirect after brief celebration
        }
        break;
        
      case "error":
        setErrorMessage(data.message);
        setStatus("error");
        break;
    }
  };

  if (status === "idle" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              The AI Battle Engine
            </h1>
            <p className="text-gray-400 text-lg">
              Describe a complex problem. Watch specialized AI agents compete round-by-round to solve it.
            </p>
          </div>

          <div className="bg-surface/50 border border-border/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <textarea
              className="w-full bg-black/40 border border-border rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-32"
              placeholder="E.g., Write a 7-day marketing strategy for our new zero-emission scooter..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            {errorMessage && (
              <div className="mt-4 flex items-center p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                <AlertCircle className="w-5 h-5 mr-2" />
                {errorMessage}
              </div>
            )}
            
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {["Review my code for security issues", "Plan a 3-day trip to Tokyo", "Explain quantum computing to a 10yo"].map((demo) => (
                  <button
                    key={demo}
                    onClick={() => setUserInput(demo)}
                    className="text-xs bg-surface border border-border px-3 py-1.5 rounded-full hover:bg-border/50 transition-colors text-gray-300"
                  >
                    {demo}
                  </button>
                ))}
              </div>
              <button
                onClick={handleFight}
                disabled={!userInput.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg glow-primary shrink-0"
              >
                <Swords className="w-5 h-5" />
                <span>Start Battle</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === "assembling") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Assembling Your Arena</h2>
        <p className="text-gray-400 max-w-md">
          Breaking down your request into specialized tasks and summoning top-tier AI agents for the battle...
        </p>
      </div>
    );
  }

  // BATTLING OR FINISHED STATE
  const currentRoundData = rounds.find((r) => r.round === currentRound);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden w-full">
      {/* Header Panel */}
      <header className="bg-surface/80 border-b border-border/60 p-4 sticky top-0 z-10 backdrop-blur-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center">
            <Swords className="w-5 h-5 mr-2 text-primary" /> Round {currentRound}
          </h1>
          <p className="text-sm text-gray-400 font-medium">{currentRoundData?.slotName || "Preparing..."}</p>
        </div>
        {status === "finished" && (
          <div className="flex items-center text-green-400 font-bold bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">
            <Trophy className="w-5 h-5 mr-2" /> Match Complete
          </div>
        )}
        <div className="flex items-center space-x-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Live Leaderboard</div>
          <div className="flex space-x-2">
            {leaderboard.map((lb, i) => (
              <div key={lb.agentId} className={`px-3 py-1 rounded border flex items-center ${i === 0 ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-surface border-border text-gray-400'}`}>
                <span className="font-bold mr-2 text-sm">{Math.round(lb.totalScore)}</span>
                <span className="text-xs truncate max-w-[80px]">{lb.agentName}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Battle Lanes */}
      <div className="flex-1 p-4 flex gap-4 h-[calc(100vh-80px)]">
        {agents.map((agent) => {
          const output = currentRoundData?.outputs.find(o => o.agentId === agent.agentId);
          const lbPos = leaderboard.findIndex(l => l.agentId === agent.agentId);
          
          return (
            <div key={agent.agentId} className="flex-1 bg-surface/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden relative">
              {/* Agent Header */}
              <div className="p-4 border-b border-border/50 flex justify-between items-center bg-black/20">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{agent.avatar}</div>
                  <div>
                    <h3 className="font-bold text-white leading-tight">{agent.name}</h3>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">{agent.provider} • {agent.category}</div>
                  </div>
                </div>
                {lbPos === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
              </div>

              {/* Console Output Area */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed space-y-4">
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 mb-2">
                    $ <span className="text-accent">Executing strategy for:</span> {currentRoundData?.slotTask}
                  </motion.div>

                  {!output ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center text-primary/70">
                      <Zap className="w-4 h-4 mr-2 animate-pulse" /> Generating output...
                    </motion.div>
                  ) : (
                    <motion.div key="output" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-gray-200 bg-black/30 p-4 rounded-xl border border-white/5 whitespace-pre-wrap">
                      {output.text}
                    </motion.div>
                  )}
                  
                  {output?.scores && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-surface p-2 rounded flex justify-between">
                        <span className="text-gray-400">Total Score</span>
                        <span className="text-white font-bold">{output.scores.total}</span>
                      </div>
                      <div className="bg-surface p-2 rounded flex justify-between">
                        <span className="text-gray-400">Time</span>
                        <span className="text-white font-bold">{(output.responseTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Dim overlay and redirecting text when finished */}
      <AnimatePresence>
        {status === "finished" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <Trophy className="w-24 h-24 text-primary glow-primary mb-6" />
            <h2 className="text-4xl font-black text-white mb-4">Battle Complete!</h2>
            <p className="text-xl text-gray-300">Redirecting to deep analysis...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
