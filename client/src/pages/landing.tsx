import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Brain, Database, Lock, Settings, Target, Layers, BarChart3 } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Brand Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              Enterprise Brand Intelligence Platform
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Configure your brand context, competitive landscape, and strategic guardrails 
              with AI-powered suggestions. Full auditability and human control over model recommendations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-16">
          <div className="container px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold">8 Context Sections</h2>
            <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <Target className="mb-2 h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Brand Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Define your brand identity, industry, and geography</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <Layers className="mb-2 h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Category Definition</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Set primary categories and exclusions</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <BarChart3 className="mb-2 h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Competitive Set</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Track direct, indirect, and marketplace competitors</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <Settings className="mb-2 h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Demand Definition</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Configure brand and non-brand keyword strategies</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="container px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold">Enterprise-Grade Security</h2>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Secure Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in with Google, GitHub, Apple, or email via Replit Auth
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-3">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Persistent Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Your configurations are stored securely in PostgreSQL
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-3">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Full Auditability</h3>
                <p className="text-sm text-muted-foreground">
                  Track all changes with human overrides and CMO-safe governance
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-16">
          <div className="container px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Brain className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2 className="mb-4 text-2xl font-semibold">AI-Powered Suggestions</h2>
              <p className="mb-6 text-muted-foreground">
                Get intelligent recommendations for each context section. 
                AI suggestions are clearly marked with full human control over acceptance.
              </p>
              <Button size="lg" asChild data-testid="button-start-configuring">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">
            Brand Intelligence Context Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
