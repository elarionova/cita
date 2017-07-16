// State:
var rendered_cites = [];
var on_selection_change_callbacks = [];
var descading_sort = true;

// Selected labels. Should be a subset of LABELS.
var selected_labels = [];

const LABELS = ['blanc', 'red', 'green', 'blue', 'yellow', 'violet', 'orange'];
const SEARCH_INPUT_ID = "search_input";
const SHOW_MORE_BUTTON_ID = 'show_more_button';

// TODO(matthewtff): Move this as a setting to options page.
const CITES_PER_PAGE = 50;

function compareCites(left, right) {
  const left_timestamp = new Date(left['timestamp']);
  const right_timestamp = new Date(right['timestamp']);
  if (left_timestamp < right_timestamp) {
    return -1
  } else if (left_timestamp === right_timestamp) {
    return 0;
  } else {
    return 1;
  }
}

function getAllCites(callback) {
  chrome.storage.local.get(storage => {
    let cites = [];
    for (const key in storage) {
      if (!storage.hasOwnProperty(key))
        continue;
      cites.push(storage[key]);
    }
    callback(cites);
  });
}

function searchCites(query, callback) {
  getAllCites(cites => {
    let results = [];
    for (const cite of cites) {
      if (cite['text'].includes(query) || cite['url'].includes(query)) {
        results.push(cite);
      }
    }
    callback(results);
  });
}

function removeCite(cite) {
  chrome.storage.local.remove(cite['timestamp'], () => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
    }
  });
}

