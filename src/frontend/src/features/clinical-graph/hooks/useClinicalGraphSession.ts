import { useState, useEffect } from 'react';
import { extractClues, buildConvergenceGraph } from '../api';
import type { ClinicalGraphResponse } from '../types';

export function useClinicalGraphSession(
  vignette: string,
  correctAnswer: string,
  options: string[] = []
) {
  const [clues, setClues] = useState<string[]>([]);
  const defaultTarget = options.length > 0 ? options[0] : correctAnswer;
  const [currentTarget, setCurrentTarget] = useState<string>(defaultTarget);
  const [graphData, setGraphData] = useState<ClinicalGraphResponse | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When question or correctAnswer changes, reset to Option A for the new question
  useEffect(() => {
    if (options.length > 0) {
      setCurrentTarget(options[0]);
    } else {
      setCurrentTarget(correctAnswer);
    }
    setClues([]);
    setGraphData(null);
    setErrorMessage(null);
  }, [vignette, correctAnswer]);

  const triggerBuildGraph = async (activeClues: string[], target: string) => {
    if (activeClues.length === 0 || !target) return;
    setIsLoadingGraph(true);
    setErrorMessage(null);
    try {
      const res = await buildConvergenceGraph({
        clues: activeClues,
        target,
        include_halo: true,
      });
      setGraphData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate graph.');
    } finally {
      setIsLoadingGraph(false);
    }
  };

  const handleExtractClues = async () => {
    if (!vignette) return;
    setIsExtracting(true);
    setErrorMessage(null);
    try {
      const res = await extractClues({
        vignette,
        correct_answer: correctAnswer || currentTarget || '',
      });
      const extracted = res.clues || [];
      setClues(extracted);
      if (extracted.length > 0 && currentTarget) {
        await triggerBuildGraph(extracted, currentTarget);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to extract clinical clues.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddClue = (newClue: string) => {
    const trimmed = newClue.trim();
    if (!trimmed || clues.includes(trimmed)) return;
    const nextClues = [...clues, trimmed];
    setClues(nextClues);
    if (currentTarget) {
      triggerBuildGraph(nextClues, currentTarget);
    }
  };

  const handleRemoveClue = (index: number) => {
    const nextClues = clues.filter((_, i) => i !== index);
    setClues(nextClues);
    if (nextClues.length > 0 && currentTarget) {
      triggerBuildGraph(nextClues, currentTarget);
    } else {
      setGraphData(null);
    }
  };

  const handleSelectTarget = (opt: string) => {
    setCurrentTarget(opt);
    if (clues.length > 0) {
      triggerBuildGraph(clues, opt);
    }
  };

  return {
    clues,
    currentTarget,
    graphData,
    isExtracting,
    isLoadingGraph,
    errorMessage,
    handleExtractClues,
    handleAddClue,
    handleRemoveClue,
    handleSelectTarget,
  };
}
