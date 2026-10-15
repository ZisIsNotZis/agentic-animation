#!/usr/bin/env python3
"""User-requested B scene polish. Keeps the original M1 builder unchanged.

Static art study only: no production rig, motor, library or YAML modifications.
"""
import argparse
import re
from pathlib import Path
import build
import lin_anchor


def replace_once(source, old, new):
    if source.count(old)!=1:
        raise ValueError('Expected one authored shape: '+old[:60])
    return source.replace(old,new)


def refined_scene():
    source=build.story_frame()
    awei=re.search(r'<g id="awei"[^>]*>.*?</g>',source,re.S).group(0)
    original=awei
    replacements=[
      ('M821 477L853 480 852 575 829 591 814 581Z','M821 432L854 434Q853 504 852 575L829 591L814 581Q817 502 821 432Z'),
      ('M855 479L892 470 907 576 883 590 864 559Z','M855 433L892 429Q900 505 907 576L883 590L864 559Z'),
      ('M804 304Q825 289 853 290L882 298Q911 323 914 373Q910 432 902 484Q866 501 816 489Q799 454 793 408Q789 343 804 304Z','M804 304Q825 289 853 290L882 298Q911 323 914 373Q910 406 903 440Q866 453 817 446Q801 420 793 395Q789 343 804 304Z'),
      ('M865 344L885 310 899 379 891 468 902 484 879 490 865 413Z','M865 344L885 310Q900 344 899 379L892 430L903 440L880 448Q871 422 865 398Z'),
      ('M823 360L819 472 M846 355L849 478','M823 360Q820 395 821 432 M846 355L848 435'),
      ('M861 364H890V399Q875 409 861 399Z','M861 345H889V374Q875 383 861 374Z'),
      ('M842 354V453','M842 345V436'),
      ('cx="842" cy="368"','cx="842" cy="359"'),
      ('cx="843" cy="404"','cx="843" cy="391"'),
      ('<path d="M909 425L927 423 931 453 924 474 910 468 905 447Z" fill="#ddb38a" stroke-width="1.5"/>','<path d="M909 425L927 423Q930 436 924 449L915 449Q907 439 909 425Z" fill="#ddb38a" stroke-width="1.4"/>'),
      ('<path d="M914 447L914 464 M920 450L920 467" fill="none" stroke="#aa7b5d" stroke-width="1"/>',lin_anchor.rest_hand('awei-scene-rest',915,448,scale=.8,skin='#ddb38a')),
    ]
    for old,new in replacements:awei=replace_once(awei,old,new)
    source=replace_once(source,original,awei)
    lin=re.search(r'<g id="lin"[^>]*>.*?</g>',source,re.S).group(0)
    original=lin
    lin=replace_once(lin,'<path d="M431 405L451 408 449 445 439 466Q431 472 425 463L421 451Z" fill="#dcb18b" stroke-width="1.7"/>','<path d="M431 405L451 408Q448 426 444 441L433 441Q426 425 431 405Z" fill="#dcb18b" stroke-width="1.4"/>')
    lin=replace_once(lin,'<path d="M438 433L436 453 M433 437L431 454" fill="none" stroke="#a9846c" stroke-width="1"/>',lin_anchor.rest_hand('lin-scene-rest',443,440,flip=True,scale=.9,skin='#dcb18b'))
    # This scene uses profile-ish faces; soften the profile corner without
    # claiming it is the quarter-view face used in the identity sheet.
    lin=replace_once(lin,'L532 239 542 247 531 252','L532 239Q534 242 539 246Q541 248 531 252')
    source=replace_once(source,original,lin)
    source=source.replace('B · 午后叙事插画','B 深化 · 衬衫比例与手部修稿')
    return source


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out',type=Path)
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'b-refined-scene.svg').write_text(refined_scene())
    print(args.out/'b-refined-scene.svg')


if __name__=='__main__':main()
