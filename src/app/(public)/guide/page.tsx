'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Crown,
  Gavel,
  Rocket,
  ClipboardList,
  Gamepad2,
  Sparkles,
  Users,
  Store,
  Dices,
  Flame,
  Trophy,
  Medal,
  UserCircle,
  Shield,
  LifeBuoy,
  Swords
} from 'lucide-react';

export default function GuidePage() {
  const sections = [
    { icon: <UserCircle className="h-6 w-6 mx-auto text-primary" />, title: 'Perfil', description: 'Tu página personal. Aquí puedes editar tu información, ver tus estadísticas de juego, tus honores recibidos y el equipo al que perteneces.' },
    { icon: <Swords className="h-6 w-6 mx-auto text-primary" />, title: 'Mi Equipo', description: 'Si eres fundador o miembro de un equipo, esta es tu base de operaciones. Gestiona miembros, edita el perfil del equipo, revisa solicitudes y planea vuestros próximos movimientos.' },
    { icon: <Store className="h-6 w-6 mx-auto text-primary" />, title: 'Mercado', description: 'El corazón de Rankeon. Busca equipos que necesiten jugadores o encuentra a los jugadores perfectos para tu plantilla usando filtros por país, rango y rol.' },
    { icon: <Dices className="h-6 w-6 mx-auto text-primary" />, title: 'Salas de Juego', description: '¿Quieres jugar ahora mismo? Crea una sala de juego temporal para una partida rápida o únete a una existente. Es ideal para jugar con gente nueva sin compromisos.' },
    { icon: <Flame className="h-6 w-6 mx-auto text-primary" />, title: 'Scrims', description: 'La zona de entrenamiento. Aquí puedes publicar una oferta de partida de práctica (`scrim`) para que otros equipos te reten, o aceptar los desafíos de otros.' },
    { icon: <Trophy className="h-6 w-6 mx-auto text-primary" />, title: 'Torneos', description: 'El escenario principal. Apúntate a los torneos organizados por la comunidad o la plataforma, sigue el bracket en tiempo real y compite por la gloria.' },
    { icon: <Medal className="h-6 w-6 mx-auto text-primary" />, title: 'Clasificaciones', description: '¿Quieres saber quién manda? En esta sección puedes ver los rankings de los mejores equipos y jugadores en torneos, scrims y honores.' },
    { icon: <Users className="h-6 w-6 mx-auto text-primary" />, title: 'Amigos', description: 'Tu lista de contactos. Desde aquí puedes gestionar tus amigos, aceptar solicitudes y acceder a los chats privados para hablar con ellos.' },
    { icon: <Shield className="h-6 w-6 mx-auto text-primary" />, title: 'Panel Admin', description: '(Solo visible para Administradores) El panel de control total de la plataforma. Permite gestionar usuarios, equipos, ajustes globales y más.' },
    { icon: <Gavel className="h-6 w-6 mx-auto text-primary" />, title: 'Panel Mod', description: '(Visible para Moderadores y Admins) Herramientas para mantener el orden. Gestionar usuarios, aprobar torneos y resolver tickets de soporte.' },
    { icon: <LifeBuoy className="h-6 w-6 mx-auto text-primary" />, title: 'Soporte', description: '¿Necesitas ayuda? Desde el menú de tu perfil puedes acceder al Centro de Ayuda para contactar con soporte o hablar con nuestro asistente de IA.' },
  ];

  const roles = [
    {
      icon: <Crown className="h-8 w-8 text-yellow-400" />,
      title: 'Administrador (Admin)',
      description: 'El rol con el máximo poder. Los administradores tienen control total sobre la plataforma.',
      permissions: [
        'Todo lo que puede hacer un Moderador.',
        'Asignar y cambiar roles a cualquier usuario (incluyendo otros Admins).',
        'Acceder a los ajustes globales de la plataforma.',
        'Eliminar equipos y contenido sensible.',
        'Ver paneles de analíticas.',
      ],
    },
    {
      icon: <Gavel className="h-8 w-8 text-blue-500" />,
      title: 'Moderador (Mod)',
      description: 'Los guardianes de la comunidad. Se aseguran de que todo funcione correctamente y de que se respeten las normas.',
      permissions: [
        'Gestionar usuarios: banear (temporal o permanentemente) y desbanear.',
        'Revisar y aprobar/rechazar las propuestas de torneos enviadas por la comunidad.',
        'Gestionar y responder a los tickets de soporte de los usuarios.',
        'Certificar a streamers para que puedan proponer torneos.',
      ],
    },
    {
      icon: <Rocket className="h-8 w-8 text-red-500" />,
      title: 'Fundador (Founder)',
      description: 'El líder de un equipo. Este rol se asigna automáticamente al jugador que crea un equipo.',
      permissions: [
        'Crear y eliminar su propio equipo.',
        'Editar el perfil completo del equipo (logo, banner, descripción, redes sociales).',
        'Gestionar a los miembros del equipo: invitar, expulsar, ascender a Coach y asignar IGL.',
        'Revisar y aceptar/rechazar las solicitudes de jugadores para unirse al equipo.',
        'Publicar y aceptar `scrims`.',
        'Inscribir al equipo en torneos.',
      ],
    },
    {
      icon: <ClipboardList className="h-8 w-8 text-green-500" />,
      title: 'Entrenador (Coach)',
      description: 'La mano derecha del Fundador. Un rol de gestión dentro de un equipo.',
      permissions: [
        'Ayudar en la gestión de miembros (excepto al Fundador).',
        'Publicar y aceptar `scrims`.',
        'Asignar el rol de IGL (In-Game Leader).',
        'No puede editar el perfil principal del equipo ni eliminarlo.',
      ],
    },
    {
      icon: <Gamepad2 className="h-8 w-8 text-indigo-500" />,
      title: 'Jugador (Player)',
      description: 'El rol base para todos los usuarios. ¡El corazón de Rankeon!',
      permissions: [
        'Crear y personalizar su perfil de jugador.',
        'Buscar equipos y jugadores en el mercado.',
        'Enviar solicitudes para unirse a equipos que estén reclutando.',
        'Aceptar o rechazar invitaciones de equipos.',
        'Añadir amigos y chatear con ellos.',
        'Otorgar honores a otros jugadores.',
        'Participar en `scrims` y torneos como miembro de un equipo.',
        'Crear un equipo (lo que le convertiría en Fundador).',
      ],
    },
     {
      icon: <Sparkles className="h-8 w-8 text-pink-500" />,
      title: 'Streamer Certificado',
      description: 'Un permiso especial que se puede añadir a cualquier rol.',
      permissions: [
        'Proponer la creación de nuevos torneos para que sean revisados por los Moderadores.',
      ],
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="text-center">
             <h1 className="text-4xl font-bold font-headline mb-4">Guía de la Plataforma Rankeon</h1>
            <p className="text-lg text-muted-foreground mb-12">Todo lo que necesitas saber para moverte como un profesional por la aplicación.</p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold font-headline mb-6 text-center">🗺️ Navegación Principal</h2>
             <Card>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-20">Icono</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>¿Para qué sirve?</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sections.map((section, index) => (
                    <TableRow key={index}>
                        <TableCell className="text-center">{section.icon}</TableCell>
                        <TableCell className="font-semibold">{section.title}</TableCell>
                        <TableCell>{section.description}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </Card>
        </section>

        <section>
            <h2 className="text-3xl font-bold font-headline mb-8 text-center">🎭 Roles de Usuario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role, index) => (
                <Card key={index} className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            {role.icon}
                            <CardTitle className="font-headline text-xl">{role.title}</CardTitle>
                        </div>
                        <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <h4 className="font-semibold mb-2">Permisos:</h4>
                        <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                            {role.permissions.map((perm, pIndex) => (
                                <li key={pIndex}>{perm}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                ))}
            </div>
        </section>
    </div>
  );
}
