import { useCallback, useRef, useState } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCSVUpload } from '@/hooks/use-csv-upload';

interface UploadCardProps {
  onComplete: (sessionId: string) => void;
  carProfileId?: string;
  variant?: 'default' | 'compact';
}

export default function UploadCard({ onComplete, carProfileId, variant = 'default' }: UploadCardProps) {
  const { upload, uploading, progress } = useCSVUpload(onComplete, carProfileId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessionName, setSessionName] = useState('');

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return;
    }
    upload(file, sessionName);
  }, [upload, sessionName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (variant === 'compact') {
    return (
      <Card
        className="border-dashed border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <CardContent className="flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <FileUp className="w-4 h-4 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploading ? progress : "Upload new log"}
              </p>
              {!uploading && (
                <p className="text-xs text-muted-foreground">Drop CSV or click to upload</p>
              )}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-mono text-primary">{progress}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <FileUp className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop CSV or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Car Scanner ELM OBD2 export</p>
            </div>
            
            <div className="w-full max-w-xs mt-2" onClick={e => e.stopPropagation()}>
              <Input 
                placeholder="Session Name (Optional)" 
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="h-8 text-center"
              />
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
}
