import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Calendar, Clock, Users, Video, Mic } from "lucide-react";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime: string | null;
  onConfirm: () => void;
}

export function BookingDialog({ 
  open, 
  onOpenChange, 
  selectedDate, 
  selectedTime,
  onConfirm 
}: BookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтвердите бронирование</DialogTitle>
          <DialogDescription>
            Забронируйте этот временной слот для вашей учебной сессии
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Дата</div>
              <div>{selectedDate?.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Время</div>
              <div>{selectedTime}</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm mb-3">Детали сессии</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Users className="w-4 h-4" />
                <span>Вы будете сопоставлены с другим участником</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Video className="w-4 h-4" />
                <span>Видео опционально (камера вкл/выкл)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mic className="w-4 h-4" />
                <span>Микрофоны включены для общения</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-sm text-amber-900">
              Пожалуйста, присоединяйтесь вовремя. Ваш партнёр по учёбе рассчитывает на вас!
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onConfirm}>
            Подтвердить бронирование
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
