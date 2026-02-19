import { useState, useCallback } from 'react';
import { parseCSV } from '@/lib/csv-parser';
import { computeParameterSummaries, evaluateRules } from '@/lib/insight-engine';
import { DEFAULT_PRIUS_RULES } from '@/lib/default-rules';
import {
  createSession, insertSessionRows, insertSessionFlags, uploadSessionCSV, removeSessionCSV, deleteSession
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export function useCSVUpload(onComplete: (sessionId: string) => void, carProfileId?: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const { toast } = useToast();

  const upload = useCallback(async (file: File, customName?: string) => {
    if (!carProfileId) {
      toast({ title: 'Error', description: 'Please select a vehicle first.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    let sourceFilePath: string | null = null;
    let createdSessionId: string | null = null;
    try {
      setProgress('Reading file...');
      const text = await file.text();

      setProgress('Parsing CSV...');
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) {
        toast({ title: 'Empty CSV', description: 'No data rows found.', variant: 'destructive' });
        return;
      }

      setProgress('Computing insights...');
      const summaries = computeParameterSummaries(parsed);
      
      const flags = evaluateRules(parsed, DEFAULT_PRIUS_RULES);

      // Estimate duration
      let durationSeconds: number | undefined;
      if (parsed.timeColumn?.type === 'seconds' && parsed.rows.length > 1) {
        const times = parsed.rows
          .map(r => r[parsed.timeColumn!.key])
          .filter((v): v is number => typeof v === 'number');
        if (times.length > 1) {
          durationSeconds = Math.round(times[times.length - 1] - times[0]);
        }
      }

      // Estimate start time
      let sessionStart: string | null = null;
      
      // 1. Try from timestamp column
      if (parsed.timeColumn?.type === 'timestamp' && parsed.rows.length > 0) {
        const firstRowTime = parsed.rows[0][parsed.timeColumn.key];
        if (typeof firstRowTime === 'string') {
          const d = new Date(firstRowTime);
          if (!isNaN(d.getTime())) {
            sessionStart = d.toISOString();
          }
        }
      }

      // 2. Try from filename (e.g. "2025-02-09 15-30-00.csv")
      if (!sessionStart) {
        const filename = file.name;
        const match = filename.match(/(\d{4})-(\d{2})-(\d{2})[\s_-](\d{2})-(\d{2})-(\d{2})/);
        if (match) {
          const [_, y, m, d, h, min, s] = match;
          const date = new Date(
            parseInt(y), 
            parseInt(m) - 1, 
            parseInt(d), 
            parseInt(h), 
            parseInt(min), 
            parseInt(s)
          );
          if (!isNaN(date.getTime())) {
            sessionStart = date.toISOString();
          }
        }
      }

      setProgress('Saving original CSV...');
      try {
        sourceFilePath = await uploadSessionCSV(file, carProfileId);
      } catch (storageError) {
        sourceFilePath = null;
        console.warn('Storage upload unavailable, keeping CSV in database only:', storageError);
      }

      setProgress('Saving session...');
      const session = await createSession(
        carProfileId,
        customName || file.name,
        parsed.rows.length,
        parsed.headers,
        { summaries, headerMapping: parsed.headerMapping, timeColumn: parsed.timeColumn },
        durationSeconds,
        sessionStart,
        sourceFilePath,
        text,
      );
      createdSessionId = session.id;

      setProgress('Saving data rows (0%)...');
      const dbRows = parsed.rows.map((row, idx) => {
        let t_seconds: number | null = null;
        let t_timestamp: string | null = null;
        if (parsed.timeColumn) {
          const val = row[parsed.timeColumn.key];
          if (parsed.timeColumn.type === 'seconds' && typeof val === 'number') {
            t_seconds = val;
          } else if (parsed.timeColumn.type === 'timestamp' && typeof val === 'string') {
            t_timestamp = val;
          }
        } else {
          t_seconds = idx;
        }

        const data: Record<string, unknown> = {};
        parsed.headers.forEach(h => {
          if (h !== parsed.timeColumn?.key && typeof row[h] === 'number') {
            data[h] = row[h];
          }
        });

        return { t_seconds, t_timestamp, data };
      });

      await insertSessionRows(session.id, dbRows, (percent) => {
        setProgress(`Saving data rows (${percent}%)...`);
      });

      setProgress('Saving flags...');
      await insertSessionFlags(session.id, flags.map(f => ({
        ...f,
        evidence: f.evidence as unknown as Record<string, unknown>,
      })));

      // Optional: Analyze with Gemini if API key is configured
      try {
        setProgress('Analyzing with AI...');
        const { getGeminiApiKey, getGeminiModel, updateSessionWithGeminiAnalysis } = await import('@/lib/db');
        const { analyzeSession } = await import('@/lib/gemini-service');

        const apiKey = await getGeminiApiKey();
        const model = await getGeminiModel();
        if (apiKey) {
          // Convert summaries array to object for Gemini
          const summariesObj: Record<string, { count: number; min: number; max: number; avg: number; }> = {};
          summaries.forEach(s => {
            summariesObj[s.parameter_key] = {
              count: s.count,
              min: s.min,
              max: s.max,
              avg: s.avg
            };
          });

          const analysis = await analyzeSession(apiKey, {
            filename: file.name,
            rowCount: parsed.rows.length,
            durationSeconds,
            summaries: summariesObj,
            flags: flags.map(f => ({
              severity: f.severity,
              message: f.message,
              canonical_key: f.canonical_key,
            })),
          }, model);

          await updateSessionWithGeminiAnalysis(session.id, analysis as unknown as Record<string, unknown>);
        }
      } catch (aiError) {
        // AI analysis is optional, don't fail the upload if it errors
        console.warn('Gemini analysis failed:', aiError);
      }

      toast({ title: 'Upload complete!', description: `${parsed.rows.length} rows, ${flags.length} flags detected.` });
      onComplete(session.id);
    } catch (err) {
      console.error(err);

      if (createdSessionId) {
        try {
          await deleteSession(createdSessionId);
        } catch (cleanupError) {
          console.warn('Failed to rollback failed session upload:', cleanupError);
        }
      } else if (sourceFilePath) {
        try {
          await removeSessionCSV(sourceFilePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup CSV after upload error:', cleanupError);
        }
      }

      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress('');
    }
  }, [onComplete, toast, carProfileId]);

  return { upload, uploading, progress };
}