function setCite(cite) {
  let insertion = {};
  insertion[cite['timestamp']]  = cite;
  chrome.storage.local.set(insertion, () => {
    if (chrome.runtime.lastError) {
      console.error('Unable to update cite at local storage');
    }
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const current_date = new Date();

  const seconds_ago = (current_date / 1000) - (date / 1000);

  const seconds_in_minute = 60;
  const seconds_in_hour = 60 * seconds_in_minute;

  if (seconds_ago < seconds_in_hour) {
    const minutes_ago = Math.floor(seconds_ago / seconds_in_minute);
    let message = '';
    if (minutes_ago === 1) {
      message = 'MINUTES_SINGLE';
    } else if (minutes_ago > 1 && minutes_ago < 5) {
      message = 'MINUTES_SEMI_PLURAL';
    } else {
      message = 'MINUTES_PLURAL';
    }
    return String(minutes_ago) + ' ' + chrome.i18n.getMessage(message);
  }

  const seconds_in_day = 24 * seconds_in_hour;
  if (seconds_ago < seconds_in_day) {
    const hours_ago = Math.floor(seconds_ago / seconds_in_hour);
    let message = '';
    if (hours_ago === 1) {
      message = 'HOURS_SINGLE';
    } else if (hours_ago < 5) {
      message = 'HOURS_SEMI_PLURAL';
    } else {
      message = 'HOURS_PLURAL';
    }
    return String(hours_ago) + ' ' + chrome.i18n.getMessage(message);
  }

  const days_ago = Math.floor(seconds_ago / seconds_in_day);
  let message = '';
  if (days_ago === 1) {
    message = 'DAYS_SINGLE';
  } else if (days_ago < 5) {
    message = 'DAYS_SEMI_PLURAL';
  } else {
    message = 'DAYS_PLURAL';
  }

  return String(days_ago) + ' ' + chrome.i18n.getMessage(message);
}

function removeShowMoreButton() {
  const button = document.getElementById(SHOW_MORE_BUTTON_ID);
  if (button) {
    button.remove();
  }
}

function clearContent() {
  for (const cite_info of rendered_cites) {
    cite_info.element.remove();
  }

  removeShowMoreButton();

  rendered_cites = [];
  on_selection_change_callbacks = [];
}

function createDiv(parent, classes, put_to_top=false) {
  const div = document.createElement('div');
  for (const cls of classes) {
    div.classList.add(cls);
  }
  if (put_to_top) {
    parent.insertBefore(div, parent.firstChild);
  } else {
    parent.appendChild(div);
  }
  return div;
}

function showHint(c_content, color, message) {
  const hint = createDiv(c_content, ['hint', color]);
  hint.innerText = message;
  setTimeout(() => {
    $(hint).fadeOut(() => hint.remove());
  }, 3000);
  return hint;
}

function createAnchorWithSpan(
    parent, anchor_classes, anchor_properties, span_classes, span_properties) {
  const anchor = document.createElement('a');
  for (const cls of anchor_classes) {
    anchor.classList.add(cls);
  }
  for (const prop in anchor_properties) {
    anchor.setAttribute(prop, anchor_properties[prop]);
  }

  const span = document.createElement('span');
  for (const cls of span_classes) {
    span.classList.add(cls);
  }
  for (const prop in span_properties) {
    span.setAttribute(prop, span_properties[prop]);
  }

  anchor.appendChild(span);
  parent.appendChild(anchor);
  return anchor;
}

function maybeRenderShowMoreButton(cites) {
  const number_of_hidden_cites = cites.length - rendered_cites.length;
  if (number_of_hidden_cites <= 0)
    return;

  const main = document.getElementById('main');

  const row = createDiv(main, ['row']);
  row.id = SHOW_MORE_BUTTON_ID;
  const offset_div = createDiv(
      row, ['col-xs-12', 'col-sm-12', 'col-md-12', 'col-lg-12']);

  const button = document.createElement('button');
  button.type = 'button';
  for (const cls of ['btn', 'btn-default', 'btn-lg', 'shadow_border']) {
    button.classList.add(cls);
  }
  button.innerText = chrome.i18n.getMessage('SHOW_MORE_BUTTON_MESSAGE');

  button.addEventListener('click', () => {
    removeShowMoreButton();


    const cites_to_render = cites.slice(
        rendered_cites.length,
        rendered_cites.length +
        Math.min(number_of_hidden_cites, CITES_PER_PAGE));
    cites_to_render.forEach((cite) => addCite(cite));
    maybeRenderShowMoreButton(cites);
  });

  offset_div.appendChild(button);
}

function removeChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function getRowInfo(row, rows_info) {
  for (const row_info of rows_info) {
    if (row_info.element === row)
      return row_info;
  }
}

function getRowIndex(row, rows_info) {
  for (index = 0; index < rows_info.length; ++index) {
    if (rows_info[index].element === row)
      return index;
  }
}

function toggleCite(row) {
  const row_info = getRowInfo(row, rendered_cites);
  if (!row_info) {
    console.error('Attempt to toggle unexistent cita');
    return;
  }

  if (row_info.expanded) {
    renderCite(row, row_info.cite);
  } else {
    renderExpanededCite(row, row_info.cite);
  }

  row_info.expanded = !row_info.expanded;
}

function renderExpanededCite(row, cite) {
  removeChildren(row);
  const shift_div = createDiv(
      row, ['col-xs-12', 'col-sm-12', 'col-md-12', 'col-lg-12'])

  const c_panel = createDiv(shift_div, ['c_panel', 'c_panel_opened']);
  const panel_body = createDiv(c_panel, ['panel-body']);

  const minimize = createDiv(panel_body, ['minimize']);
  const a_button = createAnchorWithSpan(
      minimize, ['a_button'],
      {'title': chrome.i18n.getMessage('MINIMIZE_BUTTON_TITLE')},
      ['glyphicon', 'glyphicon-menu-up'],
      {'aria-hidden': true});
  minimize.addEventListener('click', () => { toggleCite(row); });

  const c_date = createDiv(panel_body, ['c_date']);
  c_date.innerText = formatDate(cite['timestamp']);

  const c_content = createDiv(panel_body, ['c_content']);

  const content_editable = createDiv(c_content, []);
  content_editable.setAttribute('contenteditable', true);
  content_editable.innerText = cite['text'];

  content_editable.addEventListener('blur', () => {
    cite['text'] = content_editable.innerText;
    setCite(cite);
  })

  const c_link = createDiv(c_content, ['c_link']);
  const anchor = document.createElement('a');
  anchor.href = cite['url'];
  anchor.setAttribute('target', '_blank');
  anchor.innerText = cite['title'];
  c_link.appendChild(anchor);
  on_selection_change_callbacks.push(() => {
    const selection = getSelection();
    if (!selection.containsNode(anchor, true)) {
      anchor.innerText = cite['title'];
    }
  });

  const tar = createDiv(c_content, ['tar']);

  const marks_gallery = createDiv(tar, ['marks_gallery']);
  console.assert(cite['labels'].length === 4);
  for (label_index = 0; label_index < 4; ++label_index) {
    renderLabel(row, marks_gallery, cite, label_index);
  }

  const duplicate_anchor = createAnchorWithSpan(
      tar, ['a_button'],
      {'title': chrome.i18n.getMessage('DUPLICATE_ACTION_TITLE')},
      ['glyphicon', 'glyphicon-duplicate'], {'aria-hidden': true});
  duplicate_anchor.addEventListener('click', () => {
    cite['timestamp'] = (new Date()).toString();
    setCite(cite);
    addCite(cite, true);
    const hint = showHint(
        c_content, 'green', chrome.i18n.getMessage('DUPLICATED_HINT_MESSAGE'));
    const anchor = document.createElement('a');
    anchor.href = "#top";
    anchor.innerText = chrome.i18n.getMessage('DUPLICATED_HINT_ANCHOR_TEXT');
    hint.appendChild(anchor);
  })
  const link_anchor = createAnchorWithSpan(
      tar, ['a_button'],
      {'title': chrome.i18n.getMessage('SELECT_LINK_ACTION_TITLE')},
      ['glyphicon', 'glyphicon-link'], {'aria-hidden': true});
  link_anchor.addEventListener('click', () => {
    anchor.innerText = cite['url'];
    const selection_range = document.createRange();
    selection_range.selectNode(anchor);
    getSelection().removeAllRanges();
    getSelection().addRange(selection_range);
  });
  const trash_anchor = createAnchorWithSpan(
      tar, ['a_button'],
      {'title': chrome.i18n.getMessage('REMOVE_CITE_ACTION_TITLE')},
      ['glyphicon', 'glyphicon-trash'], {'aria-hidden': true});
  trash_anchor.addEventListener('click', () => {
    const row_index = getRowIndex(row, rendered_cites);
    rendered_cites.splice(row_index, 1);
    removeCite(cite);
    row.remove();
  });
  const copy_anchor = createAnchorWithSpan(
      tar, ['a_button'],
      {'title': chrome.i18n.getMessage('SELECT_CITE_TEXT_ACTION_TITLE')},
      ['glyphicon', 'glyphicon-copy'], {'aria-hidden': true});
  copy_anchor.addEventListener('click', () => {
    const selection_range = document.createRange();
    selection_range.selectNode(content_editable);
    getSelection().removeAllRanges();
    getSelection().addRange(selection_range);
  });
}

function renderLabel(row, marks_gallery, cite, label_index) {
  const label = cite['labels'][label_index];
  const unchecked_classes = ['mark', `${label}_top`];
  const checked_classes = ['mark_checked', `${label}_bottom`];
  const mark = createDiv(marks_gallery, unchecked_classes);

  const make_unchecked = () => {
    for (const cls of checked_classes) {
      mark.classList.remove(cls);
    }
    for (const cls of unchecked_classes) {
      mark.classList.add(cls);
    }
    removeChildren(mark);
  };

  mark.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target !== mark)
      return;
    // Remove all gallery wrappers from other labels.
    $('.marks_gallery_wrapper').each(function () {
      if (this.parentNode !== mark) {
        this.remove();
      }
    });

    const checked = !!mark.firstChild;
    if (checked) {
      make_unchecked();
    } else {
      for (const cls of unchecked_classes) {
        mark.classList.remove(cls);
      }
      for (const cls of checked_classes) {
        mark.classList.add(cls);
      }
      renderLabelSelection(
          row, createDiv(mark, ['marks_gallery_wrapper']), cite, label_index);
    };
  });
}

