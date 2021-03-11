import six
import string
from bisect import bisect_left

# Ratios relative to English taken from here:
# https://www.quora.com/What-are-the-longest-and-shortest-languages-in-terms-of-average-length-of-words
SENTENCE_LENGTH_RATIO = {
    'en': 1.0,
    'es': 1.0,
    'fr': 1.07,
    'it': 1.12,
    'de': 1.12,
    'el': 0.88,
    'ru': 0.93,
    'ar': 1.0,
    'zh': 0.29
}


def clean_text(text):
    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")
    text = text.replace('\n', ' ')
    text = text.replace('  ', ' ')
    text = text[0: -1]
    return text


def clean_translation(trans, src, trans_code, src_code):
    trans = trans.replace('&quot;', '"')
    trans = trans.replace('&#39;', "'")
    src = src.strip()
    if isinstance(src_code, list):
        src_code = src_code[0]
    if '\n' in src:
        length_factor = SENTENCE_LENGTH_RATIO.get(
            src_code, 1.0) / SENTENCE_LENGTH_RATIO.get(trans_code, 1.0)
        trans = translate_line_breaks(trans, src, length_factor)
    return trans


def take_closest(my_list, my_number):
    """
    Assumes my_list is sorted. Returns closest value to my_number.

    If two numbers are equally close, return the smallest number.
    """
    pos = bisect_left(my_list, my_number)
    if pos == 0:
        return my_list[0]
    if pos == len(my_list):
        return my_list[-1]
    before = my_list[pos - 1]
    after = my_list[pos]
    if after - my_number < my_number - before:
        return after
    else:
        return before


def translate_line_breaks(trans, src, factor, err=4):
    output_trans = []
    # Split source lines by break
    src_lines = [l.strip() for l in src.strip().split('\n')]
    # Idx and length of first src line
    line_id = 0
    max_len = int(len(src_lines[0]) * factor)

    output_line, line_len = [], 0
    for word in trans.split(' '):
        if line_len + len(word) < max_len + err:
            output_line.append(word)
            line_len += len(word)
        else:
            output_trans.append(' '.join(output_line))
            output_line = [word]
            line_len = len(word)

            if line_id < len(src_lines) - 1:
                line_id += 1
                max_len = int(len(src_lines[line_id]) * factor)
            else:
                # Final line max_len equal to maximum src line len
                max_len = int(max([len(l) for l in src_lines]) * factor)

    if output_line:
        output_trans.append(' '.join(output_line))
    return '\n'.join(output_trans)


def extract_bounds(bounds):
    """
    Extract coordinate tuples from bound objects.
    """
    res = []
    for bound in bounds:
        coords = []
        for vertex in bound.vertices:
            coords.append((vertex.x, vertex.y))
        res.append(coords)
    return res
