import { Button } from '@/components/ui/button';
import { Rocket, Users } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">SquadUp</h1>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center">
            <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              Now in MVP!
            </div>
            <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-6">
              Find your squad. <br />
              Conquer the game.
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground mb-10">
              SquadUp is the ultimate platform for gamers to connect, form teams, and dominate the competitive scene. Whether you're a player looking for a team or a team scouting for talent, we've got you covered.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">
                <Rocket className="mr-2 h-5 w-5" />
                Launch the App
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} SquadUp MVP. All rights reserved.
      </footer>
    </div>
  );
}
