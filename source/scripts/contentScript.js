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
CanvasRenderingContext2D.prototype.roundRect = function (
  x,
  y,
  width,
  height,
  rounded
) {
  const halfRadians = (2 * Math.PI) / 2;
  const quarterRadians = (2 * Math.PI) / 4;
  // top left arc
  this.arc(
    rounded + x,
    rounded + y,
    rounded,
    -quarterRadians,
    halfRadians,
    true
  );
  // line from top left to bottom left
  this.lineTo(x, y + height - rounded);
  // bottom left arc
  this.arc(
    rounded + x,
    height - rounded + y,
    rounded,
    halfRadians,
    quarterRadians,
    true
  );
  // line from bottom left to bottom right
  this.lineTo(x + width - rounded, y + height);
  // bottom right arc
  this.arc(
    x + width - rounded,
    y + height - rounded,
    rounded,
    quarterRadians,
    0,
    true
  );
  // line from bottom right to top right
  this.lineTo(x + width, y + rounded);
  // top right arc
  this.arc(x + width - rounded, y + rounded, rounded, 0, -quarterRadians, true);
  // line from top right to top left
  this.lineTo(x + rounded, y);
  // Fill rect
  this.fill();
};

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
  ctx.roundRect(left, top, width, height, 4);
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

const test = [
  'Il est temps pour StatQuest !!!!',
  // '«Modèle» est utilisé dans de nombreux contextes.',
  // 'Maintenant que je suis un adut, le terme `` modèle a plus à voir avec les mathématiques et les statistiques',
  // `quand j'étais enfant, un mannequin
  // était un tay qui collait
  // ensemble`,
  // `Quand j'étais un peu plus âgé, un
  // mannequin était quelqu'un qui
  // portait des
  // vêtements fantaisie.`,
];
const test_bounds = [
  [
    [102, 167],
    [351, 168],
    [351, 190],
    [102, 189],
  ],
  // [
  //   [58, 12],
  //   [262, 13],
  //   [262, 29],
  //   [58, 28],
  // ],
  // [
  //   [28, 45],
  //   [288, 45],
  //   [288, 56],
  //   [28, 56],
  // ],
  // [
  //   [28, 49],
  //   [132, 50],
  //   [132, 72],
  //   [28, 71],
  // ],
  // [
  //   [176, 49],
  //   [275, 49],
  //   [275, 80],
  //   [176, 80],
  // ],
];

const json = {
  translation: test,
  translation_bounds: test_bounds,
};

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
    // const json = await sendCanvasToServer(inputCanvas, targetLang);
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
 * Calculate dims of video element
 * @param {VideoElement} video
 */
function calcuateCanvasDims(video) {
  if (!video.width) {
    video.width = video.videoWidth;
  }
  if (!video.height) {
    video.height = video.videoHeight;
  }
  let width;
  let height;
  if (video.videoWidth / video.videoHeight > video.width / video.height) {
    width = video.width;
    height = (video.videoHeight / video.videoWidth) * video.width;
  } else {
    width = (video.videoWidth / video.videoHeight) * video.height;
    height = video.height;
  }
  return {width, height};
}

// Define elements for reassignment
let TARGET_VIDEO;
let TRANSLATE_CANVAS;
let CAPTURED_FRAMES_DIV;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'init__translate') {
    TARGET_VIDEO = document.querySelector('video');
    if (TARGET_VIDEO !== null) {
      console.log('Initialising video capture...');
      CAPTURED_FRAMES_DIV = document.createElement('div');
      TRANSLATE_CANVAS = document.createElement('canvas');
      const targetVideoDims = calcuateCanvasDims(TARGET_VIDEO);
      const targetVideoParent = TARGET_VIDEO.parentNode;
      // Make sure video is ready to play
      if (TARGET_VIDEO.readyState > 2) {
        TRANSLATE_CANVAS.width = targetVideoDims.width;
        TRANSLATE_CANVAS.height = targetVideoDims.height;
        TRANSLATE_CANVAS.style.zIndex = TARGET_VIDEO.style.zIndex + 1;
        TRANSLATE_CANVAS.style.position = 'absolute';
        TRANSLATE_CANVAS.style.pointerEvents = 'none';
        targetVideoParent.insertBefore(TRANSLATE_CANVAS, TARGET_VIDEO);
      }
    } else {
      console.log('No video element found!');
    }
  } else if (request.message === 'capture__translate') {
    if (
      TRANSLATE_CANVAS === null ||
      CAPTURED_FRAMES_DIV === null ||
      TARGET_VIDEO === null
    ) {
      console.log('Extension not initialised! Please wait and try again.');
    } else {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = TRANSLATE_CANVAS.width;
      captureCanvas.height = TRANSLATE_CANVAS.height;
      captureCanvas
        .getContext('2d')
        .drawImage(TARGET_VIDEO, 0, 0, TARGET_VIDEO.width, TARGET_VIDEO.height);
      CAPTURED_FRAMES_DIV.appendChild(captureCanvas);
      translate(
        CAPTURED_FRAMES_DIV.lastChild,
        TRANSLATE_CANVAS,
        request.targetLang
      );
    }
  } else if (request.message === 'clear__translate') {
    if (
      TRANSLATE_CANVAS === null ||
      CAPTURED_FRAMES_DIV === null ||
      TARGET_VIDEO === null
    ) {
      console.log('Extension not initialised! Please wait and try again.');
    } else {
      TRANSLATE_CANVAS.getContext('2d').clearRect(
        0,
        0,
        TRANSLATE_CANVAS.width,
        TRANSLATE_CANVAS.height
      );
    }
  } else {
    console.log('Message not recognised!');
  }
  return Promise.resolve('Got your message, thanks!');
});
