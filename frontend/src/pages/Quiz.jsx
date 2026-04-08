import { useState } from "react";
import { api } from "../services/api";

export default function Quiz() {
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🎯 Difficulty color mapping (color-blind friendly)
  const difficultyColor = {
    easy: "bg-blue-500",
    medium: "bg-yellow-400",
    hard: "bg-purple-500",
  };

  const generateQuiz = async () => {
    if (!topic) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.generateQuiz(topic, difficulty, 5);
      console.log("Quiz API response:", res);

      const generatedQuiz = res.quiz;
      if (generatedQuiz && generatedQuiz.questions && generatedQuiz.questions.length > 0) {
        setQuiz(generatedQuiz);
        setAnswers([]);
        setCurrent(0);
      } else {
        setError("No questions generated");
      }
    } catch (e) {
      setError(e.message || "Failed to generate quiz");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (ans) => {
    const newAns = [...answers];
    newAns[current] = ans;
    setAnswers(newAns);
    setShowAnswer(true);
  };

  const nextQuestion = () => {
    setShowAnswer(false);
    setCurrent(current + 1);
  };

  const submitQuiz = async () => {
    const correctAnswers = quiz.questions.map(q => q.correct_answer);

    try {
      const res = await api.submitQuiz({
        topic,
        answers,
        correct_answers: correctAnswers,
      });

      console.log("Submit response:", res);
      
      if (res.score) {
        alert(`Score: ${res.score} (${res.percentage}%)`);
        setQuiz(null);
      } else {
        alert("Quiz submitted, but result processing failed.");
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
      alert("Failed to submit quiz. Please check your connection or try again.");
    }
  };

  // ---------------- UI ----------------

  if (!quiz) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <h2 className="text-xl mb-4">Adaptive Quiz</h2>

        <input
          className="form-control mb-3"
          placeholder="Enter topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        {/* 🎯 Difficulty Bar */}
        <div className="mb-4">
          <p>Current Difficulty</p>
          <div className="w-full h-3 bg-gray-700 rounded">
            <div
              className={`h-3 rounded ${difficultyColor[difficulty]}`}
              style={{
                width:
                  difficulty === "easy"
                    ? "33%"
                    : difficulty === "medium"
                      ? "66%"
                      : "100%",
              }}
            ></div>
          </div>
          <p className="mt-1 capitalize">{difficulty}</p>
        </div>

        <button className="btn btn-primary" onClick={generateQuiz} disabled={loading || !topic}>
          {loading ? "Generating quiz..." : "Generate Quiz"}
        </button>

        {error && <p className="text-red-400 mt-4 text-sm font-medium">{error}</p>}
      </div>
    );
  }

  const q = quiz.questions[current];

  // 🎯 Safety check in case questions are somehow missing
  if (!q) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <h2 className="text-xl mb-4 text-red-400">Error rendering question</h2>
        <button className="btn btn-primary" onClick={() => setQuiz(null)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h3 className="mb-4">
        Q{current + 1}: {q.question}
      </h3>

      {/* OPTIONS */}
      <div className="grid gap-2">
        {q.options?.map((opt, i) => {
          const isCorrect = opt === q.correct_answer;
          const isSelected = answers[current] === opt;

          return (
            <button
              key={i}
              onClick={() => !showAnswer && selectAnswer(opt)}
              disabled={showAnswer}
              className={`btn-option${showAnswer ? isCorrect ? " correct" : isSelected ? " wrong" : "" : isSelected ? " selected" : ""}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* EXPLANATION */}
      {showAnswer && (
        <div className="mt-4 p-3 glass-panel">
          <p><b>Explanation:</b> {q.explanation}</p>
        </div>
      )}

      {/* NAVIGATION */}
      <div className="mt-4">
        {current < quiz.questions.length - 1 ? (
          <button className="btn btn-primary" onClick={nextQuestion}>
            Next
          </button>
        ) : (
          <button className="btn btn-primary" onClick={submitQuiz}>
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}