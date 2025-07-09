'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';
import { Eraser, Pencil } from 'lucide-react';

const maps = [
  { name: "Ascent", url: "https://static.wikia.nocookie.net/valorant/images/7/7a/Ascent_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20200620202113" },
  { name: "Bind", url: "https://static.wikia.nocookie.net/valorant/images/2/23/Bind_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20200620202113" },
  { name: "Haven", url: "https://static.wikia.nocookie.net/valorant/images/7/70/Haven_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20200620202114" },
  { name: "Split", url: "https://static.wikia.nocookie.net/valorant/images/d/d6/Split_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20200620202115" },
  { name: "Icebox", url: "https://static.wikia.nocookie.net/valorant/images/1/13/Icebox_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20201015233845" },
  { name: "Breeze", url: "https://static.wikia.nocookie.net/valorant/images/1/10/Breeze_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20210427163013" },
  { name: "Fracture", url: "https://static.wikia.nocookie.net/valorant/images/f/f9/Fracture_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20210908143202" },
  { name: "Pearl", url: "https://static.wikia.nocookie.net/valorant/images/a/af/Pearl_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20220622153245" },
  { name: "Lotus", url: "https://static.wikia.nocookie.net/valorant/images/9/94/Lotus_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20230110214336" },
  { name: "Sunset", url: "https://static.wikia.nocookie.net/valorant/images/5/5a/Sunset_Minimap.png/revision/latest/scale-to-width-down/1000?cb=20230829153335" },
];

const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'White', value: '#ffffff' },
];

interface StrategyBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StrategyBoardDialog({ open, onOpenChange }: StrategyBoardDialogProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [selectedMap, setSelectedMap] = useState(maps[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState(colors[0].value);
  const [brushSize, setBrushSize] = useState(3);
  const [isErasing, setIsErasing] = useState(false);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const mapImage = new Image();
    mapImage.crossOrigin = "anonymous"; // Important for loading images from other domains
    mapImage.src = selectedMap.url;
    mapImage.onload = () => {
      canvas.width = mapImage.width;
      canvas.height = mapImage.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(mapImage, 0, 0);
    };
    mapImage.onerror = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText("Error al cargar el mapa.", canvas.width / 2, canvas.height / 2);
    }
  }, [selectedMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      contextRef.current = context;
    }
  }, []);

  useEffect(() => {
    drawMap();
  }, [selectedMap, drawMap]);
  
  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

    if (isErasing) {
      ctx.clearRect(offsetX - brushSize * 3, offsetY - brushSize * 3, brushSize * 6, brushSize * 6);
    } else {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    const ctx = contextRef.current;
    if (!ctx || isErasing) {
        setIsDrawing(false);
        return;
    };
    ctx.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

     if(isErasing) {
      ctx.clearRect(offsetX - brushSize * 3, offsetY - brushSize * 3, brushSize * 6, brushSize * 6);
    } else {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('TeamsPage.strategy_board')}</DialogTitle>
          <DialogDescription>{t('TeamsPage.strategy_board_desc')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
            <div className="md:col-span-1 flex flex-col gap-4">
                <Select onValueChange={(value) => setSelectedMap(maps.find(m => m.name === value) || maps[0])} defaultValue={selectedMap.name}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('TeamsPage.select_map')} />
                    </SelectTrigger>
                    <SelectContent>
                        {maps.map(map => <SelectItem key={map.name} value={map.name}>{map.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <div className="space-y-2">
                    <h4 className="text-sm font-medium">Color</h4>
                    <div className="flex flex-wrap gap-2">
                        {colors.map(color => (
                            <Button key={color.name} variant="outline" size="icon" className={cn("h-8 w-8", brushColor === color.value && !isErasing && "ring-2 ring-ring")} style={{ backgroundColor: color.value}} onClick={() => { setBrushColor(color.value); setIsErasing(false); }} />
                        ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-sm font-medium">Herramientas</h4>
                    <div className="flex flex-wrap gap-2">
                         <Button variant="outline" size="icon" className={cn(isErasing && "ring-2 ring-ring")} onClick={() => setIsErasing(!isErasing)}>
                             <Eraser className="h-5 w-5"/>
                         </Button>
                         <Button variant="outline" size="icon" className={cn(!isErasing && "ring-2 ring-ring")} onClick={() => setIsErasing(false)}>
                             <Pencil className="h-5 w-5"/>
                         </Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <h4 className="text-sm font-medium">Tamaño del Pincel</h4>
                    <input type="range" min="1" max="10" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))} className="w-full" />
                 </div>
                 <Button variant="destructive-outline" onClick={drawMap} className="mt-auto">
                    {t('TeamsPage.clear_board')}
                </Button>
            </div>
            <div className="md:col-span-3 bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                 <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onMouseLeave={finishDrawing}
                    className="cursor-crosshair max-w-full max-h-full"
                />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
