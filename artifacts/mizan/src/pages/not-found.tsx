import { Link } from "wouter";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background">
      <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-medium text-foreground mb-6">Page not found</h2>
      <Link href="/">
        <Button size="lg" className="rounded-full">Return Home</Button>
      </Link>
    </div>
  );
}