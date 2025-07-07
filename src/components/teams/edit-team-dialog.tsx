
// src/components/teams/edit-team-dialog.tsx
'use client';

import { useState, useTransition, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Team } from '@/lib/types';
import { updateTeam, UpdateTeamSchema, type UpdateTeamData } from '@/lib/actions/teams';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Image from 'next/image';
import { Twitch, Twitter, Shield } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EditTeamDialogProps {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4464.8257-.698 1.333-2.2582.022-4.4848.022-6.7431 0-.2516-.5072-.487-1.002-.6979-1.3329a.0741.0741 0 00-.0785-.0371A19.8665 19.8665 0 003.6831 4.3698a.0741.0741 0 00-.0371.0785v.0001c.0142.1252.0221.2503.0371.3753a18.4233 18.4233 0 00-1.6256 5.8645.0741.0741 0 00.0371.0857c.3753.211.7505.3999 1.1036.5664a.0741.0741 0 00.0927-.0221c.2946-.3382.5664-.698.816-1.0805a16.4951 16.4951 0 00-2.2582-1.1258.0741.0741 0 00-.0998.0221c-.4928.698-.9272 1.4507-1.2828 2.2582a.0741.0741 0 00.0221.0998c.4699.2705.9619.493 1.4507.698a.0741.0741 0 00.0927-.0142c.7121-.5664 1.346-1.2185 1.9096-1.9334a.0741.0741 0 00.0142-.0927A17.5342 17.5342 0 006.965 9.7576a.0741.0741 0 00-.0714-.0927h-.0001a14.512 14.512 0 00-1.8025.2946.0741.0741 0 00-.0514.0785c-.0221.2868-.0371.5807-.0371.8675a10.2973 10.2973 0 00.2705 2.1501.0741.0741 0 00.0652.0585c.667.142.9341.142.9341.142l.0001-.0001a.0741.0741 0 00.0857-.0585c.0714-.2445.1359-.4961.1933-.7505a.0741.0741 0 00-.044-.0927c-.2946-.1281-.5807-.2634-.8528-.407a.0741.0741 0 00-.0927.0071c-.0714.0785-.142.157-.211.2435a.0741.0741 0 00-.0071.0927c.487.3824.9861.7347 1.4952 1.0569a.0741.0741 0 00.0927-.0071c.4216-.324.802-.6701 1.1462-1.0387a.0741.0741 0 00-.0071-.0998c-.1281-.1359-.2584-.2705-.3824-.4141a.0741.0741 0 00-.0857-.0221c-1.4286.6393-2.7368 1.0136-3.8962 1.1537a.0741.0741 0 00-.0652.0714c.0071.0371.0071.0714.0142.1132a18.0019 18.0019 0 003.0425 4.54a.0741.0741 0 00.0927.0371c.7121-.3168 1.3939-.6772 2.044-1.0637a.0741.0741 0 00.044-.0927c-.157-.211-.3075-.4216-.4464-.6464a.0741.0741 0 00-.0785-.044c-.211.0857-.4216.1642-.6321.2435a.0741.0741 0 00-.0652.0714c.1789.7944.3999 1.567.6608 2.3089a.0741.0741 0 00.0714.0652c3.4282-.142 6.5519-1.2757 8.9242-3.23a.0741.0741 0 00.044-.0785c-.1789-.882-.4628-1.742-8.887-2.4018a.0741.0741 0 00.0714.0652c.2634.0927.5268.1789.7825.2634a.0741.0741 0 00.0785-.0585c.1933-.5392.3611-1.0876.5072-1.6431a.0741.0741 0 00-.044-.0857c-1.8883-.8528-3.69-1.2828-5.3888-.9929a.0741.0741 0 00-.0514.044c-.211.7121-.4357 1.4144-.6701 2.1024a.0741.0741 0 00.0585.0857c.211.044.4216.0785.6321.1132l.0001.0001.0001.0001c.211.022.4216.044.6321.0585a.0741.0741 0 00.0714-.0652c.2435-1.002.5072-2.011.7825-3.02a.0741.0741 0 00-.0652-.0857c-.2634-.0371-.5197-.0785-.7754-.1209h-.0071c-.2634-.044-.5268-.0857-.7967-.1281a.0741.0741 0 00-.0785.0514c-.324.9479-.6171 1.8883-.8758 2.8216a.0741.0741 0 00.0785.0785c.2946-.0714.5807-.157.8599-.2435a.0741.0741 0 00.0714-.0857c.186-1.1036.4357-2.193.7347-3.2658a.0741.0741 0 00-.0714-.0857c-.0142 0-.0221 0-.0371.0071a14.7821 14.7821 0 00-4.5841.8019.0741.0741 0 00-.0585.0714c-.0371.3088-.0857.6171-.1281.9272a.0741.0741 0 00.0585.0785c1.4507.2868 2.8942.493 4.3006.5949a.0741.0741 0 00.0785-.0585c.3451-.9034.6393-1.8025.8758-2.6994a.0741.0741 0 00-.0714-.0857c-.2039-.0142-.407-.0371-.6099-.0585a15.8202 15.8202 0 01-6.721 0c-.2039.022-.407.044-.6099.0585a.0741.0741 0 00-.0714.0857c.2365.896.5307 1.7959.8758 2.6994a.0741.0741 0 00.0785.0585c1.4063-.1019 2.8499-.3081 4.3006-.5949a.0741.0741 0 00.0585-.0785c-.044-.3101-.0857-.6184-.1281-.9272a.0741.0741 0 00-.0585-.0714 14.79 14.79 0 00-4.5841-.8019.0741.0741 0 00-.0785.0927c.3009 1.0728.5505 2.1622.7347 3.2658a.0741.0741 0 00.0714.0857c.2705-.0857.5664-.1718.8599-.2435a.0741.0741 0 00.0714-.0785c.2634-1.1258.5268-2.2445.7825-3.3632a.0741.0741 0 00-.0652-.0857c-.2556-.044-.512-.0857-.7754-.1281-2.0864-.324-4.084-.9861-5.7442-1.9263a.0741.0741 0 00-.0927.0221c-.3522.477-.6902.969-.9998 1.4809a.0741.0741 0 00.0142.0998c.4557.2868.9114.5522 1.3671.7967a.0741.0741 0 00.0927-.0142c.324-.4357.6242-.8892.9034-1.3592a.0741.0741 0 00-.0221-.0998c-.2868-.186-.5807-.3611-.882-.5392a.0741.0741 0 00-.0927.0221A18.4413 18.4413 0 002.0886 10.232a.0741.0741 0 00.0371.0857c.3522.1673.7045.3168 1.0567.4464a.0741.0741 0 00.0927-.044c.2634-.4216.512-.8528.7474-1.297a.0741.0741 0 00-.044-.0927c-.4557-.211-.896-.4464-1.3219-.698a.0741.0741 0 00-.0857.0142 19.0575 19.0575 0 00-1.8025 5.0487.0741.0741 0 00.0585.0857c2.4593.816 4.8851.9929 7.2458.2946a.0741.0741 0 00.0652-.0585c.1789-.4141.3382-.8282.477-1.2565a.0741.0741 0 00-.0652-.0857c-.493-.1281-.9861-.2634-1.4738-.4141a.0741.0741 0 00-.0857.044c-.0714.157-.1359.3168-.2039.477a.0741.0741 0 00.0071.0857c.5664.4557 1.1537.8758 1.7631 1.2423a.0741.0741 0 00.0998-.0142c.407-.3088.7967-.6393 1.1683-.9861a.0741.0741 0 00.0142-.0927c-.2218-.324-.4557-.6464-.698-.969a.0741.0741 0 00-.0857-.044c-.7505.2868-1.5152.532-2.28.7474a.0741.0741 0 00-.0585.0714c-.0585.2218-.1132.4464-.1718.667a.0741.0741 0 00.0585.0785 17.5613 17.5613 0 005.1668-.3168.0741.0741 0 00.0652-.0714c.1209-.3753.2365-.7505.3382-1.1258a.0741.0741 0 00-.0585-.0857c-.5735-.157-1.1537-.3075-1.722-.477a.0741.0741 0 00-.0857.044c-.1642.3611-.3382.722-.5197 1.0876a.0741.0741 0 00.0371.0927c.4357.2516.8758.493 1.3219.7051a.0741.0741 0 00.0927-.0221c1.4507-1.1908 2.3724-2.651 2.5714-4.2155a.0741.0741 0 00-.0371-.0785A19.921 19.921 0 0012.0002 2.8698z"/></svg>
);

