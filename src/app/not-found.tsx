import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Frown } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <Frown className="w-24 h-24 text-muted-foreground mb-4" />
      <h2 className="text-3xl font-bold font-headline mb-2">404 - Página no encontrada</h2>
      <p className="text-muted-foreground mb-6">
        Lo sentimos, no pudimos encontrar la página que estás buscando.
      </p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}
