import { useState, useMemo } from "react";
import { Calendar } from "./ui/calendar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Clock, Users } from "lucide-react";
import { BookingDialog } from "./BookingDialog";

export interface Session {
  id: string;
  date: Date;
  time: string;
  status: 'waiting' | 'upcoming' | 'completed' | 'missed' | 'cancelled';
  partner?: {
    name: string;
    initials: string;
  };
  isFavorite?: boolean;
  messages: any[];
  missedByUser?: boolean;
}

interface CalendarViewProps {
  onBookSession: (date: Date, time: string) => void;
  sessions: Session[];
  isBlocked?: boolean;
}

// Generate slots for a given date with real waiting count
function generateSlotsForDate(date: Date, sessions: Session[]) {
  const baseSlots = [
    "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
    "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", 
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
  ];
  
  return baseSlots.map((time) => {
    // Подсчитываем количество сессий со статусом 'waiting' на эту дату и время
    const waitingCount = sessions.filter(session => {
      if (session.status !== 'waiting') return false;
      
      const sessionDate = new Date(session.date);
      return sessionDate.getFullYear() === date.getFullYear() &&
             sessionDate.getMonth() === date.getMonth() &&
             sessionDate.getDate() === date.getDate() &&
             session.time === time;
    }).length;
    
    return {
      time,
      available: waitingCount
    };
  });
}

// Check if a time slot has already passed
function isTimeSlotPassed(date: Date, time: string): boolean {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const slotDate = new Date(date);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate < now;
}

export function CalendarView({ onBookSession, sessions, isBlocked = false }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  // Generate slots based on selected date with real data
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateSlotsForDate(selectedDate, sessions);
  }, [selectedDate, sessions]);

  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time);
    setShowBookingDialog(true);
  };

  const handleConfirmBooking = () => {
    if (selectedDate && selectedTime) {
      onBookSession(selectedDate, selectedTime);
      setShowBookingDialog(false);
      setSelectedTime(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Забронировать учебную сессию</h2>
        <p className="text-gray-600">Выберите дату и время для бронирования сессии. Можно забронировать и ждать партнёра или присоединиться к существующим слотам.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="mb-4">Выберите дату</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-md border"
          />
        </Card>

        <div>
          <Card className="p-6">
            <h3 className="mb-4">Доступные временные слоты</h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedDate?.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSlots
                .filter((slot) => !selectedDate || !isTimeSlotPassed(selectedDate, slot.time))
                .map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleTimeSlotClick(slot.time)}
                    className="w-full p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span>{slot.time}</span>
                    </div>
                    <Badge variant={slot.available > 3 ? "default" : slot.available > 0 ? "secondary" : "outline"}>
                      <Users className="w-3 h-3 mr-1" />
                      {slot.available} {slot.available === 0 ? "ожидает" : slot.available === 1 ? "ожидает" : "ожидают"}
                    </Badge>
                  </button>
                ))}
            </div>
          </Card>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm mb-2">Как это работает</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Выберите временной слот и подтвердите бронирование</li>
              <li>• Вы можете создать новый слот или присоединиться к существующему</li>
              <li>• Присоединяйтесь к сессии в назначенное время</li>
              <li>• Работайте вместе (камеры по желанию, микрофоны для общения)</li>
            </ul>
          </div>
        </div>
      </div>

      <BookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onConfirm={handleConfirmBooking}
      />
    </div>
  );
}
