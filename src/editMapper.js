import { DELETE, INSERT, EQUAL } from './constants';

export function createEditDistanceGraph({ sourceTokens, targetTokens }) {
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

export function findEditPath({
  editDistanceGraph,
  sourceTokens,
  targetTokens,
}) {
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
      const currentDistance = editDistanceGraph[sourceIndex][targetIndex];
      const del = editDistanceGraph[sourceIndex - 1][targetIndex];
      const ins = editDistanceGraph[sourceIndex][targetIndex - 1];
      const subeq = editDistanceGraph[sourceIndex - 1][targetIndex - 1];
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

export function createEditInstructions({
  editPath,
  sourceTokens,
  targetTokens,
  TOKENS,
}) {
  let instructions = [];
  let insertions = [];
  let deletions = [];
  let sourcePtr = 0;
  let targetPtr = 0;
  editPath.forEach(step => {
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
