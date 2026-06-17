export type Question = {
  id: string;
  label: string;
  type: "scale" | "text";
};

export const surveyQuestions: Question[] = [
  {
    id: "ad_attractiveness",
    label: "Hoe aantrekkelijk vind je deze advertentie?",
    type: "scale",
  },
  {
    id: "ad_trust",
    label: "Hoe betrouwbaar komt deze advertentie over?",
    type: "scale",
  },
  {
    id: "ad_professionalism",
    label: "Hoe professioneel oogt deze advertentie?",
    type: "scale",
  },
  {
    id: "purchase_likelihood",
    label: "Hoe waarschijnlijk is het dat je dit product zou kopen?",
    type: "scale",
  },
  {
    id: "trial_likelihood",
    label: "Hoe waarschijnlijk is het dat je dit product zou proberen?",
    type: "scale",
  },
  {
    id: "brand_recall",
    label: "Welk merk werd geadverteerd?",
    type: "text",
  },
  {
    id: "study_goal_guess",
    label: "Wat denk je dat het doel van dit onderzoek was?",
    type: "text",
  },
];