function renderLabelSelection(row, gallery_wrapper, cite, label_index) {
  const gallery_abs = createDiv(
      gallery_wrapper, ['marks_gallery', 'marks_gallery_abs']);

  const gallery = createDiv(gallery_abs, ['marks_gallery_rel']);

  for (const label of LABELS) {
    if (label !== 'blanc' && cite['labels'].includes(label))
      continue;
    const input_id = `${cite['timestamp']}_${label}`;
    const input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('id', input_id);
    input.setAttribute('name', cite['timestamp']);
    input.classList.add('checker');
    input.addEventListener('change', () => {
      console.log('Input changed!');
      if (input.checked) {
        cite['labels'][label_index] = label;
        setCite(cite);
        renderExpanededCite(row, cite);
      }
    });

    gallery.appendChild(input);
    gallery.appendChild(document.createTextNode('\n'));

    const label_el = document.createElement('label');
    label_el.setAttribute('for', input_id);
    label_el.classList.add(label);
    gallery.appendChild(label_el);

    gallery.appendChild(document.createTextNode('\n'));
  }
}

function renderCite(row, cite) {
  removeChildren(row);
  const offset_div =
      createDiv(row, ['col-xs-12', 'col-sm-12', 'col-md-12', 'col-lg-12']);
  const c_panel = createDiv(offset_div, ['c_panel']);
  const panel_body = createDiv(c_panel, ['panel-body']);

  const clickable = createDiv(panel_body, ['clickable']);
  clickable.addEventListener('click', toggleCite.bind(this, row));

  const c_date = createDiv(clickable, ['c_date']);
  c_date.innerText = formatDate(cite['timestamp']);

  const c_content = createDiv(clickable, ['c_content']);
  const description = createDiv(c_content, ['line-clamp', 'line-clamp-1']);
  description.innerText = cite['text'];

  const cite_link = createDiv(panel_body,
                              ['c_link', 'line-clamp', 'line-clamp-1']);
  const anchor = document.createElement('a');
  anchor.href = cite['url'];
  anchor.setAttribute('target', '_blank');
  anchor.innerText = cite['title'];
  cite_link.appendChild(anchor);
}

