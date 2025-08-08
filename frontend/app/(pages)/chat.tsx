import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "../../components/chat-interface";
import { Button } from "../(tabs)/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";


export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "안녕하세요! 회사 관련 궁금한 점이 있으시면 언제든 물어보세요. 📚",
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const queryClient = useQueryClient();

  const { mutate: sendQuestion, isPending } = useMutation({
    mutationFn: async (question: string) => {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error("질문 처리 중 오류가 발생했습니다.");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.answer || "죄송합니다. 응답을 생성할 수 없습니다.",
          isUser: false,
          timestamp: new Date(),
          source: data.source,
        },
      ]);

      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
    },
    onError: (error) => {
      console.error("Error sending question:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSendMessage = (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    sendQuestion(message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mr-3">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Genmind AI</h1>
            <p className="text-sm text-slate-500">온라인</p>
          </div>
        </div>
      </div>

      

      {/* Chat Interface */}
      <div className="flex-1 max-w-2xl mx-auto w-full overflow-y-auto">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isPending}
        />
      </div>
    </div>
  );
}
