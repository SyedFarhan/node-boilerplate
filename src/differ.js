import { clone } from 'ramda';
import { DELETE, INSERT, EQUAL, ACTION_REGEX } from './constants';

const TOKENS = {};
const INV_TOKENS = {};
let TOKEN_COUNTER = 17;

export function cleanBotdata(dataToClean) {
  const data = clone(dataToClean);
  if (Array.isArray(data)) {
    data.forEach(element => {
      cleanBotdata(element);
    });
  } else if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      if (key === 'mimic') {
        delete data[key].id;
        delete data[key].metrics;
        if (Object.keys(data[key]).length === 0) {
          delete data[key];
        }
      }
      if (key === '@to') {
        data.to = data[key]; // TODO: Check to make sure that ['to'] doesn't already exist
        delete data[key];
      }
      cleanBotdata(data[key]);
    });
  }
}

export function tokenize(data) {
  if (INV_TOKENS[data]) {
    return INV_TOKENS[data];
  }
  const token = TOKEN_COUNTER.toString(16);
  TOKEN_COUNTER += 1;
  TOKENS[token] = data;
  INV_TOKENS[data] = token;
  return token;
}

export function createTokensFromAction(data, tokenList = []) {
  const compare = (keyA, keyB) => {
    const AisActionList =
      Array.isArray(data[keyA]) &&
      data[keyA][0] &&
      typeof data[keyA][0] === 'object' &&
      Object.keys(data[keyA][0])[0].match(ACTION_REGEX);
    const BisActionList =
      Array.isArray(data[keyB]) &&
      data[keyB][0] &&
      typeof data[keyB][0] === 'object' &&
      Object.keys(data[keyB][0])[0].match(ACTION_REGEX);

    if (AisActionList && BisActionList) {
      return 0;
    }

    if (!AisActionList && !BisActionList) {
      if (keyA < keyB) {
        return -1;
      }

      if (keyA > keyB) {
        return 1;
      }

      return 0;
    }

    if (AisActionList) {
      return 1;
    }

    return -1;
  };

  const keys = Object.keys(data).sort(compare);

  keys.forEach(key => {
    const value = data[key];
    if (key.match(ACTION_REGEX)) {
      tokenList.push(tokenize(`${key}::start`));
      createTokensFromAction(data[key], tokenList);
      tokenList.push(tokenize(`${key}::finish`));
    } else if (
      Array.isArray(value) &&
      value[0] &&
      typeof value[0] === 'object' &&
      Object.keys(value[0])[0].match(ACTION_REGEX)
    ) {
      tokenList.push(tokenize(`ACTIONS::${key}::start`));
      value.forEach(action => {
        createTokensFromAction(action, tokenList);
      });
      tokenList.push(tokenize(`ACTIONS::${key}::finish`));
    } else {
      tokenList.push(tokenize(`${key}:${JSON.stringify(value)}`)); // TODO: Sort this object recursively
    }
  });
  return tokenList;
}

export function tokenizeBotJson(jsonData) {
  const workflow = jsonData;
  cleanBotdata(workflow);
  const tokens = createTokensFromAction(workflow);
  return tokens;
}

export function createEditGraph(sourceTokens, targetTokens) {
  // Build the empty graph with starting values
  const distanceGraph = [];

  let sourceIndex;
  let targetIndex;
  for (
    sourceIndex = 0;
    sourceIndex < sourceTokens.length + 1;
    sourceIndex += 1
  ) {
    distanceGraph.push([]);
    distanceGraph[sourceIndex].push(sourceIndex);
  }
  for (
    targetIndex = 1;
    targetIndex < targetTokens.length + 1;
    targetIndex += 1
  ) {
    distanceGraph[0].push(targetIndex);
  }

  // Traverse and fill the graph
  for (
    sourceIndex = 1;
    sourceIndex < sourceTokens.length + 1;
    sourceIndex += 1
  ) {
    for (
      targetIndex = 1;
      targetIndex < targetTokens.length + 1;
      targetIndex += 1
    ) {
      const sourceToken = sourceTokens[sourceIndex - 1];
      const targetToken = targetTokens[targetIndex - 1];
      const del = distanceGraph[sourceIndex - 1][targetIndex] + 1;
      const ins = distanceGraph[sourceIndex][targetIndex - 1] + 1;
      const subeq =
        distanceGraph[sourceIndex - 1][targetIndex - 1] +
        (sourceToken === targetToken ? 0 : 2);
      const value = Math.min(del, ins, subeq);

      distanceGraph[sourceIndex].push(value);
    }
  }
  return distanceGraph;
}

export function findEditPath(distanceGraph, sourceTokens, targetTokens) {
  const path = [];

  // We start in the end of the graph and work our way backward
  let sourceIndex = sourceTokens.length;
  let targetIndex = targetTokens.length;
  let done = false;

  while (!done) {
    if (sourceIndex === 0) {
      path.push(INSERT);
      targetIndex -= 1;
    } else if (targetIndex === 0) {
      path.push(DELETE);
      sourceIndex -= 1;
    } else {
      const currentDistance = distanceGraph[sourceIndex][targetIndex];
      const del = distanceGraph[sourceIndex - 1][targetIndex];
      const ins = distanceGraph[sourceIndex][targetIndex - 1];
      const subeq = distanceGraph[sourceIndex - 1][targetIndex - 1];
      const min = Math.min(del, ins, subeq);
      if (del === min) {
        path.push(DELETE);
        sourceIndex -= 1;
      } else if (ins === min) {
        path.push(INSERT);
        targetIndex -= 1;
      } else if (subeq === currentDistance) {
        path.push(EQUAL);
        sourceIndex -= 1;
        targetIndex -= 1;
      } else if (subeq === min) {
        path.push(INSERT);
        path.push(DELETE);
        sourceIndex -= 1;
        targetIndex -= 1;
      }
    }

    if (sourceIndex === 0 && targetIndex === 0) {
      done = true;
    }
  }
  return path.reverse();
}

export function createEditInstructions(path, sourceTokens, targetTokens) {
  let instructions = [];
  let insertions = [];
  let deletions = [];
  let sourcePtr = 0;
  let targetPtr = 0;
  path.forEach(step => {
    if (step === INSERT) {
      insertions.push({
        '0': INSERT,
        '1': `${TOKENS[targetTokens[targetPtr]]}\n`,
      });
      targetPtr += 1;
    } else if (step === DELETE) {
      deletions.push({
        '0': DELETE,
        '1': `${TOKENS[sourceTokens[sourcePtr]]}\n`,
      });
      sourcePtr += 1;
    } else if (step === EQUAL) {
      instructions = instructions.concat(deletions);
      instructions = instructions.concat(insertions);
      insertions = [];
      deletions = [];
      instructions.push({
        '0': EQUAL,
        '1': `${TOKENS[sourceTokens[sourcePtr]]}\n`,
      });
      targetPtr += 1;
      sourcePtr += 1;
    }
  });
  return instructions;
}
