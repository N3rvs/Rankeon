'use client';

import Image from "next/image";
import { Card } from "../ui/card";

interface GameCardProps {
    imageUrl: string;
    imageHint: string;
    title: string;
    description: string;
}

export function GameCard({ imageUrl, imageHint, title, description }: GameCardProps) {
    return (
        <div className="group h-96 w-72 [perspective:1000px]">
            <div className="relative h-full w-full rounded-xl shadow-xl transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front Face */}
                <div className="absolute inset-0 [backface-visibility:hidden]">
                    <Card className="h-full w-full">
                        <Image 
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover rounded-xl"
                            data-ai-hint={imageHint}
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-xl" />
                         <h3 className="absolute bottom-4 left-4 text-2xl font-bold font-headline text-white [text-shadow:1px_1px_4px_rgba(0,0,0,0.7)]">{title}</h3>
                    </Card>
                </div>
                {/* Back Face */}
                <div className="absolute inset-0 h-full w-full rounded-xl bg-card text-card-foreground [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <Card className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
                        <h4 className="font-headline text-2xl font-bold mb-4">{title}</h4>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
