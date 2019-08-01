import { renderHTML } from './render';
import {
  createEditGraph,
  findEditPath,
  createEditInstructions,
  tokenizeBotJson,
} from './differ';

import FIRST_WORKFLOW from '../workflows/SimpleDiff.bot';
import SECOND_WORKFLOW from '../workflows/PropertyChanged.bot';

function loadBotfile(data) {
  return JSON.parse(data);
}

const first = tokenizeBotJson(loadBotfile(FIRST_WORKFLOW));
const second = tokenizeBotJson(loadBotfile(SECOND_WORKFLOW));

const graph = createEditGraph(first, second);
const path = findEditPath(graph, first, second);

const difference = createEditInstructions(path, first, second);
// console.log(difference);
document.html = renderHTML(difference);
// fs.writeFileSync('output.html', renderHTML(difference));
