import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ExportPromptButton } from '@/components/ExportPromptButton';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
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
  // Do not persist across questions or sessions; strictly stateless per-question
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear previous AI explanation immediately when question changes
  React.useEffect(() => {
    setAiExplanation(null);
    setErrorMessage(null);
    setIsLoadingAi(false);
  }, [questionId]);

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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate AI rationale.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 shadow-[0_1px_3px_rgba(30,43,39,0.06)] rounded-[28px] p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E3E8E5] dark:border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          {!isReviewView && isCorrect !== undefined && (
            <span
              className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 ${
                isCorrect
                  ? 'bg-[#E3F2EA] text-[#0B5F46] dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-[#FCEDE8] text-[#8A2F16] dark:bg-rose-950 dark:text-rose-400'
              }`}
            >
              {isCorrect ? '✓ Correct' : '✕ Incorrect'}
            </span>
          )}
          <h2 className="text-xl font-semibold text-[#1E2B27] dark:text-white">
            {hasOfficialExplanation ? 'Official Rationale' : 'Clinical Explanation'}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!hasOfficialExplanation && (
            <button
              onClick={handleGenerateAiExplanation}
              disabled={isLoadingAi}
              className="min-h-[42px] px-5 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[14px] font-semibold hover:bg-[#E3F2EA]/80 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isLoadingAi ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0B7A5A]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#0B7A5A]" />
              )}
              <span>{aiExplanation ? 'Regenerate AI explanation' : 'Generate AI explanation'}</span>
            </button>
          )}

          <ExportPromptButton questionData={exportData} />
        </div>
      </div>

      {/* Answer Callout Card */}
      <div className="p-5 rounded-[18px] bg-[#E3F2EA] dark:bg-emerald-950/40 border border-[#0B7A5A]/20">
        <div className="text-[15px] text-[#0B5F46] dark:text-emerald-300">
          <span className="font-medium">Correct answer: </span>
          <span className="font-semibold">({String.fromCharCode(65 + correctOptionIndex)}) {correctAnswerText}</span>
        </div>
        <div className="mt-1.5 text-[13px] text-[#3E4A45] dark:text-slate-400">
          {hasOfficialExplanation
            ? 'Official author explanation included below.'
            : 'This dataset does not include an official author explanation.'}
        </div>
      </div>

      {hasOfficialExplanation ? (
        <div className="text-[15px] leading-relaxed text-[#3E4A45] dark:text-slate-300 select-text">
          <MarkdownRenderer content={officialExplanation || ''} />
        </div>
      ) : aiExplanation ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>AI-Generated Explanation. Please review against primary clinical sources.</span>
          </div>
          <div className="p-5 rounded-[18px] bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800 text-[15px] leading-relaxed text-[#1E2B27] dark:text-slate-200 select-text">
            <MarkdownRenderer content={aiExplanation} />
          </div>
        </div>
      ) : isLoadingAi ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-[#4F5C57] gap-2.5 animate-pulse">
          <Sparkles className="w-6 h-6 text-[#0B7A5A] animate-spin" />
          <p className="text-sm font-medium">
            Generating clinical breakdown & distractor rationale via OpenRouter...
          </p>
        </div>
      ) : null}

      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