function addCite(cite, put_to_top=false) {
  const main = document.getElementById('main');
  const row = createDiv(main, ['row'], put_to_top);
  renderCite(row, cite);
  const cite_info = {
    cite: cite,
    element: row,
    expanded: false,
  };
  if (put_to_top) {
    rendered_cites.unshift(cite_info);
  } else {
    rendered_cites.push(cite_info);
  }
}

function hasSelectedLabels(cite) {
  return selected_labels.every(label => cite['labels'].indexOf(label) > -1);
}

function renderCites() {
  clearContent();
  const search_query = document.getElementById(SEARCH_INPUT_ID).value;

  const render = (cites) => {
    cites = cites.filter(hasSelectedLabels);
    cites.sort(compareCites);
    if (descading_sort) {
      cites.reverse();
    }
    const cites_to_render =
        cites.slice(0, Math.min(CITES_PER_PAGE, cites.length));
    cites_to_render.forEach((cite) => addCite(cite));
    maybeRenderShowMoreButton(cites);
  };

  if (!search_query) {
    getAllCites(render);
  } else {
    searchCites(search_query, render);
  }
}

function addSearchHandlers() {
  const SEARCH_BUTTON_ID = "search_button";
  const REORDER_BUTTON_ID = "reorder_button";

  const search_input = document.getElementById(SEARCH_INPUT_ID);
  search_input.setAttribute('placeholder',
                            chrome.i18n.getMessage('FIND_INPUT_PLACEHOLDER'));
  search_input.addEventListener('keyup', (event) => {
    if (event.keyCode == 13) {
      renderCites();
    }
  });

  const search_button = document.getElementById(SEARCH_BUTTON_ID);
  search_button.setAttribute('title',
                             chrome.i18n.getMessage('FIND_BUTTON_TITLE'));
  search_button.addEventListener('click', renderCites);

  const reorder_button = document.getElementById(REORDER_BUTTON_ID);
  reorder_button.setAttribute('title',
                              chrome.i18n.getMessage('PRIORITY_OPTION_TITLE'));
  reorder_button.addEventListener('click', () => {
    descading_sort = !descading_sort;
    renderCites();
  });

  for (const label of LABELS) {
    const label_input = document.getElementById(`${label}_label`);
    label_input.addEventListener('change', () => {
      if (label_input.checked) {
        selected_labels.push(label_input.value);
      } else {
        const index = selected_labels.indexOf(label_input.value);
        if (index > -1) {
          selected_labels.splice(index, 1);
        }
      }
      renderCites();
    });
  }
}

addSearchHandlers();
renderCites();

document.addEventListener('selectionchange', () => {
  for (const callback of on_selection_change_callbacks) {
    callback();
  }
})

$(window).click(() => {
  $('.marks_gallery_wrapper').each(function () {
    this.remove();
  });
});
