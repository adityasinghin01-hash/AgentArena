"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, RefreshCw, ChevronLeft, Calendar, FileText } from "lucide-react";

type LeaderboardEntry = {
  agentId: string;
  agentName: string;
  totalScore: number;
};

export default function ResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAudition = async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/audition/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load audition results");
        
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAudition();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading results...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-red-400 mb-4">{error}</div>
        <button onClick={() => router.push("/arena")} className="text-primary hover:underline">Return to Arena</button>
      </div>
    );
  }

  const { userInput, finalLeaderboard, results, createdAt } = data;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <button onClick={() => router.push("/arena")} className="flex items-center text-gray-400 hover:text-white transition-colors mb-4">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Arena
            </button>
            <h1 className="text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Match Analysis</h1>
            <p className="text-gray-500 mt-2 flex items-center gap-4">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {new Date(createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          <button 
            onClick={() => router.push("/arena")}
            className="flex items-center bg-surface hover:bg-surface-hover border border-border px-6 py-3 rounded-xl transition-all font-semibold glow-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Run New Battle
          </button>
        </div>

        {/* Input Card */}
        <div className="bg-surface/50 border border-border rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-2" /> Original Prompt
          </h3>
          <p className="text-lg text-white font-medium">{userInput}</p>
        </div>

        {/* Final Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-500" /> Final Standings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {finalLeaderboard.map((lb: LeaderboardEntry, index: number) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={lb.agentId} 
                className={`p-6 rounded-2xl border ${index === 0 ? 'bg-primary/20 border-primary shadow-lg glow-primary' : 'bg-surface border-border/50'} relative overflow-hidden`}
              >
                {index === 0 && <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">WINNER</div>}
                
                <div className="flex items-baseline space-x-4 mb-4">
                  <div className="text-4xl font-black text-white/20">#{index + 1}</div>
                  <h3 className="text-xl font-bold text-white">{lb.agentName}</h3>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-gray-400 text-sm">Total Score</div>
                  <div className={`text-3xl font-black ${index === 0 ? 'text-primary' : 'text-white'}`}>
                    {Math.round(lb.totalScore)} <span className="text-sm font-medium text-gray-500">pts</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Breakdown by round */}
        <div className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-2xl font-bold text-white">Round Breakdown</h2>
          
          <div className="space-y-8">
            {results.map((round: any, i: number) => (
              <div key={i} className="bg-surface/30 border border-border/30 rounded-2xl p-6">
                <div className="mb-6 flex justify-between items-center border-b border-border/50 pb-4">
                  <div>
                    <div className="text-sm text-primary font-bold tracking-wider uppercase mb-1">Round {round.roundNumber}</div>
                    <h3 className="text-lg font-bold text-white">{round.slot.task}</h3>
                  </div>
                  <div className="bg-black/40 px-3 py-1 rounded text-xs text-gray-400 flex flex-col items-end">
                    <span>Criteria</span>
                    <span className="font-medium text-gray-300">{round.slot.evaluationCriteria}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {round.agentOutputs.map((output: any) => (
                    <div key={output.agentId._id || output.agentId} className="flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white">{output.agentId.name || output.agentName}</span>
                        <span className="px-2 py-1 bg-surface border border-border rounded text-xs font-bold text-accent">
                          {output.scoreDetails.total}/100
                        </span>
                      </div>
                      <div className="bg-black/50 p-4 rounded-xl border border-white/5 flex-1 relative group">
                        <p className="text-sm text-gray-300 line-clamp-6 group-hover:line-clamp-none transition-all duration-300">
                          {output.output}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
