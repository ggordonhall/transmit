import 'emoji-log';
import browser from 'webextension-polyfill';

import '../styles/popup.scss';

function openWebPage(url) {
  return browser.tabs.create({url});
}

document.addEventListener('DOMContentLoaded', async () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      message: 'init__translate',
    });
  });

  document.getElementById('capture__button').addEventListener('click', () => {
    const targetLang = document.getElementById('target__language').value;
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        message: 'capture__translate',
        targetLang,
      });
    });
  });

  document.getElementById('clear__button').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        message: 'clear__translate',
      });
    });
  });

  document.getElementById('options__button').addEventListener('click', () => {
    return openWebPage('options.html');
  });
});
