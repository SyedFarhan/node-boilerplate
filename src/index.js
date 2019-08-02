import Tokenizer from './tokenizer';
import {
  createEditDistanceGraph,
  findEditPath,
  createEditInstructions,
} from './editMapper';
import { createHTMLString, createDiffJSON } from './render';

import FIRST_WORKFLOW from '../workflows/SimpleDiff.json';
import SECOND_WORKFLOW from '../workflows/PropertyChanged.json';

const tokenizedWorkflows = {
  sourceTokens: Tokenizer.tokenizeBotJson(FIRST_WORKFLOW),
  targetTokens: Tokenizer.tokenizeBotJson(SECOND_WORKFLOW),
};

const editDistanceGraph = createEditDistanceGraph(tokenizedWorkflows);
const editPath = findEditPath({ editDistanceGraph, ...tokenizedWorkflows });

const difference = createEditInstructions({
  editPath,
  ...tokenizedWorkflows,
  TOKENS: Tokenizer.getTokens(),
});

window.addEventListener('DOMContentLoaded', () => {
  document.body.innerHTML = createHTMLString(difference);
  createDiffJSON(difference);
});
