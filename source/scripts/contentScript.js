// Server URL
const URL = 'http://127.0.0.1:8000/trans/';

/**
 * Draws a rounded rectangle given the current state of the canvas.
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} rounded The corner radius
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Send captured canvas to server and perform OCR and translation.
 * Returns JSON containing the translations and the bounding boxes
 * of the segements of detected text.
 * @param {Canvas} canvas HTML5 canvas
 * @param {String} lang the ISO language code of the target languge
 */
async function sendCanvasToServer(canvas, lang) {
  const base64 = canvas.toDataURL('image/jpeg');
  const response = await fetch(URL, {
    method: 'post',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({target_lang: lang, str_base64_img: base64}),
  });
  return response.json();
}

/**
 * Draw a rounded rectangle with the same dimensions as the
 * detected text bounding box.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 */
function drawBox(ctx, left, top, width, height) {
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'white';
  roundRect(ctx, left, top, width, height, 4);
  ctx.globalAlpha = 1.0;
}

/**
 * Write multiline text to canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text The string to write
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 */
function fillTextCenter(ctx, text, x, y, width, height) {
  ctx.textBaseline = 'middle';
  const lines = text.match(/[^\r\n]+/g);
  for (let i = 0; i < lines.length; i++) {
    const xL = x;
    const yL = y + (height / (lines.length + 1)) * (i + 1);
    ctx.fillText(lines[i], xL, yL);
  }
}

/**
 * Calculate the maximum font size that will fit the text in the
 * bounding box.
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text The string to write
 * @param {String} fontType The font name
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 */
function getFontSizeToFit(ctx, text, fontType, width, height) {
  ctx.font = `1px ${fontType}`;
  let fitFontWidth = Number.MAX_VALUE;
  const lines = text.match(/[^\r\n]+/g);
  lines.forEach((line) => {
    fitFontWidth = Math.min(fitFontWidth, width / ctx.measureText(line).width);
  });
  // if you want more spacing between line, you can increase this value
  const fitFontHeight = height / (lines.length * 1.2);
  return Math.min(fitFontHeight, fitFontWidth);
}

/**
 * Write multiline text in a box with given dims.
 * Method adapted from Phan Van Linh's answer:
 * https://stackoverflow.com/questions/20551534/size-to-fit-font-on-a-canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text The string to write
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 */
function writeText(ctx, text, x, y, width, height) {
  ctx.fillStyle = 'black';
  const fontType = 'Verdana';
  const fontSize = getFontSizeToFit(ctx, text, fontType, width, height);
  ctx.font = `${fontSize}px ${fontType}`;
  fillTextCenter(ctx, text, x, y, width, height);
}

/**
 * Draw box containing translated text over detected bounding box.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} coords Array of bounding box coordinates
 * @param {String} translation Translated text
 */
function drawTextBox(ctx, coords, translation) {
  const x = coords[0][0];
  const y = coords[0][1];
  const width = coords[1][0] - coords[0][0];
  const height = coords[2][1] - coords[0][1];
  drawBox(ctx, x, y, width, height);
  writeText(ctx, translation, x, y, width, height);
}

/**
 * Take a screenshot of the video element, perform OCR and translate
 * detected text. Then write the translated text (in a bounding box) to
 * the output canvas.
 * @param {canvas} inputCanvas Screenshot of the video element
 * @param {canvas} outputCanvas Overlay canvas to write translations to
 * @param {String} targetLang the ISO language code of the target languge
 */
async function translate(inputCanvas, outputCanvas, targetLang) {
  try {
    const json = await sendCanvasToServer(inputCanvas, targetLang);
    // Clear canvas ready for next scene
    const ctx = outputCanvas.getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Draw bounding box for each block of detected text
    for (let i = 0; i < json.translation.length; i++) {
      drawTextBox(ctx, json.translation_bounds[i], json.translation[i]);
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Find the largest video element by area on the webpage.
 * If there are no videos, return null.
 * @return {VideoElement} largest video
 */
function getLargestVideo() {
  const videoArr = document.querySelectorAll('video');
  if (videoArr !== null) {
    let video;
    let max = -1;
    for (let i = 0; i < videoArr.length; i++) {
      const area = videoArr[i].offsetWidth * videoArr[i].offsetHeight;
      if (area > max) {
        max = area;
        video = videoArr[i];
      }
    }
    return video;
  }
  return null;
}

let targetVideo;
let translateCanvas;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'init__translate') {
    targetVideo = getLargestVideo();
    if (targetVideo !== null) {
      console.log('Initialising video capture...');
      translateCanvas = document.createElement('canvas');
      const targetVideoParent = targetVideo.parentNode;
      // Make sure video is ready to play
      if (targetVideo.readyState > 2) {
        translateCanvas.width = targetVideo.offsetWidth;
        translateCanvas.height = targetVideo.offsetHeight;
        translateCanvas.style.zIndex = targetVideo.style.zIndex + 1;
        translateCanvas.style.position = 'absolute';
        translateCanvas.style.pointerEvents = 'none';
        targetVideoParent.insertBefore(translateCanvas, targetVideo);
      }
    } else {
      console.log('No video element found!');
    }
  } else if (request.message === 'capture__translate') {
    if (translateCanvas === null || targetVideo === null) {
      console.log('Extension not initialised! Please wait and try again.');
    } else {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = targetVideo.offsetWidth;
      captureCanvas.height = targetVideo.offsetHeight;
      captureCanvas
        .getContext('2d')
        .drawImage(
          targetVideo,
          0,
          0,
          targetVideo.offsetWidth,
          targetVideo.offsetHeight
        );
      translate(captureCanvas, translateCanvas, request.targetLang);
    }
  } else if (request.message === 'clear__translate') {
    if (translateCanvas === null || targetVideo === null) {
      console.log('Extension not initialised! Please wait and try again.');
    } else {
      translateCanvas
        .getContext('2d')
        .clearRect(
          0,
          0,
          translateCanvas.offsetWidth,
          translateCanvas.offsetHeight
        );
    }
  } else {
    console.log('Message not recognised!');
  }
  return Promise.resolve('Got your message, thanks!');
});