const valorantRanks = [
    { value: 'Hierro', label: 'Hierro' },
    { value: 'Bronce', label: 'Bronce' },
    { value: 'Plata', label: 'Plata' },
    { value: 'Oro', label: 'Oro' },
    { value: 'Platino', label: 'Platino' },
    { value: 'Ascendente', label: 'Ascendente' },
    { value: 'Inmortal', label: 'Inmortal' },
];

const valorantRoles = ["Controlador", "Iniciador", "Duelista", "Centinela"] as const;

export function EditTeamDialog({ team, open, onOpenChange }: EditTeamDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(team.avatarUrl);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(team.bannerUrl);

  const form = useForm<UpdateTeamData>({
    resolver: zodResolver(UpdateTeamSchema),
    defaultValues: {
      teamId: team.id,
      name: team.name || '',
      description: team.description || '',
      rankMin: team.rankMin || '',
      rankMax: team.rankMax || '',
      lookingForPlayers: team.lookingForPlayers || false,
      recruitingRoles: team.recruitingRoles || [],
      videoUrl: team.videoUrl || '',
      discordUrl: team.discordUrl || '',
      twitchUrl: team.twitchUrl || '',
      twitterUrl: team.twitterUrl || '',
    },
  });

  const lookingForPlayers = form.watch("lookingForPlayers");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(previewUrl);
      } else {
        setBannerFile(file);
        setBannerPreview(previewUrl);
      }
    }
  };

  async function onSubmit(values: UpdateTeamData) {
    startTransition(async () => {
      try {
        let finalAvatarUrl = team.avatarUrl;
        if (avatarFile) {
          const storageRef = ref(storage, `teams/${team.id}/avatar/${Date.now()}_${avatarFile.name}`);
          const uploadResult = await uploadBytes(storageRef, avatarFile);
          finalAvatarUrl = await getDownloadURL(uploadResult.ref);
        }
        
        let finalBannerUrl = team.bannerUrl;
        if (bannerFile) {
          const storageRef = ref(storage, `teams/${team.id}/banner/${Date.now()}_${bannerFile.name}`);
          const uploadResult = await uploadBytes(storageRef, bannerFile);
          finalBannerUrl = await getDownloadURL(uploadResult.ref);
        }

        const result = await updateTeam({ 
          ...values,
          avatarUrl: finalAvatarUrl,
          bannerUrl: finalBannerUrl,
        });
        
        if (result.success) {
            toast({
                title: 'Equipo Actualizado',
                description: "Los datos de tu equipo se han actualizado.",
            });
            onOpenChange(false);
        } else {
            toast({
                title: 'Error',
                description: result.message,
                variant: 'destructive',
            });
        }
      } catch (error: any) {
        console.error("Error updating team:", error);
        toast({
          title: 'Upload Error',
          description: `Failed to update team: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar tu Equipo</DialogTitle>
          <DialogDescription>
            Realiza cambios en los detalles de tu equipo. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormItem>
              <FormLabel>Banner</FormLabel>
              <div className="relative w-full aspect-[3/1] bg-muted rounded-md overflow-hidden">
                {bannerPreview && <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" data-ai-hint="team banner" />}
              </div>
              <FormControl>
                <Input id="banner-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="mt-2" />
              </FormControl>
               <FormMessage />
            </FormItem>

            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview || undefined} alt="Avatar Preview" data-ai-hint="team logo"/>
                    <AvatarFallback>{team.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <FormLabel htmlFor="avatar-upload">Logo</FormLabel>
                    <Input id="avatar-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Equipo</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dragones Cósmicos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="rankMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rango Mínimo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <Shield className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Rango Mín." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {valorantRanks.map(rank => (
                            <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="rankMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rango Máximo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <Shield className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Rango Máx." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {valorantRanks.map(rank => (
                            <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe los objetivos y la cultura de tu equipo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">Vídeo de Presentación</h3>
                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del Vídeo</FormLabel>
                      <FormControl><Input placeholder="https://youtube.com/watch?v=... o archivo .mp4" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">Redes Sociales</h3>
                 <FormField
                  control={form.control}
                  name="discordUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><DiscordIcon className="h-5 w-5" /> Discord</FormLabel>
                      <FormControl><Input placeholder="https://discord.gg/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="twitchUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Twitch className="h-5 w-5" /> Twitch</FormLabel>
                      <FormControl><Input placeholder="https://twitch.tv/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="twitterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Twitter className="h-5 w-5" /> Twitter / X</FormLabel>
                      <FormControl><Input placeholder="https://x.com/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="lookingForPlayers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>¿Buscando Jugadores?</FormLabel>
                    <FormDescription>
                      Activa esto para que tu equipo aparezca en el mercado.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {lookingForPlayers && team.game === "Valorant" && (
                <FormField
                    control={form.control}
                    name="recruitingRoles"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Roles Requeridos (Valorant)</FormLabel>
                        <FormDescription>
                        Selecciona los roles específicos que tu equipo necesita.
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                        {valorantRoles.map((role) => (
                            <FormField
                            key={role}
                            control={form.control}
                            name="recruitingRoles"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={role}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(role)}
                                        onCheckedChange={(checked) => {
                                        const updatedRoles = field.value ? [...field.value] : [];
                                        if (checked) {
                                            updatedRoles.push(role);
                                        } else {
                                            const index = updatedRoles.indexOf(role);
                                            if (index > -1) {
                                            updatedRoles.splice(index, 1);
                                            }
                                        }
                                        field.onChange(updatedRoles);
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    {role}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
