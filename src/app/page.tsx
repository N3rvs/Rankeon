'use client';

import { Button } from '@/components/ui/button';
import { Gamepad2, Rocket, Users, Swords, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Skeleton className="h-24 w-24 rounded-full bg-muted" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">SquadUp</h1>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[calc(100vh-4rem)] flex items-center justify-center text-center">
            <div className="absolute inset-0">
                <Image 
                    src="https://placehold.co/1200x800.png"
                    alt="Gaming background"
                    fill
                    className="object-cover opacity-30"
                    data-ai-hint="valorant gaming"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            </div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                 <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
                    Assemble Your Elite Squad
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
                    The ultimate LFG platform for Valorant. Stop solo queuing and start dominating with the perfect team.
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg" asChild>
                        <Link href="/register">
                            <Rocket className="mr-2 h-5 w-5" />
                            Find Your Team
                        </Link>
                    </Button>
                     <Button size="lg" variant="secondary" asChild>
                        <Link href="/register">
                            <span>Register as a Player</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Built for Champions</h2>
                <p className="text-lg text-muted-foreground mt-2">Everything you need to conquer the competition.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
               <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Users className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">Find Players</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Browse detailed player profiles, filter by role and rank, and find the perfect fit for your team.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Swords className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">Create Teams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Build your roster, manage your members, and create a team profile that attracts top talent.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                         <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">AI-Powered Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Use our AI to generate catchy team names or craft the perfect player bio to get you noticed.</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm border-t border-border/50">
        © {currentYear} SquadUp. All rights reserved. Built for the future of esports.
      </footer>
    </div>
  );
}
