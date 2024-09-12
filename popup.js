document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleReading');
  const boldnessSelect = document.getElementById('boldness');
  const englishBoldnessInput = document.getElementById('englishBoldness');
  const chineseBoldnessInput = document.getElementById('chineseBoldness');
  const maxBoldWordsPerSentenceInput = document.getElementById('maxBoldWordsPerSentence');

  let isActive = false;

  toggleButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleReading",
        boldness: boldnessSelect.value,
        englishBoldness: parseFloat(englishBoldnessInput.value),
        chineseBoldness: parseFloat(chineseBoldnessInput.value),
        maxBoldWordsPerSentence: parseInt(maxBoldWordsPerSentenceInput.value)
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        if (response && response.hasOwnProperty('isActive')) {
          isActive = response.isActive;
          toggleButton.textContent = isActive ? '关闭增强阅读' : '开启增强阅读';
        }
      });
    });
  });
});