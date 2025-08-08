import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/app/(tabs)/card";
import { Button } from "@/app/(tabs)/button";
import { Input } from "@/app/(tabs)/input";
import { Label } from "@radix-ui/react-label";
import { useAuth } from "@/app/hooks/use-auth";
import { useToast } from "@/app/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [domain, setDomain] = useState("");
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // 로그인 되어 있으면 대시보드로
    if (user) {
      navigate("/dashboard");
      return;
    }

    // 도메인 체크
    const storedDomain = localStorage.getItem("genmind_domain");
    if (!storedDomain) {
      navigate("/domain");
    } else {
      setDomain(storedDomain);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "오류",
        description: "이메일과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);

      if (!success) {
        toast({
          title: "로그인 실패",
          description: "이메일 또는 비밀번호가 올바르지 않습니다.",
          variant: "destructive",
        });
        return;
      }

      // 성공 시 이동
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        title: "오류",
        description: "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full ml-1"></div>
                <div className="w-1 h-1 bg-white rounded-full ml-1"></div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Genmind Chatbot</h1>
          <p className="text-sm text-slate-600">중소기업용 문서 자동응답 서비스</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">로그인</h2>
              {domain && (
                <div className="flex items-center justify-center mt-2 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                  {domain}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="h-12 bg-slate-100 border-0 focus:bg-white"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 bg-slate-100 border-0 focus:bg-white"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-slate-300 text-slate-700 font-medium rounded-lg"
                data-testid="button-register"
              >
                회원가입
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="text-xs text-slate-500">또는</div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => navigate("/domain")}
                  className="text-sm text-primary hover:underline"
                  data-testid="link-change-domain"
                >
                  다른 도메인으로 로그인
                </button>
                <br />
                <button className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  아이디가 궁금하신가요?
                </button>
                <br />
                <button className="text-sm text-primary hover:underline" data-testid="link-reset-password">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
