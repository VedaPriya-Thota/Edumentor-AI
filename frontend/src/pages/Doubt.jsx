import { useState } from "react";
import { api } from "../services/api";

export default function Doubt() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  const handleAsk = async () => {
    const res = await api.askDoubt(question);

    setChat([
      ...chat,
      { type: "user", text: question },
      { type: "ai", text: res.answer },
    ]);

    setQuestion("");
  };

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h2 className="text-xl mb-4">AI Mentor</h2>

      <div className="h-64 overflow-y-auto mb-4">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 p-2 rounded ${
              msg.type === "user"
                ? "bg-blue-500/20 text-right"
                : "bg-purple-500/20"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="form-control flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your doubt..."
        />

        <button className="btn btn-primary" onClick={handleAsk}>
          Ask
        </button>
      </div>
    </div>
  );
}