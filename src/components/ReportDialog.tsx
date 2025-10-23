import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  onSubmit: (reason: string, details: string) => void;
}

export function ReportDialog({ 
  open, 
  onOpenChange, 
  partnerName,
  onSubmit 
}: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = () => {
    if (reason) {
      onSubmit(reason, details);
      setReason("");
      setDetails("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Пожаловаться на {partnerName}
          </DialogTitle>
          <DialogDescription>
            Ваша жалоба будет рассмотрена администрацией
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Причина жалобы</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment" className="cursor-pointer">
                  Неподобающее поведение
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam" className="cursor-pointer">
                  Спам или реклама
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="distraction" id="distraction" />
                <Label htmlFor="distraction" className="cursor-pointer">
                  Отвлекающее поведение
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="cursor-pointer">
                  Другое
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Дополнительные детали (опционально)</Label>
            <Textarea
              id="details"
              placeholder="Опишите ситуацию подробнее..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-sm text-amber-900">
              Ложные жалобы могут привести к ограничению вашего аккаунта.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!reason} variant="destructive">
            Отправить жалобу
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
