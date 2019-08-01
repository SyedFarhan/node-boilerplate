import {
  DELETE,
  INSERT,
  // EQUAL,
  ACTION_LIST_REGEX,
  ACTION_REGEX,
} from './constants';

export function renderHTML(diffs) {
  const html = [];
  const patternAmp = /&/g;
  const patternLT = /</g;
  const patternGT = />/g;
  const patternPara = /\n/g;
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
