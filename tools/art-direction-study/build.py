#!/usr/bin/env python3
"""M1 original static art studies, NOT an episode/animation production pipeline.

Usage: python3 tools/art-direction-study/build.py /tmp/<study-directory>
Writes three authored SVG studies. Rendering and visual acceptance are separate.
No external artwork, network calls, image-generation model or production edits.
"""
import argparse
import random
from pathlib import Path
from xml.sax.saxutils import escape


def text(x, y, words, size=24, fill='#263d3b', family='Noto Serif CJK SC', **attrs):
    extra = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-family="{family}" {extra}>{escape(words)}</text>'


def svg(title, defs, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">原创方向样稿：青云小卖部，lin把保温杯交给awei。静态设计姿态，不是引擎运行结果。</desc>
<defs>{defs}</defs>{body}</svg>'''


DEFS = '''
<filter id="paper" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
 <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="41" stitchTiles="stitch"/>
 <feColorMatrix type="saturate" values="0"/>
</filter>
<filter id="cut" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="linearRGB">
 <feDropShadow dx="2" dy="4" stdDeviation="1.4" flood-color="#564537" flood-opacity=".13"/>
</filter>
<linearGradient id="warmWall" x2=".9" y2="1" color-interpolation="linearRGB">
 <stop stop-color="#fff0cb"/><stop offset=".35" stop-color="#f3dcaf"/><stop offset=".7" stop-color="#dfc599"/><stop offset="1" stop-color="#c5ad89"/>
</linearGradient>
<linearGradient id="glass" color-interpolation="linearRGB">
 <stop stop-color="#174b51"/><stop offset=".18" stop-color="#377e7f"/><stop offset=".36" stop-color="#79b9ad"/><stop offset=".58" stop-color="#4a9892"/><stop offset="1" stop-color="#27666c"/>
</linearGradient>
<filter id="wash" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="linearRGB">
 <feTurbulence type="fractalNoise" baseFrequency=".038 .05" numOctaves="3" seed="17" result="field"/>
 <feDisplacementMap in="SourceGraphic" in2="field" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<linearGradient id="sky" x2="0" y2="1" color-interpolation="linearRGB">
 <stop stop-color="#a0bfc1"/><stop offset=".35" stop-color="#bdcebc"/><stop offset=".72" stop-color="#f0dfb2"/><stop offset="1" stop-color="#f9e8be"/>
</linearGradient>
'''


def grain(opacity='.045'):
    return f'<rect width="1280" height="720" filter="url(#paper)" opacity="{opacity}" style="mix-blend-mode:multiply"/>'


def caption(color='#fff9e9', outline='#43504a'):
    return text(640, 679, '给。', 30, color, 'Noto Sans CJK SC', text_anchor='middle',
                stroke=outline, stroke_width=3, paint_order='stroke fill', font_weight='500')


def cup(x=641, y=375, scale=1, painted=False):
    body = '#368a84' if painted else 'url(#glass)'
    return f'''<g id="thermos" transform="translate({x} {y}) scale({scale})">
<path d="M47 22 C75 15 75 66 47 62" fill="none" stroke="#254e51" stroke-width="10"/>
<path d="M48 24 C66 23 65 58 49 56" fill="none" stroke="#91bdb0" stroke-width="4"/>
<path d="M3 14 Q25 7 48 14 L49 76 Q24 86 2 76Z" fill="{body}" stroke="#275457" stroke-width="2"/>
<path d="M8 23 L12 70" stroke="#b9d8c5" stroke-width="3" opacity=".65"/>
<path d="M4 53 Q26 57 48 52" stroke="#bcdfc9" stroke-width="3" fill="none" opacity=".65"/>
<path d="M3 15 Q25 21 49 15 L47 5 Q25 -2 4 5Z" fill="#e3dfc6" stroke="#315b59" stroke-width="2"/>
<path d="M6 6 Q25 11 46 6" stroke="#fff8d7" stroke-width="2" fill="none"/>
</g>'''


def grip(x, y, scale, color, outline):
    # Visible fingers on the bottle and handle, drawn after the prop. Designed
    # contact only, not a substitute for production hand-circle/box collision.
    return f'''<g id="visible-grip" transform="translate({x} {y}) scale({scale})" fill="{color}" stroke="{outline}" stroke-width="1.2" stroke-linecap="round">
<path d="M-3 25Q4 22 8 26L8 30Q1 33 -3 30Z"/>
<path d="M-3 33Q3 30 8 34L7 38Q1 40 -3 38Z"/>
<path d="M-2 41Q3 38 7 42L6 46Q0 48 -2 46Z"/>
<path d="M61 32Q69 27 71 31L71 35Q66 37 61 37Z"/>
<path d="M60 39Q68 35 71 39L70 43Q65 45 60 44Z"/>
</g>'''


def packets(x, y, colors, n=5, scale=1):
    parts = []
    for i in range(n):
        color = colors[i % len(colors)]
        parts.append(f'''<g transform="translate({x+i*35*scale} {y}) scale({scale})">
<path d="M0 0 L25 -2 29 36 2 38Z" fill="{color}"/>
<path d="M1 3 L24 1 M3 33 L26 31" fill="none" stroke="#fff0d3" stroke-width="2" opacity=".7"/>
<rect x="6" y="12" width="16" height="9" rx="2" fill="#fff0d3" opacity=".8"/>
</g>''')
    return ''.join(parts)


def pigment_patch(key, path, bounds, palette, seed, vertical=True):
    """Stable region-specific gouache strokes; no full-screen noise painting."""
    r = random.Random(seed)
    x0, y0, x1, y1 = bounds
    strokes = []
    for y in range(y0, y1, 9):
        for x in range(x0, x1, 8):
            px, py = x + r.uniform(-5, 5), y + r.uniform(-5, 5)
            length = r.uniform(12, 37)
            dx = r.uniform(-4, 7) if vertical else length
            dy = length if vertical else r.uniform(-3, 3)
            strokes.append(f'<path d="M{px:.1f} {py:.1f}q{dx*.45:.1f} {dy*.45:.1f} {dx:.1f} {dy:.1f}" fill="none" stroke="{r.choice(palette)}" stroke-width="{r.uniform(1.2,4):.1f}" stroke-linecap="round" opacity="{r.uniform(.1,.22):.2f}"/>')
    return f'<defs><clipPath id="{key}"><path d="{path}"/></clipPath></defs><g clip-path="url(#{key})">'+''.join(strokes)+'</g>'


def paper_cut():
    # Wide shopfront, left counter, right open window: shapes carry the story.
    env = '''<g id="background">
<rect width="1280" height="720" fill="#f2e5c9"/>
<path d="M0 0H900V455H0Z" fill="#e3bd87"/>
<path d="M900 0H1280V452H900Z" fill="#f4ead4"/>
<path d="M0 452H1280V720H0Z" fill="#d5c6a0"/>
<path d="M40 617 L1280 617 M178 452 L89 720 M461 452 L438 720 M920 452 L1045 720" stroke="#bcae8b" stroke-width="2" fill="none"/>
<path d="M958 78H1221V409H958Z" fill="#456e66"/>
<path d="M970 89H1209V398H970Z" fill="#b9cebd"/>
<path d="M970 234 Q1080 167 1209 207 V398H970Z" fill="#8cad9a"/>
<path d="M970 315 Q1080 253 1209 290 V398H970Z" fill="#608b78"/>
<path d="M1086 85V402 M963 211H1215" stroke="#eae1bd" stroke-width="9"/>
<path d="M0 55H900V126H0Z" fill="#ba533e"/>
</g>'''
    awning = '<g id="awning">'
    for i in range(12):
        x = i * 76
        fill = '#f4e5c8' if i % 2 else '#ae4436'
        awning += f'<path d="M{x} 122H{x+76}V159Q{x+38} 185 {x} 159Z" fill="{fill}"/>'
    awning += '</g>'
    shop = f'''<g id="shop-details">
<path d="M70 205 L390 198 392 276 67 283Z" fill="#f5e5c7" filter="url(#cut)"/>
{text(91,253,'青云小卖部',37,'#38584d',font_weight=700)}
{text(87,310,'热茶 · 点心 · 日常',16,'#725c43',family='Noto Sans CJK SC')}
<path d="M38 338H405V352H38Z M38 416H405V430H38Z" fill="#796047"/>
{packets(59,368,['#e5a542','#bb6450','#679285','#c38e55'],8)}
<path d="M57 332 Q61 316 79 317 L115 314 119 338H55Z" fill="#93603b"/>
<path d="M59 320 Q72 295 82 322 M82 320 Q97 288 103 319" stroke="#deb37b" stroke-width="5" fill="none"/>
<ellipse cx="354" cy="320" rx="31" ry="23" fill="#e6d1a0"/>
<path d="M327 322 Q357 290 379 322 M340 337 L346 303 M355 338 L361 302" fill="none" stroke="#c5a66e" stroke-width="3"/>
</g>'''
    counter = '''<g id="counter" filter="url(#cut)">
<path d="M0 440L431 435 470 462 0 478Z" fill="#f1d2a0"/>
<path d="M0 478L470 462V610L0 638Z" fill="#c08050"/>
<path d="M0 485L470 469V488L0 505Z" fill="#945e3c"/>
<path d="M35 512L431 498V586L35 613Z" fill="#d9a66a"/>
<path d="M56 535L408 523 M58 583L408 561" stroke="#b98451" stroke-width="3" fill="none"/>
<path d="M82 509V608 M368 502V585" stroke="#c28b56" stroke-width="2"/>
</g>'''
    lin = '''<g id="lin" filter="url(#cut)">
<path d="M466 604 Q508 584 548 607 L562 619 468 625Z" fill="#b1a781"/>
<path d="M505 486 L545 486 544 578 516 583Z" fill="#263f43"/>
<path d="M465 477 L504 483 490 579 463 575Z" fill="#38565a"/>
<path d="M462 569 L491 571 501 590 Q472 607 443 596 L445 585Z" fill="#263f43"/>
<path d="M516 575 L542 572 563 588 Q568 600 531 598 L514 589Z" fill="#263f43"/>
<path d="M458 329 Q476 310 508 315 L544 325 550 481 Q512 510 458 485 L449 413Z" fill="#366f6b"/>
<path d="M501 320 L515 339 504 376 486 337Z" fill="#f2d8ae"/>
<path d="M494 351 Q511 383 542 398 L547 478 520 490 516 404Z" fill="#245957"/>
<path d="M461 402 L490 455 499 489" fill="none" stroke="#75a096" stroke-width="4"/>
<path d="M455 333 Q438 341 436 367 L432 435 456 441 479 349Z" fill="#43857c"/>
<path d="M433 430 Q427 468 438 478 L452 469 456 436Z" fill="#db9e75"/>
<path d="M529 326 Q555 321 572 351 L590 378 563 396 526 361Z" fill="#43857c"/>
<path d="M566 383 Q585 378 604 390 L649 396 650 413 599 414 Q580 413 565 399Z" fill="#e3ab82"/>
<path d="M640 395 Q652 388 661 392 L668 399 666 414 649 417 639 411Z" fill="#e3ab82"/>
<path d="M644 403L665 404 M647 409L664 410" fill="none" stroke="#b77756" stroke-width="1.5"/>
<path d="M490 290L514 293 516 326 Q499 344 485 323Z" fill="#d49770"/>
<path d="M460 255 Q456 220 491 211 Q529 206 544 242 L543 268 555 277 542 285 Q532 312 507 315 L476 302Z" fill="#e3ab82"/>
<path d="M458 269 Q441 230 463 207 Q493 190 525 208 L541 231 510 223 500 245 484 232 475 275Z" fill="#263d3d"/>
<path d="M448 236 Q427 220 434 200 Q453 190 464 211Z" fill="#263d3d"/>
<path d="M477 268 Q464 251 461 267 Q457 282 477 282Z" fill="#d49770"/>
<path d="M516 256 Q527 251 535 257" stroke="#263d3d" stroke-width="3" fill="none"/>
<ellipse cx="530" cy="261" rx="3" ry="4" fill="#263d3d"/>
<path d="M532 289 Q541 288 544 284" fill="none" stroke="#ad644c" stroke-width="2.5"/>
<path d="M474 227L483 216 M489 220L500 214" stroke="#4a5b53" stroke-width="3"/>
</g>'''
    awei = '''<g id="awei" filter="url(#cut)">
<ellipse cx="853" cy="615" rx="75" ry="13" fill="#b1a781"/>
<path d="M836 487L866 488 871 586 843 588Z" fill="#56665b"/>
<path d="M875 485L908 480 919 579 891 592Z" fill="#40564d"/>
<path d="M842 580L870 579 883 602 832 606 827 595Z" fill="#36463f"/>
<path d="M890 579L918 574 948 594Q945 607 899 604Z" fill="#36463f"/>
<path d="M814 332 Q833 315 867 318 L901 324 Q930 363 930 444 L917 502 Q861 528 812 501 L800 414Z" fill="#d7a143"/>
<path d="M849 322L860 347 877 334 890 326 872 369 850 363Z" fill="#f4e4bb"/>
<path d="M905 366 Q906 427 911 482 L917 502 893 507 887 427Z" fill="#bc8232"/>
<path d="M814 332 Q792 334 777 368 L754 407 779 423 818 370Z" fill="#e5b254"/>
<path d="M757 404L729 410 701 402 692 416 725 434 Q744 438 775 420Z" fill="#dc9c74"/>
<path d="M709 404 Q697 395 689 399 L677 409 682 420 697 422 713 416Z" fill="#dc9c74"/>
<path d="M688 405L681 416 M694 408L687 420" stroke="#ad7355" stroke-width="1.5"/>
<path d="M910 333Q935 340 941 374L946 452 920 456 902 372Z" fill="#dbad50"/>
<path d="M923 450L943 449Q949 478 937 490L921 481Z" fill="#dc9c74"/>
<path d="M849 289L876 293 881 327Q864 342 845 325Z" fill="#ca8b64"/>
<path d="M823 252 Q824 211 863 211 Q905 209 918 251 L913 281 Q894 313 862 310 L833 296 824 276 813 272Z" fill="#e6b084"/>
<path d="M822 256Q809 220 832 203L849 197 857 203 872 196 886 206 903 209 915 228 921 252 899 246 892 233 878 246 864 230 850 246 836 239Z" fill="#4b473b"/>
<path d="M902 263Q919 246 921 267Q918 285 904 284Z" fill="#d59b73"/>
<path d="M829 258Q839 253 848 259" fill="none" stroke="#4b473b" stroke-width="3"/>
<ellipse cx="835" cy="264" rx="3" ry="4" fill="#4b473b"/>
<path d="M826 281L834 283" fill="none" stroke="#b87b55" stroke-width="2"/>
<path d="M837 291Q849 302 862 293" fill="none" stroke="#a46049" stroke-width="3"/>
<path d="M829 365L840 480 M872 389V485" fill="none" stroke="#f0c66a" stroke-width="3"/>
<path d="M868 381H904V411Q884 426 868 411Z" fill="#cc933a"/>
</g>'''
    foreground = '''<g id="foreground">
<path d="M1107 482 L1246 475 1261 503 1102 510Z" fill="#bc8056"/>
<path d="M1111 507 L1124 625 1140 626 1134 506 M1224 502 L1226 625 1241 625 1245 500" fill="#8b654a"/>
<path d="M1181 432Q1190 396 1183 366" stroke="#537760" stroke-width="5" fill="none"/>
<path d="M1185 407Q1150 386 1160 367Q1191 364 1185 407 M1188 390Q1215 364 1224 381Q1224 404 1188 407" fill="#6f936c"/>
<path d="M1157 432H1208L1201 477 1167 479Z" fill="#b95c42"/>
</g>'''
    return svg('A · 纸雕小卖部', DEFS, env+awning+shop+counter+lin+awei+cup(648,378,.86)+grip(648,378,.86,'#e3ab82','#b77756')+foreground+grain()+caption('#fff8e9','#64715d'))


def story_frame():
    # Oblique interior and diagonal daylight, finer contours and natural proportions.
    env = '''<g id="background">
<rect width="1280" height="720" fill="url(#warmWall)"/>
<path d="M0 0L390 72V428L0 507Z" fill="#d5bc99"/>
<path d="M390 72H1280V427H390Z" fill="#eddbb8"/>
<path d="M0 507L390 427H1280V720H0Z" fill="#bb9e79"/>
<path d="M0 578L664 427 M0 694L922 427 M224 720L979 427 M672 720L1112 427 M1090 720L1256 427" fill="none" stroke="#a88b6c" stroke-width="1.5"/>
<path d="M36 132L299 159V411L36 458Z" fill="#6c8274"/>
<path d="M47 144L288 168V400L47 441Z" fill="url(#sky)"/>
<path d="M47 321Q114 246 177 299Q227 253 288 291V400L47 441Z" fill="#93ae8e"/>
<path d="M47 371Q178 319 288 341V400L47 441Z" fill="#6e947a"/>
<path d="M164 154V421 M41 287L293 286" stroke="#e6d7ad" stroke-width="9"/>
<path d="M43 442L301 400 312 409 36 461Z" fill="#f5e6bd"/>
<path d="M44 278L178 291 760 632 365 666Z" fill="#fff0c2" opacity=".18"/>
<path d="M170 156L287 170 826 590 710 625Z" fill="#ffecc1" opacity=".16"/>
<path d="M824 113H1217V385H824Z" fill="#9e7455"/>
<path d="M836 125H1204V370H836Z" fill="#bd9573"/>
<path d="M834 202H1207 M834 280H1207 M941 125V371 M1081 125V371" stroke="#89664d" stroke-width="8"/>
</g>'''
    detail = f'''<g id="shop-details">
<path d="M476 117H711V177H476Z" fill="#4c6355" stroke="#b19d78" stroke-width="3"/>
{text(499,158,'青云小卖部',28,'#fff1cc',font_weight=600)}
<path d="M457 192H720V201H457Z" fill="#b4946c"/>
<path d="M1009 0V77" stroke="#79684f" stroke-width="3"/>
<path d="M972 79Q1009 26 1047 79Z" fill="#62786b"/>
<ellipse cx="1009" cy="79" rx="37" ry="5" fill="#dbba79"/>
{packets(849,157,['#d3c390','#c47d58','#748c70'],3,.9)}
{packets(1098,235,['#e9d6a8','#ac6d51','#c29c5b'],3,.85)}
{packets(848,307,['#a2684f','#7f9580','#d4ad68'],5,.9)}
<g fill="#e5d5b1" stroke="#a78a61" stroke-width="2">
<path d="M969 151H993L998 193H963Z"/><path d="M1001 157H1022L1027 193H997Z"/>
<ellipse cx="1154" cy="173" rx="27" ry="18"/>
<path d="M1098 330Q1147 312 1196 330L1193 356H1101Z"/>
</g>
<path d="M872 238Q880 216 891 238 M900 239Q908 216 919 239" fill="none" stroke="#caaf7e" stroke-width="12"/>
<path d="M873 352L882 331 M891 353L900 330 M908 351L917 329" stroke="#84614b" stroke-width="2"/>
</g>'''
    counter = '''<g id="counter">
<path d="M16 464L368 386 430 411 48 510Z" fill="#dfc192" stroke="#9c7957" stroke-width="2"/>
<path d="M48 510L430 411V540L48 655Z" fill="#9f7653"/>
<path d="M48 510L430 411V427L48 529Z" fill="#6e5945"/>
<path d="M76 536L395 451V526L76 619Z" fill="#b58b5e" stroke="#86684b" stroke-width="2"/>
<path d="M158 515V595 M270 483V562" stroke="#86684b" stroke-width="2"/>
<path d="M118 442Q143 431 171 437L164 452 128 462Z" fill="#f0dfb5"/>
<path d="M130 442Q133 420 150 423Q165 424 164 439Z" fill="#e3b971"/>
<path d="M206 405V365Q215 350 228 365V400Z" fill="#95744d"/>
<path d="M207 374L229 369" stroke="#f0dfb5" stroke-width="5"/>
</g>'''
    shadows = '''<g id="cast-shadows" fill="#617767" opacity=".2">
<path d="M480 609L570 600 840 715H739Z"/><path d="M794 617L901 611 1152 720H998Z"/>
</g>'''
    lin = '''<g id="lin" stroke="#424e46" stroke-linejoin="round" stroke-linecap="round">
<path d="M465 492L506 496 495 583 475 588 454 553Z" fill="#41555b" stroke-width="2"/>
<path d="M506 498L542 493 553 589 529 593 515 559Z" fill="#33464e" stroke-width="2"/>
<path d="M469 578L494 577 499 596Q475 610 447 605L447 594Z" fill="#3c403a" stroke-width="2"/>
<path d="M530 583L550 583 573 602Q565 612 532 608L526 600Z" fill="#3c403a" stroke-width="2"/>
<path d="M473 291Q491 279 516 288Q537 295 543 306Q538 366 538 427L556 508Q523 523 498 509Q471 512 453 502L466 388Q457 324 473 291Z" fill="#477c7b" stroke-width="2.5"/>
<path d="M479 289L494 312 515 289 530 304 505 362 480 351Z" fill="#eadcbb" stroke-width="1.5"/>
<path d="M502 348L526 313 536 405 519 452 531 516 501 510Z" fill="#355f63" stroke="none"/>
<path d="M455 423Q488 435 540 424L544 443Q499 453 457 440Z" fill="#cfb581" stroke-width="1.2"/>
<path d="M506 443L518 502 530 498 518 442" fill="#cfb581" stroke-width="1.2"/>
<path d="M468 294Q447 299 443 336L432 409 452 415 483 325Z" fill="#587f7a" stroke-width="2"/>
<path d="M431 405L451 408 449 445 439 466Q431 472 425 463L421 451Z" fill="#dcb18b" stroke-width="1.7"/>
<path d="M438 433L436 453 M433 437L431 454" fill="none" stroke="#a9846c" stroke-width="1"/>
<path d="M530 300Q553 302 567 332Q578 353 594 373L569 391Q549 382 536 360L523 331Z" fill="#648f82" stroke-width="2"/>
<path d="M574 382Q590 379 609 386Q630 391 649 388L652 406Q628 411 609 407Q590 409 577 400Z" fill="#e8bf96" stroke-width="1.5"/>
<path d="M579 397Q614 411 646 402" fill="none" stroke="#c99571" stroke-width="2" opacity=".6"/>
<path d="M642 387L657 383Q669 388 671 397L664 410 645 408Z" fill="#e8bf96" stroke-width="1.4"/>
<path d="M648 394L668 395 M649 400L665 401" fill="none" stroke="#ad8062" stroke-width="1"/>
<path d="M486 262L508 261 511 291 495 312 480 289Z" fill="#c79878" stroke-width="1.5"/>
<path d="M464 223Q463 188 489 183Q520 179 534 211L532 239 542 247 531 252Q525 274 508 281L485 275 473 259Z" fill="#e4b993" stroke-width="2"/>
<path d="M471 226Q450 213 455 194Q459 170 483 166Q507 159 526 179Q537 192 534 214Q524 212 520 200Q519 188 516 188Q505 204 489 203L483 196Q479 216 478 230Z" fill="#344545" stroke-width="2"/>
<path d="M458 188Q439 183 440 172Q441 158 460 162L472 174" fill="#344545" stroke-width="2"/>
<path d="M474 170L492 181 M480 177L513 184" fill="none" stroke="#59615a" stroke-width="1.5"/>
<path d="M476 235Q465 222 462 235Q462 247 476 249" fill="#d5a782" stroke-width="1"/>
<path d="M509 219Q517 213 525 219 M510 224Q518 220 525 224" fill="none" stroke-width="1.8"/>
<path d="M510 225Q518 220 526 225Q519 232 511 228Z" fill="#f6edce" stroke-width=".8"/>
<ellipse cx="521" cy="225" rx="2.3" ry="3" fill="#344545" stroke="none"/>
<circle cx="521.7" cy="224" r=".7" fill="#f6edce" stroke="none"/>
<path d="M479 245Q483 264 503 268" fill="none" stroke="#bf8a6a" stroke-width="2" opacity=".45"/>
<path d="M525 241L533 243 M514 259Q522 262 527 256" fill="none" stroke="#9f6654" stroke-width="1.5"/>
<path d="M479 252Q484 259 493 263" fill="none" stroke="#d19b78" stroke-width="2"/>
<path d="M481 461L472 493 M488 458L486 494 M532 460L539 503" fill="none" stroke="#80a097" stroke-width="1.5"/>
</g>'''
    awei = '''<g id="awei" stroke="#594f40" stroke-linejoin="round" stroke-linecap="round">
<path d="M821 477L853 480 852 575 829 591 814 581Z" fill="#67735e" stroke-width="2"/>
<path d="M855 479L892 470 907 576 883 590 864 559Z" fill="#4f6051" stroke-width="2"/>
<path d="M828 581L851 578 863 601Q846 617 813 610L812 600Z" fill="#594e3f" stroke-width="2"/>
<path d="M883 582L905 575 931 597Q938 611 898 611L884 602Z" fill="#594e3f" stroke-width="2"/>
<path d="M804 304Q825 289 853 290L882 298Q911 323 914 373Q910 432 902 484Q866 501 816 489Q799 454 793 408Q789 343 804 304Z" fill="#c6a260" stroke-width="2.5"/>
<path d="M834 293L844 320 858 301 875 297 864 349 840 343Z" fill="#f3e6c5" stroke-width="1.5"/>
<path d="M865 344L885 310 899 379 891 468 902 484 879 490 865 413Z" fill="#ad8b50" stroke="none"/>
<path d="M802 302Q782 310 769 342Q759 366 742 387L762 404Q790 388 799 365L818 326Z" fill="#d2af6e" stroke-width="2"/>
<path d="M745 385Q735 395 724 402Q709 403 697 391L687 405Q703 418 720 425Q730 429 743 421L761 402Z" fill="#ddb38a" stroke-width="1.5"/>
<path d="M719 420Q738 427 757 403" fill="none" stroke="#b78f69" stroke-width="1.7" opacity=".6"/>
<path d="M696 393Q685 386 680 388L668 399 673 410 689 411 702 404Z" fill="#ddb38a" stroke-width="1.4"/>
<path d="M680 394L674 405 M685 397L679 409" fill="none" stroke="#aa7b5d" stroke-width="1"/>
<path d="M884 306Q912 309 921 346L928 425 908 431 887 357Z" fill="#cfac69" stroke-width="2"/>
<path d="M909 425L927 423 931 453 924 474 910 468 905 447Z" fill="#ddb38a" stroke-width="1.5"/>
<path d="M914 447L914 464 M920 450L920 467" fill="none" stroke="#aa7b5d" stroke-width="1"/>
<path d="M834 261L858 263 862 298 846 318 830 294Z" fill="#c99573" stroke-width="1.5"/>
<path d="M814 220Q817 185 846 184Q879 182 893 216L890 243Q873 277 850 279L827 270 816 253 806 248Z" fill="#e9bf95" stroke-width="2"/>
<path d="M814 228Q801 210 810 193Q816 180 831 176Q840 165 850 176Q860 169 870 182Q887 185 892 205Q898 220 892 234Q881 232 876 216L870 201Q864 212 856 211L846 203Q837 219 831 216L823 207Q820 224 814 228Z" fill="#4c4e43" stroke-width="2"/>
<path d="M885 236Q899 224 899 239Q896 251 885 254" fill="#daa77e" stroke-width="1.2"/>
<path d="M818 227Q827 223 835 227 M817 232Q825 228 833 232" fill="none" stroke-width="1.8"/>
<path d="M816 232Q825 227 835 232Q827 239 818 236Z" fill="#f6edce" stroke-width=".8"/>
<ellipse cx="822" cy="233" rx="2.4" ry="3" fill="#454d42" stroke="none"/>
<circle cx="822.7" cy="232" r=".7" fill="#f6edce" stroke="none"/>
<path d="M884 246Q882 263 864 270" fill="none" stroke="#c4916b" stroke-width="2" opacity=".45"/>
<path d="M816 249L824 250 M826 262Q838 269 849 260" fill="none" stroke="#a26c53" stroke-width="1.6"/>
<path d="M884 259Q876 268 867 270" fill="none" stroke="#d09b75" stroke-width="2"/>
<path d="M823 360L819 472 M846 355L849 478" fill="none" stroke="#e3c589" stroke-width="1.5"/>
<path d="M861 364H890V399Q875 409 861 399Z" fill="#bc9654" stroke-width="1"/>
<path d="M842 354V453" stroke-width="1.2"/>
<circle cx="842" cy="368" r="2" fill="#6a6047"/><circle cx="843" cy="404" r="2" fill="#6a6047"/>
</g>'''
    front = '''<g id="foreground">
<path d="M1020 467L1280 503V521L1012 482Z" fill="#caa575" stroke="#8e7355" stroke-width="2"/>
<path d="M1022 482L1036 625 1051 626 1040 486 M1238 516L1248 644 1265 646 1257 519" fill="#84684c"/>
<ellipse cx="1140" cy="487" rx="43" ry="11" fill="#8a7557" opacity=".28"/>
<path d="M1111 451Q1137 442 1160 456L1155 486Q1134 496 1118 481Z" fill="#ad6950" stroke="#815541" stroke-width="2"/>
<path d="M1136 450L1140 401" fill="none" stroke="#5b7758" stroke-width="3"/>
<path d="M1137 434Q1099 418 1115 405Q1139 409 1140 430 M1140 414Q1156 384 1170 397Q1177 411 1140 429" fill="#6a875e"/>
</g>'''
    return svg('B · 午后叙事插画', DEFS, env+detail+counter+shadows+lin+awei+cup(645,367,.82)+grip(645,367,.82,'#e8bf96','#ad8062')+front+grain('.035')+caption('#fff7e4','#655d49'))


def ink_gouache():
    # Courtyard pavilion, more negative space; irregular architecture and brush marks.
    env = '''<g id="background">
<rect width="1280" height="720" fill="#efe9d8"/>
<path d="M0 338Q105 262 233 289Q350 319 426 257Q480 239 547 259L526 461H0Z" fill="#c7d0c0" opacity=".5"/>
<path d="M977 255Q1102 206 1280 246V461H968Z" fill="#d3d4bf" opacity=".4"/>
<path d="M0 487Q408 429 737 459Q1001 489 1280 458V720H0Z" fill="#e0d7bd"/>
<path d="M0 588Q352 537 654 561 M202 720L489 463 M600 720L705 460 M1096 720L920 475" fill="none" stroke="#b9bca9" stroke-width="1.2"/>
<path d="M62 178L150 103 430 104 531 194 402 185 131 181Z" fill="#3a5355"/>
<path d="M72 174L154 126 435 130 515 192" fill="none" stroke="#7b8980" stroke-width="4"/>
<path d="M49 181Q189 198 534 197L534 208Q299 214 49 192Z" fill="#254449"/>
<path d="M93 207L125 205 125 481 94 487Z" fill="#7d7965"/>
<path d="M453 207L478 209 478 462 451 468Z" fill="#7d7965"/>
<path d="M126 219L452 221 452 403 127 433Z" fill="#dfd4b3"/>
<path d="M151 288L420 281V397L151 414Z" fill="#9a9880"/>
<path d="M163 299L407 294V386L164 402Z" fill="#b2b29c"/>
<path d="M156 350L415 339 M243 295L244 397 M331 291L331 391" fill="none" stroke="#797f6c" stroke-width="3"/>
<g id="counter">
<path d="M41 435L478 397 495 413 29 457Z" fill="#ac9f7c"/>
<path d="M36 455L491 416 488 524 39 578Z" fill="#8b8f79"/>
<path d="M59 470L468 434 M69 553L465 509 M145 462L147 546 M380 442L383 518" stroke="#6c7869" stroke-width="2" fill="none"/>
<path d="M31 454L500 414" fill="none" stroke="#435d55" stroke-width="5"/>
</g></g>'''
    strokes = []
    for i in range(22):
        x=113+i*15
        strokes.append(f'<path d="M{x} 139L{x+29} 181" stroke="#bdc2af" stroke-width="1.5" opacity=".4"/>')
    trees = '''<g id="bamboo" stroke="#789083" fill="none">
<path d="M1127 589Q1116 327 1140 88 M1159 548Q1189 300 1173 64 M1200 499Q1213 288 1243 157" stroke-width="4"/>
<path d="M1125 325L1091 265 M1130 218L1167 153 M1176 193L1214 115 M1180 302L1228 259 M1168 396L1123 358" stroke-width="2"/>
</g>'''
    r=random.Random(19)
    for cx,cy in [(1091,265),(1167,153),(1214,115),(1228,259),(1123,358)]:
        for k in range(10):
            x=cx+r.uniform(-30,30);y=cy+r.uniform(-24,24);dx=r.uniform(-42,42);dy=r.uniform(-40,13)
            color=r.choice(['#4e7567','#76907d','#a0ad92','#365f59'])
            trees += f'<path d="M{x:.1f} {y:.1f}Q{x+dx*.4:.1f} {y+dy-8:.1f} {x+dx:.1f} {y+dy:.1f}Q{x+dx*.4:.1f} {y+dy+8:.1f} {x:.1f} {y:.1f}" fill="{color}" opacity=".72"/>'
    detail = f'''<g id="shop-details">
<path d="M183 228L380 227 379 272 184 278Z" fill="#eee5ce" stroke="#7c7d68" stroke-width="1"/>
{text(205,261,'青云小卖部',25,'#3e5750',font_weight=600)}
{packets(178,366,['#a17b59','#b3a578','#637f6e'],5,.65)}
<path d="M385 343Q403 335 421 341L426 383 383 389Z" fill="#a06a4f"/>
<path d="M390 344Q402 348 420 341" stroke="#d4b181" stroke-width="2" fill="none"/>
<path d="M99 491L111 555 M463 434L468 501" stroke="#bfba99" stroke-width="3" opacity=".6"/>
</g>'''
    lin = '''<g id="lin" filter="url(#wash)" stroke="#35534f" stroke-linejoin="round" stroke-linecap="round">
<path d="M513 518L540 519 534 586 514 599 500 581Z" fill="#526762" stroke-width="1.5"/>
<path d="M552 514L578 508 586 580 565 596 553 569Z" fill="#3e5754" stroke-width="1.5"/>
<path d="M507 583L533 581 539 603 494 608 488 600Z M565 582L585 578 606 594 603 602 565 604Z" fill="#344e4b" stroke-width="2"/>
<path d="M510 303Q529 289 549 298Q567 302 574 315Q574 369 575 411Q583 480 604 549L601 568Q552 590 479 568Q497 487 504 423Q482 350 493 344Z" fill="#536e80" stroke-width="2.2"/>
<path d="M510 450Q502 506 491 553L507 566Q522 519 526 472" fill="#789197" stroke="none" opacity=".6"/>
<path d="M520 301L536 327 552 301 565 315 539 389 514 361Z" fill="#eee5cf" stroke-width="1.3"/>
<path d="M545 371L567 321Q569 365 570 412L596 558 565 574Q551 505 548 445Z" fill="#3f596b" stroke="none"/>
<path d="M502 424Q548 435 577 420L581 438 504 442Z" fill="#b49d6e" stroke-width="1.5"/>
<path d="M547 438L559 499 551 511 536 443Z" fill="#b49d6e" stroke-width="1"/>
<path d="M502 308Q478 317 479 353Q474 394 458 430L490 439Q509 386 517 339Z" fill="#7d959d" stroke-width="1.8"/>
<path d="M481 362Q479 391 473 418" stroke="#c4c9bb" stroke-width="1.2" fill="none"/>
<path d="M469 424L489 430 484 457 473 476 463 469 460 451Z" fill="#d2b18d" stroke-width="1"/>
<path d="M565 312Q587 307 607 339Q622 358 634 373L604 395Q584 380 579 359Z" fill="#849da2" stroke-width="1.8"/>
<path d="M595 338Q605 357 619 372" fill="none" stroke="#c4c9bb" stroke-width="1.2"/>
<path d="M608 376Q628 374 642 382L677 382 679 399 645 402 611 392Z" fill="#dec09a" stroke-width="1.2"/>
<path d="M669 382Q682 374 690 381L695 393 688 403 674 402Z" fill="#dec09a" stroke-width="1"/>
<path d="M675 389L693 391 M677 395L690 397" fill="none" stroke="#a5896e" stroke-width=".8"/>
<path d="M523 273L544 275 548 303 535 327 516 302Z" fill="#bda081" stroke-width="1"/>
<path d="M501 239Q500 203 525 197Q554 192 568 223L568 249 578 257 566 264Q553 286 535 287L513 278Z" fill="#d8b995" stroke-width="1.8"/>
<path d="M501 244Q485 218 496 200Q512 180 539 186Q565 191 573 218L568 234 550 211 534 217 518 210 512 249Z" fill="#375451" stroke-width="1.8"/>
<path d="M499 207Q476 204 480 185Q495 172 510 190Z" fill="#375451" stroke-width="1.5"/>
<path d="M508 205L532 197 M515 209L548 204" stroke="#6d8175" stroke-width="1.3" fill="none"/>
<path d="M510 254Q497 242 497 255Q497 266 511 268" fill="#c4a581" stroke-width=".9"/>
<path d="M544 239Q554 234 562 239" fill="none" stroke-width="1.7"/>
<ellipse cx="558" cy="243" rx="2.1" ry="3" fill="#35534f" stroke="none"/>
<path d="M559 261L567 259 M548 274Q557 276 562 270" fill="none" stroke="#946d59" stroke-width="1.3"/>
<path d="M516 458Q515 502 501 552 M527 470Q534 527 529 571 M572 458Q580 514 593 552 M541 487Q545 542 553 573" fill="none" stroke="#b1baa9" stroke-width="1.4"/>
<path d="M504 553Q538 570 588 556" fill="none" stroke="#304e5e" stroke-width="1.8"/>
</g>'''
    awei = '''<g id="awei" filter="url(#wash)" stroke="#635b47" stroke-linejoin="round" stroke-linecap="round">
<path d="M834 479L867 479 864 583 846 600 824 589Z" fill="#7c8070" stroke-width="1.5"/>
<path d="M878 477L905 474 920 579 896 594 884 559Z" fill="#606e62" stroke-width="1.5"/>
<path d="M842 585L864 582 873 602 830 614 823 602Z M896 582L919 578 942 600 937 608 900 607Z" fill="#4c5b51" stroke-width="1.5"/>
<path d="M818 313Q836 299 864 303Q888 299 900 317Q926 345 923 385Q930 445 913 496Q864 519 801 497Q813 458 802 396Q789 346 818 313Z" fill="#b97c65" stroke-width="2"/>
<path d="M842 304L856 331 871 308 887 313 873 356 847 348Z" fill="#eee0c6" stroke-width="1"/>
<path d="M884 341L905 325Q914 354 913 382L906 469 912 496 891 504Q878 468 878 428Z" fill="#986654" stroke="none"/>
<path d="M820 318Q798 313 785 342Q768 368 751 385L781 409Q809 385 817 365L836 336Z" fill="#c8947c" stroke-width="1.5"/>
<path d="M759 381L736 398 709 390 702 405 730 420Q740 426 751 418L774 401Z" fill="#d7b490" stroke-width="1.2"/>
<path d="M712 391Q701 382 695 387L685 398 690 410 707 409 718 402Z" fill="#d7b490" stroke-width="1"/>
<path d="M697 391L690 404 M702 394L696 407" stroke="#a18365" stroke-width=".8" fill="none"/>
<path d="M895 315Q925 319 932 354Q937 400 952 440L920 449Q916 395 900 369Z" fill="#c8947c" stroke-width="1.5"/>
<path d="M925 431L944 428 951 458 939 475 926 467Z" fill="#d7b490" stroke-width="1"/>
<path d="M842 278L865 278 870 310 855 330 837 307Z" fill="#be9c79" stroke-width="1"/>
<path d="M822 242Q825 209 854 205Q886 204 902 238L899 265Q883 292 862 295L837 286 823 268 814 261Z" fill="#dbba95" stroke-width="1.8"/>
<path d="M821 248Q810 224 827 207L842 197 852 203 863 196 876 205 894 215 904 236 899 253 885 245 876 224 861 233 850 225 838 240 828 232Z" fill="#505c50" stroke-width="1.5"/>
<path d="M891 254Q908 244 907 258Q903 270 891 272" fill="#c7a480" stroke-width=".9"/>
<path d="M827 247Q835 243 843 247" fill="none" stroke-width="1.7"/>
<ellipse cx="831" cy="252" rx="2.2" ry="3" fill="#43584d" stroke="none"/>
<path d="M824 267L834 267 M837 279Q848 287 861 278" fill="none" stroke="#98735a" stroke-width="1.3"/>
<path d="M834 361L829 474 M856 357L861 484 M899 420L897 474" fill="none" stroke="#dbbb90" stroke-width="1.3"/>
<path d="M872 367H899V398Q885 408 872 400Z" fill="#b0865e" stroke-width="1"/>
</g>'''
    foreground = '''<g id="foreground">
<path d="M1071 539Q1126 526 1187 539L1174 557 1086 557Z" fill="#9b8461"/>
<path d="M1088 553L1083 643 M1164 551L1177 636" stroke="#7e7961" stroke-width="8"/>
<path d="M-20 654Q75 610 132 653Q171 628 214 665L218 720H0Z" fill="#97a58a" opacity=".6"/>
<path d="M1120 719Q1103 666 1119 647 M1111 687Q1088 672 1079 650 M1116 674Q1141 655 1145 635" fill="none" stroke="#7d8c71" stroke-width="2"/>
</g>'''
    # Small deliberately irregular pigment marks, limited to architecture and ground.
    marks=[]
    r=random.Random(27)
    for i in range(260):
        x=r.uniform(45,478);y=r.uniform(447,549)
        if y<457-(x-45)*.08:continue
        marks.append(f'<path d="M{x:.1f} {y:.1f}l{r.uniform(3,13):.1f} {r.uniform(-2,2):.1f}" stroke="#d2c4a0" stroke-width="{r.uniform(.5,1.5):.1f}" opacity=".18"/>')
    robe = 'M510 303Q529 289 549 298Q567 302 574 315Q574 369 575 411Q583 480 604 549L601 568Q552 590 479 568Q497 487 504 423Q482 350 493 344Z'
    jacket = 'M818 313Q836 299 864 303Q888 299 900 317Q926 345 923 385Q930 445 913 496Q864 519 801 497Q813 458 802 396Q789 346 818 313Z'
    robe_marks = pigment_patch('robe-pigment',robe,(479,310,607,575),['#91a8ab','#bbc6b6','#2d5063','#678b95'],37)
    jacket_marks = pigment_patch('jacket-pigment',jacket,(800,315,925,506),['#e1b596','#d29b7c','#82594d','#bf8168'],38)
    # Put pigment after base paint, before the silhouette's shadow, seams and face.
    lin = lin.replace('fill="#536e80" stroke-width="2.2"/>', 'fill="#536e80" stroke-width="2.2"/>'+robe_marks)
    awei = awei.replace('fill="#b97c65" stroke-width="2"/>', 'fill="#b97c65" stroke-width="2"/>'+jacket_marks)
    roof = 'M62 178L150 103 430 104 531 194 402 185 131 181Z'
    roof_marks = pigment_patch('roof-pigment',roof,(62,103,532,195),['#87968a','#28464d','#b0b5a0'],39,False)
    env = env.replace('fill="#3a5355"/>', 'fill="#3a5355"/>'+roof_marks)
    return svg('C · 墨彩校园', DEFS, env+''.join(strokes)+trees+detail+''.join(marks)+lin+awei+cup(672,365,.78,True)+grip(672,365,.78,'#dec09a','#a5896e')+foreground+grain('.04')+caption('#fff9e9','#6e796b'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out', type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for name, build in [('a-paper-cut',paper_cut),('b-story-frame',story_frame),('c-ink-gouache',ink_gouache)]:
        p=args.out/f'{name}.svg'
        p.write_text(build(),encoding='utf-8')
        print(p)


if __name__ == '__main__':
    main()
