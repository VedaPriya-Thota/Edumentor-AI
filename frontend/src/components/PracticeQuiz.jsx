import { useState } from "react";

export default function PracticeQuiz({ quiz }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);

  const q = quiz.questions[current];

  const selectAnswer = (ans) => {
    const newAns = [...answers];
    newAns[current] = ans;
    setAnswers(newAns);
    setShowAnswer(true);
  };

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h3 className="mb-4">
        Q{current + 1}: {q.question}
      </h3>

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

      {showAnswer && (
        <div className="mt-4 glass-panel p-3">
          <p><b>Explanation:</b> {q.explanation}</p>
        </div>
      )}

      <div className="mt-4">
        {current < quiz.questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => {
              setCurrent(current + 1);
              setShowAnswer(false);
            }}
          >
            Next
          </button>
        ) : (
          <p className="mt-2 text-blue-400">
            Practice Completed 🎯
          </p>
        )}
      </div>
    </div>
  );
}