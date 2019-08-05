// import { clone } from 'ramda';

import { ACTION_REGEX } from './constants';

const TOKENS = {};
const INV_TOKENS = {};
let TOKEN_COUNTER = 17;

export default {
  tokenizeBotJson,
  getTokens,
};

function getTokens() {
  return TOKENS;
}

function tokenizeBotJson(jsonData) {
  const workflow = jsonData;
  cleanBotdata(workflow);
  const tokens = createTokensFromAction(workflow);
  return tokens;
}

// cleans metrics and changes output variables from @to -> to
// rewrite into pure function
/* eslint-disable no-param-reassign */
function cleanBotdata(data) {
  if (Array.isArray(data)) {
    data.forEach(element => {
      cleanBotdata(element);
    });
  } else if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      if (key === 'mimic') {
        delete data[key].metrics; // this would always be different due to timestamps, maybe just remove timestamps?
        // if (Object.keys(data[key]).length === 0) {
        //   delete data[key];
        // }
      }
      if (key === '@to') {
        data.to = data[key]; // TODO: Check to make sure that ['to'] doesn't already exist - Syed: What should happen if it does?
        delete data[key];
      }
      cleanBotdata(data[key]);
    });
  }
}
/* eslint-enable no-param-reassign */

function createTokensFromAction(data, tokenList = []) {
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

function tokenize(data) {
  if (INV_TOKENS[data]) {
    return INV_TOKENS[data];
  }
  const token = TOKEN_COUNTER.toString(16);
  TOKEN_COUNTER += 1;
  TOKENS[token] = data;
  INV_TOKENS[data] = token;
  return token;
}
