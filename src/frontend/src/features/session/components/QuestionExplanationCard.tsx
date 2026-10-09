import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { ExportPromptButton } from '@/components/ExportPromptButton';
import type { QuestionExportData } from '@/utils/promptTemplates';
import { fetchAiExplanation } from '@/api';

interface QuestionExplanationCardProps {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswerText: string;
  correctOptionIndex: number;
  selectedOptionIndex: number | null;
  officialExplanation?: string | null;
  subject?: string | null;
  isCorrect?: boolean;
  exportData: QuestionExportData;
  isReviewView?: boolean;
}

export const QuestionExplanationCard: React.FC<QuestionExplanationCardProps> = ({
  questionId,
  questionText,
  options,
  correctAnswerText,
  correctOptionIndex,
  selectedOptionIndex,
  officialExplanation,
  subject,
  isCorrect,
  exportData,
  isReviewView = false,
}) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(() => {
    return sessionStorage.getItem(`usmle_ai_expl_${questionId}`) || null;
  });
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasOfficialExplanation = !!(officialExplanation && officialExplanation.trim().length > 0);

  const handleGenerateAiExplanation = async () => {
    setIsLoadingAi(true);
    setErrorMessage(null);

    const selectedText = selectedOptionIndex !== null && selectedOptionIndex !== undefined
      ? options[selectedOptionIndex]
      : undefined;

    try {
      const res = await fetchAiExplanation({
        question: questionText,
        options,
        correct_answer: correctAnswerText,
        selected_answer: selectedText,
        subject: subject || undefined,
      });

      setAiExplanation(res.explanation);
      sessionStorage.setItem(`usmle_ai_expl_${questionId}`, res.explanation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate AI rationale.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <Card className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in duration-300">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {!isReviewView && isCorrect !== undefined && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  isCorrect
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                }`}
              >
                {isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {hasOfficialExplanation ? 'Official Rationale' : 'Clinical Explanation'}
              </span>
              {!isReviewView && (
                <span>
                  • Correct choice was ({String.fromCharCode(65 + correctOptionIndex)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hasOfficialExplanation && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAiExplanation}
                disabled={isLoadingAi}
                className="h-8 px-2.5 text-xs font-medium gap-1.5 rounded-lg border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs transition-colors"
                title="Generate an on-demand clinical explanation using AI"
              >
                {isLoadingAi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{aiExplanation ? 'Regenerate AI' : 'AI Explanation'}</span>
              </Button>
            )}

            <ExportPromptButton questionData={exportData} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {hasOfficialExplanation ? (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap select-text">
            {officialExplanation}
          </p>
        ) : aiExplanation ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-text space-y-2">
              {aiExplanation}
            </div>
            <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                AI-Generated Explanation. AI can make mistakes, please review the explanation against official sources.
              </span>
            </div>
          </div>
        ) : isLoadingAi ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400 gap-2.5 animate-pulse">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <p className="text-xs font-medium">
              Generating clinical breakdown & distractor rationale via OpenRouter...
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Correct Answer: <strong className="text-emerald-600 dark:text-emerald-400">({String.fromCharCode(65 + correctOptionIndex)}) {correctAnswerText}</strong>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                This dataset does not include an official author explanation.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
