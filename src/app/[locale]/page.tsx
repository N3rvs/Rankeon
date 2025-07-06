'use client';

import { Button } from '@/components/ui/button';
import { Gamepad2, Rocket, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, Link } from '@/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

function HomePageContent() {
  const t = useTranslations('HomePage');
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">SquadUp</h1>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Empezar</Link>
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
                    {t('title')}
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
                    {t('subtitle')}
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg" asChild>
                        <Link href="/register">
                            <Rocket className="mr-2 h-5 w-5" />
                            Encuentra tu Escuadrón
                        </Link>
                    </Button>
                     <Button size="lg" variant="secondary" asChild>
                        <Link href="/register">
                            <span>Registrarse como Jugador</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Construido para Campeones</h2>
                <p className="text-lg text-muted-foreground mt-2">Todo lo que necesitas para conquistar la competencia.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
               <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Users className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">Encuentra Jugadores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Explora perfiles detallados de jugadores, filtra por rol y rango, y encuentra el ajuste perfecto para tu plantilla.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                         <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">Herramientas con IA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Usa nuestra IA para crear la biografía de jugador perfecta para que otros jugadores te noten.</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm border-t border-border/50">
        © {currentYear || new Date().getFullYear()} SquadUp. Todos los derechos reservados. Construido para el futuro de los esports.
      </footer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Skeleton className="h-24 w-24 rounded-full bg-muted" />
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <LoadingScreen />;
  }

  return <HomePageContent />;
}
