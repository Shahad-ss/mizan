import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Landmark, Loader2 } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await (isSignup ? signup(email, password) : login(email, password));
      setLocation("/dashboard");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-3xl shadow-xl">
        <CardContent className="p-8 md:p-10">
          <div className="flex justify-center items-center gap-2 text-primary mb-7">
            <Landmark className="h-7 w-7" />
            <span className="font-serif text-xl font-bold">Mizan</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-center">
            {isSignup ? "Create your Mizan account" : "Sign in to Mizan"}
          </h1>
          <p className="text-muted-foreground text-center mt-2 mb-8">
            {isSignup
              ? "Start organizing your finances. No verification code required."
              : "Welcome back. Enter your details to continue."}
          </p>
          <form onSubmit={submit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email address</span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <Input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-12 rounded-xl"
              />
              {isSignup && (
                <span className="text-xs text-muted-foreground">
                  Use at least 6 characters.
                </span>
              )}
            </label>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-7">
            {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <Link
              href={isSignup ? "/sign-in" : "/sign-up"}
              className="text-primary font-medium hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}