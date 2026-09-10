import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: any },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full min-h-screen flex-col items-center justify-center p-6 text-center bg-background">
          <div className="rounded-full bg-destructive/10 p-4 text-destructive mb-4">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-muted-foreground max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-8" size="lg">
            Reload page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
