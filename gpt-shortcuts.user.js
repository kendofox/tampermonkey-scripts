// ==UserScript==
// @name         GPT 快捷功能 v3.2
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  在 ChatGPT 輸入欄上方加入翻譯、完整代碼、白話文整理等快捷按鈕，並能正確輸入內容。
// @author       kendofox
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const BAR_ID = 'custom-gpt-button-bar';

  // 建立按鈕元素
  function createButton(text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.style.padding = '6px 12px';
    button.style.margin = '0 6px 6px 0';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '6px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#f9f9f9';
    button.style.color = '#333';
    button.style.fontSize = '13px';
    button.style.transition = 'background 0.2s';
    button.onmouseover = () => (button.style.backgroundColor = '#e0e0e0');
    button.onmouseout = () => (button.style.backgroundColor = '#f9f9f9');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }, true);
    return button;
  }

  // 取得目前可用的 composer 錨點（你那段「有效」程式碼就是用這個）
  function getComposerAnchor() {
    return document.querySelector('[data-type="unified-composer"]');
  }

  // 取得 ProseMirror 輸入區（用 contenteditable=true 的那個）
  function getEditor() {
    return document.querySelector('div.ProseMirror[contenteditable="true"]');
  }

  // 將文字插入 ProseMirror（採用你「有效」的 innerHTML 寫法 + 補 input 事件）
  function insertTextIntoEditableDiv(text) {
    const editor = getEditor();
    if (!editor) {
      console.warn('[GPT快捷功能] 找不到 ProseMirror 編輯器');
      return;
    }

    editor.focus();

    // 以 ProseMirror 常見結構塞入：多段落 <p>；空行用 <br>
    const lines = String(text).split('\n');
    const html = lines
      .map((line) => {
        const safe = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<p>${safe === '' ? '<br>' : safe}</p>`;
      })
      .join('');

    editor.innerHTML = html;

    // 讓框架「知道」內容變了（這一步常決定送出按鈕會不會亮）
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // 游標移到最後
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // 定義快捷輸入內容（沿用你的 v3.0）
  const addTranslateText = () =>
    insertTextIntoEditableDiv(
      `請使用台灣的繁體中文逐字逐句完整翻譯以下內容，規則如下：\n1.不得自行添增任何原文沒有的內容，也不得擅自刪除、略過任何內容。\n2.如過程中有如果有地名、人名或是特殊名詞，則必須要在該名詞第一次出現的翻譯名稱的後面，以括號方式呈現原文的名稱，而此動作僅需名詞第一次出現時執行。括號必須是全形。\n3.不需要對文章進行任何的分類、延伸、或是任何的註解。\n4.所有牽扯到日期，數字，某人的談話，這些務必要完整翻譯。\n5.請完整依照我的指示進行動作。 \n6.翻譯完畢時，請在文末強調翻譯已完畢，如翻譯未完畢，請在文末表示尚有內容等待翻譯，詢問我是否繼續。\n\n`
    );

  const addFullCodeText = () =>
    insertTextIntoEditableDiv(
      `請給我完整的腳本代碼，並且使用繁體中文撰寫註解，並加上腳本的版本號。\n\n`
    );

  const addSummaryText = () =>
    insertTextIntoEditableDiv(
      `將以下內容以台灣的繁體中文進行重點整理，要求如下：\n1.盡可能不要用條列式的方式，使用新聞體裁、用字，以白話文的方式進行。\n2.不要使用原文中的語句結構，可以調換段落的順序，讓文章更加精煉，但不得出現原文沒有的內容。\n3.整體字數控制在至少500字以上。\n4.如果遇到地名、人名或是其他有括號的特殊名詞，第一次出現時請保留括號與原文，第二次則不需要保留括號與原文，括號必須是全形。\n5.不用進行任何形式的總結或是結論。\n6.所有牽扯到日期，數字，某人的談話，這些都不能跳過省略。\n7.英文與數字的前後請不要有空白。\n8.在改寫報導中第二段，務必提到原始新聞來源（媒體名稱），例如：根據CNN報導、引述自每日郵報的消息指出、在NNK上被大幅報導的這則新聞，原始新聞來源（媒體名稱）的中文譯名以台灣繁體中文為準，若無法判斷，則以該新聞媒體對外名稱或新聞品牌為準\n9.改寫為風格不同的新版本，以有別於原始報導的不同敘事方式、不同用字遣詞、不同段落編排，來撰寫新稿 。新聞稿改寫後須具備「結構、語氣與描述方式」的明顯差異 ，盡量使用第三人稱；並維持新聞文體\n10.盡量少用「亦」、「強調」、「儘管」等詞彙，讓語句盡量簡潔乾淨俐落。\n11.除非是發言內容或是特定聲明稿內容，否則撰文時不要使用「你（妳）」、「我」、「他（她）」等人稱。\n\n`
    );

  const addBackupText = () =>
    insertTextIntoEditableDiv(
      `請用條列式列出下列內容的重點，用字務必簡潔精煉。\n\n`
    );

  // 插入按鈕到指定區塊（關鍵：改用 [data-type="unified-composer"]）
  function insertButtons() {
    if (document.getElementById(BAR_ID)) return;

    const anchor = getComposerAnchor();
    if (!anchor || !anchor.parentElement) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.id = BAR_ID;
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexWrap = 'wrap';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '6px';
    buttonContainer.style.margin = '0 0 8px 0';
    buttonContainer.style.padding = '6px 0';

    buttonContainer.appendChild(createButton('翻譯', addTranslateText));
    buttonContainer.appendChild(createButton('完整代碼', addFullCodeText));
    buttonContainer.appendChild(createButton('白話文重點整理', addSummaryText));
    buttonContainer.appendChild(createButton('備用', addBackupText));

    // 插在 unified-composer 的「正上方」（就是你那段有效程式碼插的位置）
    anchor.parentElement.insertBefore(buttonContainer, anchor);
    console.log('[GPT快捷功能] ✅ 按鈕列已插入');
  }

  // 讓 SPA / React 重繪時也會補回來（避免「出現一下就消失」或「換對話就沒了」）
  let rafPending = false;
  const observer = new MutationObserver(() => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      insertButtons();
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 初次插入（多試幾次，避開載入時序）
  insertButtons();
  setTimeout(insertButtons, 300);
  setTimeout(insertButtons, 1200);
})();
