export interface QuestionExportData {
  questionText: string;
  options: Record<string, string>;
  correctOption?: string;
  selectedOption?: string;
  isCorrect?: boolean;
  subject?: string;
  rationale?: string;
}

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  icon?: string;
  generate: (data: QuestionExportData) => string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "socratic-deep-dive",
    label: "Socratic Tutor & Deep-Dive",
    description: "Pathophysiology, distractor breakdowns, and high-yield board associations.",
    generate: (data: QuestionExportData) => {
      const optionsFormatted = Object.entries(data.options || {})
        .map(([key, val]) => `${key}) ${val}`)
        .join("\n");

      let userAttemptSection = "";
      if (data.selectedOption) {
        userAttemptSection = `
### My Selected Answer:
${data.selectedOption}${data.isCorrect !== undefined ? (data.isCorrect ? " (Correct ✅)" : " (Incorrect ❌)") : ""}
`;
      }

      let officialRationaleSection = "";
      if (data.rationale && data.rationale.trim().length > 0) {
        officialRationaleSection = `
### Provided Rationale:
${data.rationale.trim()}
`;
      }

      return `You are an expert USMLE medical educator and attending physician. Please help me thoroughly break down and understand this clinical board-style question:

### Clinical Vignette:
${data.questionText}

### Answer Choices:
${optionsFormatted}
${data.correctOption ? `\n### Correct Answer:\n${data.correctOption}\n` : ""}${userAttemptSection}${officialRationaleSection}
### Your Objectives:
1. **Clinical Reasoning & Pathophysiology**: Explain step-by-step why the correct answer is the most appropriate next step or diagnosis.
2. **Distractor Analysis**: Explain the high-yield trap or error associated with each incorrect option (why someone would be tempted to pick it, and what clinical scenario would make it the right choice instead).
3. **High-Yield Board Pearls**: Summarize 1-2 rapid-fire associations, classic buzzwords, or mnemonics relevant to this disease process.
4. **Follow-Up Socratic Question**: Challenge me with a brief follow-up question or clinical variation to test my retention.`;
    }
  }
];

export const DEFAULT_PROMPT_TEMPLATE = PROMPT_TEMPLATES[0];
