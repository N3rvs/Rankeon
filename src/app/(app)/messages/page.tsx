import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <MessageSquare className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold">Selecciona un chat</h2>
        <p>Elige una conversación de la lista para empezar a chatear.</p>
    </div>
  );
}
