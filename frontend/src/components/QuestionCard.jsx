import React from "react";

export default function QuestionCard({ 
  question, 
  questionIndex, 
  currentAnswer, 
  showAnswer, 
  onAnswer 
}) {
  const { type, question: qText, options = [], explanation, correct_answer } = question;

  const handleSelect = (ans) => {
    if (!showAnswer) {
      onAnswer(ans);
    }
  };

  const renderOptions = () => {
    if (type === "mcq" || type === "true_false") {
      return (
        <div className="grid gap-2">
          {options.map((opt, i) => {
            const isCorrect = opt === correct_answer;
            const isSelected = currentAnswer === opt;
            
            let btnClass = "btn-option";
            if (showAnswer) {
              if (isCorrect) btnClass += " correct";
              else if (isSelected) btnClass += " wrong";
            } else {
              if (isSelected) btnClass += " selected";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(opt)}
                className={`${btnClass} text-left`}
                disabled={showAnswer}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (type === "fill_blank") {
      return (
        <div className="mt-4">
          <input
            type="text"
            className="form-control w-full bg-[#12121a] border border-white/10 p-3 rounded-lg focus:outline-none focus:border-indigo-500"
            placeholder="Type your answer here..."
            value={currentAnswer || ""}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={showAnswer}
          />
          {showAnswer && (
            <div className={`mt-3 p-3 rounded-lg ${
              currentAnswer?.trim().toLowerCase() === correct_answer?.trim().toLowerCase() 
                ? "bg-green-600/20 text-green-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              Correct Answer: <span className="font-bold">{correct_answer}</span>
            </div>
          )}
        </div>
      );
    }

    return <p className="text-red-400">Unknown question type!</p>;
  };

  return (
    <div className="glass-panel p-8 rounded-2xl border border-white/5 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-semibold mb-6 flex items-start gap-4 text-white">
          <span className="flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-lg w-8 h-8 shrink-0 text-sm font-bold">
            {questionIndex + 1}
          </span>
          <span className="leading-snug pt-1">{qText}</span>
        </h3>

        {renderOptions()}

        {showAnswer && (
          <div className="mt-6 p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/20">
            <p className="text-sm">
              <span className="font-bold text-indigo-400 block mb-1">💡 Explanation:</span>
              <span className="text-gray-300 leading-relaxed">{explanation}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}