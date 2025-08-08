import { useState, useRef, useEffect } from "react";
import { Button } from "@/app/(tabs)/button";
import { Input } from "@/app/(tabs)/input";
import { Card, CardContent } from "@/app/(tabs)/card";
import { Send, FileText } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  source?: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage("");
  };

  const suggestedQuestions = [
    "연차 신청은 어떻게 하나요?",
    "급여 명세서는 어디서 확인하나요?",
    "재택근무 신청 절차는?",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-2 ${
              message.isUser ? "justify-end" : ""
            }`}
          >
            {!message.isUser && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </div>
            )}
            
            <div
              className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                message.isUser
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-white text-slate-800 rounded-tl-none shadow-sm"
              }`}
            >
              <p className="text-sm">{message.text}</p>
              {message.source && (
                <div className="mt-2 text-xs text-slate-500 flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  {message.source} 참조
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-slate-600 mb-2">💡 이런 질문을 해보세요</p>
              <div className="space-y-1">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => onSendMessage(question)}
                    className="block w-full text-left text-xs text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/5 transition-colors"
                    data-testid={`suggested-question-${index}`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="질문을 입력하세요..."
            className="flex-1 rounded-full"
            disabled={isLoading}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90"
            disabled={!inputMessage.trim() || isLoading}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
