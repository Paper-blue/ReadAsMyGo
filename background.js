let jiebaReady = false;
let jiebaInstance = null;

// 初始化jieba
initJieba();

function initJieba() {
  try {
    importScripts('./lib/jieba.js');
    Jieba().then(instance => {
      jiebaInstance = instance;
      jiebaReady = true;
      console.log('Jieba initialized successfully');
    });
  } catch (error) {
    console.error('Failed to initialize Jieba:', error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processChinese") {
    processChinese(request.text).then(sendResponse);
    return true;
  }
});

async function processChinese(text) {
  if (!jiebaReady) {
    console.warn('Jieba is not ready yet');
    return simpleProcessChinese(text);
  }

  try {
    const words = jiebaInstance.tag(text);
    return identifySVO(words);
  } catch (error) {
    console.error('Error processing Chinese text with Jieba:', error);
    return simpleProcessChinese(text);
  }
}

function simpleProcessChinese(text) {
  // 简单的分词
  const words = text.split(/([，。！？；：、\s])/);
  return words.map(word => ({ text: word, important: word.length > 1 }));
}

function identifySVO(words) {
  let result = [];
  const importantTags = ['n', 'v', 'a', 'r', 'd'];  // 名词、动词、形容词、代词、副词

  for (let i = 0; i < words.length; i++) {
    const { word, tag } = words[i];
    let isImportant = importantTags.some(t => tag.startsWith(t)) && word.length > 1;

    result.push({ text: word, important: isImportant });
  }

  return result;
}