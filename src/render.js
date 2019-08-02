import {
  DELETE,
  INSERT,
  // EQUAL,
  ACTION_LIST_REGEX,
  ACTION_REGEX,
} from './constants';

const patternAmp = /&/g;
const patternLT = /</g;
const patternGT = />/g;
const patternPara = /\n/g;

export function createHTMLString(diffs) {
  const html = [];
  for (let index = 0; index < diffs.length; index += 1) {
    const op = diffs[index][0]; // Operation (insert, delete, equal)
    const data = diffs[index][1]; // Text of change.
    const text = data
      .replace(patternAmp, '&amp;')
      .replace(patternLT, '&lt;')
      .replace(patternGT, '&gt;')
      .replace(patternPara, '<br>');
    if (!data.match(ACTION_REGEX) && !data.match(ACTION_LIST_REGEX)) {
      // It's a property so let's indent
      switch (op) {
        case INSERT:
          html[
            index
          ] = `<div style="margin-left: 15px;background:#e6ffe6;">${text}</div>`;
          break;
        case DELETE:
          html[
            index
          ] = `<div style="margin-left: 15px;background:#ffe6e6;">${text}</div>`;
          break;
        default:
          html[index] = `<div style="margin-left: 15px;">${text}</div>`;
          break;
      }
    } else if (data.match(ACTION_REGEX)) {
      const values = data.split('::');
      if (values[1].match(/start/)) {
        switch (op) {
          case INSERT:
            html[index] = `<div style="background:#e6ffe6;font-weight: bold;">${
              values[0]
            }</div>`;
            break;
          case DELETE:
            html[index] = `<div style="background:#ffe6e6;font-weight: bold;">${
              values[0]
            }</div>`;
            break;
          default:
            html[index] = `<div style="font-weight: bold;">${values[0]}</div>`;
            break;
        }
      } else {
        html[index] = '';
      }
    } else {
      // It's a block so let's indent / dedent
      const values = data.split('::');
      if (values[2].match(/start/)) {
        switch (op) {
          case INSERT:
            html[
              index
            ] = `<div style="background:#e6ffe6;margin-left: 15px;font-weight: bold;">${
              values[1]
            }:</div><div style="margin-left: 15px;">`;
            break;
          case DELETE:
            html[
              index
            ] = `<div style="background:#ffe6e6;margin-left: 15px;font-weight: bold;">${
              values[1]
            }:</div><div style="margin-left: 15px;">`;
            break;
          default:
            html[index] = `<div style="margin-left: 15px;font-weight: bold;">${
              values[1]
            }:</div><div style="margin-left: 15px;">`;
            break;
        }
      } else {
        html[index] = '</div>';
      }
    }
  }
  return html.join('');
}

// Simple parser for text properties. This needs to handle object, array property types as well
function parseProperty(text, operation) {
  const splitIndex = text.indexOf(':');
  const propertyKey = `${text.slice(0, splitIndex)}::${operation}`;
  const propertyValue = text.slice(splitIndex + 1, text.length);

  try {
    return {
      propertyKey,
      propertyValue: JSON.parse(propertyValue),
    };
  } catch (e) {
    return {
      propertyKey,
      propertyValue: text.slice(splitIndex + 1, text.length),
    };
  }
}

function isProperty(data) {
  return !data.match(ACTION_REGEX) && !data.match(ACTION_LIST_REGEX);
}

function isAction(data) {
  return data.match(ACTION_REGEX);
}

function isActionStart(flag) {
  return flag.match(/start/);
}

export function createDiffJSON(diffs) {
  const workflowJSON = { '@workflow': { args: [] } };
  const diffJSON = workflowJSON['@workflow'];
  let currentObject = diffJSON;

  for (let index = 1; index < diffs.length; index += 1) {
    const operation = diffs[index][0]; // Operation (insert, delete, equal)
    const data = diffs[index][1]; // Text of change.

    const text = data
      .replace(patternAmp, '&amp;')
      .replace(patternLT, '&lt;')
      .replace(patternGT, '&gt;')
      .replace(patternPara, '');

    if (isProperty(data)) {
      // It's a property so we need to parse the text into key/value
      // and add it to the current object (action or block)
      const { propertyKey, propertyValue } = parseProperty(text, operation);
      currentObject[propertyKey] = propertyValue;
    } else if (isAction(data)) {
      const values = data.split('::');
      if (isActionStart(values[1])) {
        const keyOp = `${values[0]}::${operation}`;
        currentObject = {};
        const actionObject = { [keyOp]: currentObject };
        diffJSON.args.push(actionObject);
      } else {
        console.log(`${index}:${data}`);
      }
    }
  }
  console.log(workflowJSON);
  return workflowJSON;
}
