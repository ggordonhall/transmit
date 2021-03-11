import os

from google.cloud import vision
from google.cloud import translate_v2 as translate

from utils import clean_text, clean_translation, extract_bounds

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'My Project-1dee666402a8.json'

# Instantiate vision and translate clients
VISION_CLIENT = vision.ImageAnnotatorClient()
VISION_BREAKS = vision.TextAnnotation.DetectedBreak.BreakType
TRANSLATE_CLIENT = translate.Client()


def extract(full_text_annotation, target_lang):
    """For each paragraph detected in the image, extract the
    text to be translated, the paragraph bounding box, the
    detected language and the model confidence.
    """
    for page in full_text_annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                # Don't store if no language detected
                detected_langs = paragraph.property.detected_languages
                if len(detected_langs) < 1:
                    continue
                # Don't store if detected lang is target lang
                elif len(detected_langs) == 1 and detected_langs[0].language_code == target_lang:
                    continue
                else:
                    para, line = "", ""
                    for word in paragraph.words:
                        for symbol in word.symbols:
                            line += symbol.text
                            if symbol.property.detected_break.type_ == VISION_BREAKS.SPACE:
                                line += ' '
                            if symbol.property.detected_break.type_ == VISION_BREAKS.EOL_SURE_SPACE:
                                line += ' '
                                para += line + '\n'
                                line = ''
                            if symbol.property.detected_break.type_ == VISION_BREAKS.LINE_BREAK:
                                para += line + '\n'
                                line = ''
                    lang_codes = [
                        l.language_code for l in paragraph.property.detected_languages]
                    yield (para, paragraph.bounding_box, lang_codes, paragraph.confidence)


def detect(inp_image, target_lang):
    """Calls the Google Vision OCR to detect text in an image.

    Returns detected paragraphs with their corresponding bounding
    boxes.

    Args:
        inp_image (bytes): an image
        target_lang (string): ISO 639-1 of target langugage

    Raises:
        Exception: when there is a response error

    Yields:
        Detected paragraphs with bounding boxes, detected langs and confidence
    """
    image = vision.Image(content=inp_image)
    # For dense text, use document_text_detection
    # For less dense text, use text_detection
    response = VISION_CLIENT.document_text_detection(image=image)
    if response.error.message:
        raise Exception(
            '{}\nFor more info on error messages, check: '
            'https://cloud.google.com/apis/design/errors'.format(
                response.error.message))
    document = response.full_text_annotation
    yield from extract(document, target_lang)


def translate(text, target_lang, src_langs):
    """Translated tuple of detected text in the image
    into the target language.

    Args:
        text (List[string]): A list of strings
        target_lang (string): ISO 639-1 of target langugage
        src_langs (string): List of ISO 639-1 of detected src langs

    Returns:
        List[string]: A list of translated strings
    """
    # Normalise text strings and translate
    cleaned_text = [clean_text(t) for t in text]
    translation = TRANSLATE_CLIENT.translate(text, target_language=target_lang)
    # Extract translated text and format translation
    translation = [clean_translation(
        t["translatedText"], text[i], target_lang, src_langs[i]) for i, t in enumerate(translation)]
    return translation


def detect_and_translate(image, target_lang):
    """Translate detected text in the image
    into the target language.

    Args:
        image (bytes): an image
        target_lang (string): ISO 639-1 of target langugage

    Returns:
        Image: PIL image with translation text box overlay
    """
    # Get text, bounding boxes and line breaks
    detected = list(detect(image, target_lang))
    if len(detected) < 1:
        print('No detected text to translate!')
        return [], [], [], []
    text, bounds, detected_langs, confidence = zip(*detected)

    translation = translate(text, target_lang, detected_langs)
    if len(translation) != len(bounds):
        raise RuntimeError(
            "Inconsistency between number of texts and translations")
    return text, translation, extract_bounds(bounds), list(detected_langs)
