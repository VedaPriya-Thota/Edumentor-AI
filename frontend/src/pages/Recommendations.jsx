import { useEffect, useState } from "react";
import { api } from "../services/api";
import PracticeQuiz from "../components/PracticeQuiz";

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await api.getRecommendations();
    setData(res);
  };

  const startPractice = () => {
    if (!data.practice_questions) return;

    try {
      const parsed = JSON.parse(data.practice_questions);
      setQuiz(parsed);
      setShowQuiz(true);
    } catch (e) {
      console.error("Quiz parse error", e);
    }
  };

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-6">

      {/* 🤖 MAIN PANEL */}
      <div className="glass-panel p-6 rounded-xl">

        <h2 className="text-xl mb-4">🤖 AI Learning Assistant</h2>

        {/* NO WEAK TOPICS */}
        {data.message && (
          <p className="text-green-400">{data.message}</p>
        )}

        {!data.message && (
          <>
            {/* 🔴 WEAK TOPICS */}
            <div className="mb-5">
              <h3 className="mb-2">Weak Topics</h3>
              <div className="flex gap-2 flex-wrap">
                {data.weak_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded bg-purple-500/30"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* 🧠 AI ANALYSIS */}
            <div className="glass-panel p-4 mb-4">
              <h3 className="mb-2">AI Feedback</h3>
              <p>{data.ai_recommendation}</p>
            </div>

            {/* 📚 STUDY PLAN */}
            <div className="glass-panel p-4 mb-4">
              <h3 className="mb-2">Study Plan</h3>
              <p>{data.ai_recommendation}</p>
            </div>

            {/* 🎯 PRACTICE */}
            <div className="text-center mt-4">
              <button
                className="btn btn-primary"
                onClick={startPractice}
              >
                Start Practice Quiz
              </button>
            </div>
          </>
        )}
      </div>

      {/* 🧠 PRACTICE QUIZ UI */}
      {showQuiz && quiz && (
        <PracticeQuiz quiz={quiz} />
      )}
    </div>
  );
}