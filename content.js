let isEnhancedReadingActive = false;
let boldnessLevel = 'medium';
let englishBoldness = 0.5;
let chineseBoldness = 0.2;
let maxBoldWordsPerSentence = 3;  // 新增: 每句话最大加粗词数

let commonWords = new Set();

let wordFrequencyData = {};

fetch(chrome.runtime.getURL('common_words.json'))
  .then(response => response.json())
  .then(data => {
    commonWords = new Set(data.filter(word => word.length > 1));
    console.log('Common words loaded:', commonWords.size);
    wordFrequencyData = data.reduce((acc, word, index) => {
      acc[word] = data.length - index; // 词频越高，分数越高
      return acc;
    }, {});
    console.log('Word frequency data loaded:', Object.keys(wordFrequencyData).length);
  })
  .catch(error => console.error('Error loading common words:', error));

const punctuations = '\u3002\uFF0C\u3001\uFF1B\uFF1A\uFF1F\uFF01\u201C\u201D\u2018\u2019\uFF08\uFF09\u3010\u3011\u300A\u300B';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleReading") {
    isEnhancedReadingActive = !isEnhancedReadingActive;
    boldnessLevel = request.boldness;
    englishBoldness = request.englishBoldness;
    chineseBoldness = request.chineseBoldness;
    maxBoldWordsPerSentence = request.maxBoldWordsPerSentence;  // 新增

    if (isEnhancedReadingActive) {
      enhancedReading();
    } else {
      resetReading();
    }
    sendResponse({isActive: isEnhancedReadingActive});
    return true;
  }
});

function enhancedReading() {
  const textNodes = document.evaluate(
    '//text()[normalize-space()]',
    document.body,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < textNodes.snapshotLength; i++) {
    const node = textNodes.snapshotItem(i);
    const text = node.textContent.trim();
    
    if (text.length > 0) {
      const span = document.createElement('span');
      span.className = 'enhanced-reading';
      span.innerHTML = processText(text);
      node.parentNode.replaceChild(span, node);
    }
  }
}

function processText(text) {
  const segments = text.split(/(\s+)/);
  return segments.map(segment => {
    if (/[\u4e00-\u9fa5]/.test(segment)) {
      // 中文处理
      return processChinese(segment);
    } else if (/[a-zA-Z]/.test(segment)) {
      // 英文处理
      return processEnglish(segment);
    } else {
      // 其他字符（如标点符号）直接返回
      return segment;
    }
  }).join('');
}

function processChinese(text) {
  const sentences = text.split(/([。，、；：？！])/);
  let result = '';
  let isFirstWordInSentence = true;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (punctuations.includes(sentence)) {
      result += sentence;
      isFirstWordInSentence = true; // 标点符号后的下一个词被视为新句子的开始
      continue;
    }

    const words = segmentChinese(sentence);
    let boldedWords = 0;
    const wordScores = words.map((word, index) => ({ 
      word, 
      score: wordFrequencyData[word] || 0, 
      index 
    }));
    wordScores.sort((a, b) => b.score - a.score);  // 按词频分数降序排序

    const boldIndices = new Set(wordScores.slice(0, maxBoldWordsPerSentence).map(w => w.index));

    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      if (isFirstWordInSentence) {
        result += `<b>${word}</b>`;
        isFirstWordInSentence = false;
        boldedWords++;
      } else if (boldedWords < maxBoldWordsPerSentence && boldIndices.has(j) && Math.random() < chineseBoldness) {
        result += `<b>${word}</b>`;
        boldedWords++;
      } else {
        result += word;
      }
    }
  }

  return result;
}

function segmentChinese(text) {
  const words = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + 1;
    let longestMatch = text[start];
    
    // 使用词频表进行前向最大匹配
    for (let i = start + 1; i <= start + 4 && i <= text.length; i++) {
      const candidate = text.slice(start, i);
      if (wordFrequencyData.hasOwnProperty(candidate)) {
        longestMatch = candidate;
        end = i;
      }
    }
    
    words.push(longestMatch);
    start = end;
  }
  
  return words;
}

function shouldBoldChinese(word) {
  // 中文加粗概率
  let probability = chineseBoldness;
  
  // 应用加粗程度
  switch (boldnessLevel) {
    case 'light': probability *= 0.7; break;
    case 'heavy': probability *= 1.3; break;
  }

  return Math.random() < probability;
}

function processEnglish(text) {
  const words = text.split(/(\s+)/);
  return words.map(word => {
    if (/\s+/.test(word)) return word;
    return applyEnglishBoldness(word);
  }).join('');
}

function applyEnglishBoldness(word) {
  let boldness = englishBoldness;
  
  // 应用加粗程度
  switch (boldnessLevel) {
    case 'light': boldness *= 0.7; break;
    case 'heavy': boldness *= 1.3; break;
  }

  const boldPart = word.slice(0, Math.ceil(word.length * boldness));
  const restPart = word.slice(Math.ceil(word.length * boldness));
  return `<b>${boldPart}</b>${restPart}`;
}

function resetReading() {
  const enhancedNodes = document.querySelectorAll('.enhanced-reading');
  enhancedNodes.forEach(node => {
    const textNode = document.createTextNode(node.textContent);
    node.parentNode.replaceChild(textNode, node);
  });
}

