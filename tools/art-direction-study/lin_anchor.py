#!/usr/bin/env python3
"""Whole-character B identity studies only, before parts/rig approval.

Not a production renderer, rig, motor or viseme implementation.
Usage: python3 tools/art-direction-study/lin_anchor.py /tmp/<anchor>/svg
"""
import argparse
from pathlib import Path
from xml.sax.saxutils import escape

INK='#424e46'
SKIN='#e4b993'
HAIR='#344545'


def label(x,y,value,size=20,color='#3b514c'):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-family="Noto Sans CJK SC">{escape(value)}</text>'


def eyes(view,expression):
    if view=='back':return ''
    pairs=[(128,88,10),(162,88,10)] if view=='front' else [(147,88,10),(176,88,6)] if view=='quarter' else [(175,88,9)]
    out=[]
    for x,y,w in pairs:
        if expression=='surprise':
            out.append(f'<ellipse cx="{x}" cy="{y}" rx="{w*.75}" ry="7" fill="#f6edce" stroke="{INK}" stroke-width="1.4"/>')
            out.append(f'<circle cx="{x+1}" cy="{y+1}" r="3.3" fill="{HAIR}"/>')
            out.append(f'<path d="M{x-w} {y-16}Q{x} {y-23} {x+w} {y-16}" fill="none" stroke="{INK}" stroke-width="2"/>')
        elif expression=='skeptical':
            out.append(f'<path d="M{x-w} {y-1}Q{x} {y+4} {x+w} {y-1}M{x-w} {y-4}L{x+w} {y-3}" fill="none" stroke="{INK}" stroke-width="1.8"/>')
            out.append(f'<path d="M{x-w} {y-13}L{x+w} {y-10}" fill="none" stroke="{INK}" stroke-width="2"/>')
        else:
            out.append(f'<path d="M{x-w} {y}Q{x} {y-7} {x+w} {y}Q{x+1} {y+6} {x-w} {y+2}Z" fill="#f6edce" stroke="{INK}" stroke-width="1.2"/>')
            out.append(f'<ellipse cx="{x+2}" cy="{y}" rx="3" ry="3.8" fill="{HAIR}"/><circle cx="{x+3}" cy="{y-1}" r=".8" fill="#f6edce"/>')
            out.append(f'<path d="M{x-w} {y-11}Q{x} {y-16} {x+w} {y-11}" fill="none" stroke="{INK}" stroke-width="2"/>')
    return ''.join(out)


def mouth(view,expression):
    if view=='back':return ''
    x,y=(146,121) if view=='front' else (167,121) if view=='quarter' else (181,121)
    if expression=='speaking':
        return f'<path d="M{x-7} {y-2}Q{x} {y-5} {x+7} {y-2}L{x+5} {y+6}Q{x} {y+9} {x-5} {y+6}Z" fill="#755b53" stroke="#9f6654" stroke-width="1.2"/><path d="M{x-5} {y-1}H{x+5}" stroke="#f4e2c2" stroke-width="2"/>'
    if expression=='surprise':
        return f'<ellipse cx="{x}" cy="{y+1}" rx="4.5" ry="6" fill="#755b53" stroke="#9f6654" stroke-width="1"/>'
    if expression=='skeptical':
        return f'<path d="M{x-8} {y+2}Q{x} {y-2} {x+7} {y+1}" fill="none" stroke="#9f6654" stroke-width="1.8" stroke-linecap="round"/>'
    return f'<path d="M{x-8} {y}Q{x} {y+5} {x+7} {y-1}" fill="none" stroke="#9f6654" stroke-width="1.8" stroke-linecap="round"/>'


def head(view,expression='neutral'):
    # Head/neck landmarks are held across native drawings; no 2D face flip.
    face={
      'front':'M110 70Q109 31 145 28Q185 27 188 72L184 111Q175 139 148 145Q122 138 111 111Z',
      'quarter':'M113 70Q113 29 148 28Q180 27 190 66L189 93Q189 98 192 102Q190 107 186 109Q180 134 157 145Q133 139 116 117Z',
      'side':'M120 66Q121 27 154 28Q183 30 190 61L189 94Q192 98 197 103Q199 105 187 111Q180 139 164 145Q144 141 138 137L126 116Z',
      'back':'M110 68Q110 29 148 27Q185 30 189 70L183 112Q168 142 147 145Q120 135 112 109Z',
    }[view]
    neck='M133 129L161 131 167 172Q146 190 124 168Z' if view!='side' else 'M143 130L168 132 169 167 150 184 134 166Z'
    if view=='back':neck='M132 127L162 127 167 170Q145 183 125 168Z'
    hair={
      'front':'M109 91Q96 65 107 42Q119 17 145 21Q179 16 190 47Q198 68 186 92L177 78 172 52Q158 70 142 64L132 53Q118 67 115 92Z',
      'quarter':'M116 96Q100 81 105 56Q109 24 140 21Q177 13 190 43L190 76 180 66 173 49Q155 66 139 65L131 54Q123 76 122 97Z',
      'side':'M126 96Q109 79 114 54Q121 22 151 22Q181 18 191 45L191 77 181 64 176 48Q159 64 144 63L136 54Q131 73 132 99Z',
      'back':'M109 97Q99 65 109 41Q124 15 150 21Q182 20 191 53Q194 87 181 113L171 123 151 133 129 121 114 109Z',
    }[view]
    bun={
      'front':'M111 44Q90 42 92 29Q98 17 111 26L120 36Z',
      'quarter':'M112 45Q91 41 94 27Q102 16 116 28L123 37Z',
      'side':'M119 43Q94 44 96 30Q99 16 118 26L128 35Z',
      'back':'M131 118Q116 99 132 91Q151 84 164 99Q171 120 148 127Z',
    }[view]
    out=f'<path d="{neck}" fill="#c79878" stroke="{INK}" stroke-width="1.5"/><path d="{face}" fill="{SKIN}" stroke="{INK}" stroke-width="2.1"/><path d="{bun}" fill="{HAIR}" stroke="{INK}" stroke-width="1.7"/><path d="{hair}" fill="{HAIR}" stroke="{INK}" stroke-width="2"/>'
    if view=='back':
        return out+f'<path d="{bun}" fill="{HAIR}" stroke="#56695e" stroke-width="1.4"/>'+'<path d="M121 45Q140 67 136 92 M151 37Q155 64 151 94 M177 49Q169 68 164 97" fill="none" stroke="#5d6d61" stroke-width="1.3"/><path d="M132 106Q147 99 159 110" fill="none" stroke="#728075" stroke-width="1"/>'
    if view=='side':
        out+='<path d="M132 97Q119 83 120 98Q122 113 137 111" fill="#d5a782" stroke="#7a7561" stroke-width="1.2"/><path d="M129 87Q137 79 141 92" fill="none" stroke="#4e6055" stroke-width="1.2"/>'
    elif view=='quarter':
        out+='<path d="M123 99Q108 86 110 100Q112 116 127 112" fill="#d5a782" stroke="#7a7561" stroke-width="1.2"/>'
    else:
        out+='<path d="M112 96Q100 87 104 102Q107 115 116 113 M186 96Q198 86 194 103Q190 115 182 113" fill="#d5a782" stroke="#7a7561" stroke-width="1.2"/>'
    nose='M145 95L141 109 149 111' if view=='front' else 'M169 95Q169 103 175 106Q178 108 173 110' if view=='quarter' else 'M187 100L195 104'
    out+=f'<path d="{nose}" fill="none" stroke="#b57c61" stroke-width="1.3" stroke-linecap="round"/>'
    out+=eyes(view,expression)+mouth(view,expression)
    out+='<path d="M126 120Q131 128 141 131" fill="none" stroke="#c49172" stroke-width="1.7" opacity=".6"/>'
    out+='<path d="M120 44Q139 33 160 35 M127 51L143 44" fill="none" stroke="#627167" stroke-width="1.4"/>'
    return out


def rest_hand(name, x, y, flip=False, scale=1, skin=SKIN):
    """One continuous palm silhouette: separate wrist/thumb and four fingertips.

    This is authored anatomy for an identity study, not a grip/collision model.
    """
    silhouette='M0 0Q5 -1 10 0Q14 5 16 12L16 25L16 34Q15 38 13 34L12 26L12 40Q10 44 8 40L8 28L8 42Q6 46 4 42L4 27L4 35Q2 39 0 35L0 23L-3 24Q-5 26 -7 24Q-9 22 -7 19L-3 13L0 8Q0 2 0 0Z'
    seams={'thumb':'M-4 15Q0 16 1 23','index':'M4 27L4 33','middle':'M8 28L8 34','ring':'M12 26L12 32','pinky':'M15 24L15 29'}
    mark=''.join(f'<path data-finger="{finger}" d="{path}" fill="none" stroke="#ad8062" stroke-width=".75"/>' for finger,path in seams.items())
    return f'<g id="{name}" data-kind="hand" transform="translate({x} {y}) scale({-scale if flip else scale} {scale})" stroke-linejoin="round" stroke-linecap="round"><path data-anatomy="hand-silhouette" d="{silhouette}" fill="{skin}" stroke="{INK}" stroke-width="1.1"/>{mark}</g>'


def profile_hand(name, x, y):
    # Edge-on anatomy, not a horizontally scaled front palm. Two finger
    # contours are exposed; the other fingers lie behind them in this rest pose.
    silhouette='M0 0Q4 -1 8 0Q10 6 11 12L11 33Q10 39 7 37L5 26L4 37Q2 40 0 37L0 24Q-5 28 -7 23Q-9 19 -4 16L0 9Z'
    return f'<g id="{name}" data-kind="hand" data-projection="edge" transform="translate({x} {y})" stroke-linecap="round" stroke-linejoin="round"><path data-anatomy="hand-silhouette" d="{silhouette}" fill="{SKIN}" stroke="{INK}" stroke-width="1.1"/><path d="M-4 16Q0 17 1 24 M5 26L5 31" fill="none" stroke="#ad8062" stroke-width=".75"/></g>'


def figure(view):
    side=view=='side'
    body='M132 162Q145 154 161 160Q178 169 182 192Q185 224 181 271L191 367Q166 382 123 367Q127 317 122 280Q119 225 122 188Z' if side else 'M111 162Q137 152 161 157Q178 160 183 170L184 284Q190 329 198 370Q155 390 101 372Q104 320 109 277Q102 228 97 191Z'
    if view=='quarter':body='M111 162Q140 152 164 159Q176 162 181 174L183 284Q187 333 197 370Q159 386 111 373Q115 322 117 278Q107 225 106 191Z'
    legs='''<path d="M123 357L151 359Q148 416 143 474L133 536L107 539L111 471Z" fill="#41555b"/>
<path d="M157 359L182 353L184 472Q187 510 195 535L169 541L162 475Z" fill="#33464e"/>
<path d="M110 530L135 529Q136 541 141 550Q113 565 91 559L91 547Z" fill="#3c403a" stroke="#424e46" stroke-width="1.6"/>
<path d="M169 534L195 530Q207 540 217 548Q220 560 173 562L165 551Z" fill="#3c403a" stroke="#424e46" stroke-width="1.6"/>
<path d="M96 556Q118 562 138 553 M174 557Q196 558 213 553" stroke="#9a9478" stroke-width="1.2" fill="none"/>'''
    if side:
        # In the neutral 90-degree stance, the far leg is also mostly occluded.
        legs='''<path d="M146 538Q160 534 175 538L196 550Q197 560 146 562Z" fill="#48534a"/>
<path d="M145 356L175 355Q173 416 173 474L184 536L158 541Q150 502 148 475Z" fill="#33464e"/>
<path d="M157 533L183 531Q196 540 207 548Q214 559 157 562L149 553Z" fill="#3c403a" stroke="#424e46" stroke-width="1.6"/>
<path d="M156 558Q181 563 204 553" fill="none" stroke="#9a9478" stroke-width="1.2"/>'''
    collar='<path d="M119 161L142 184L163 158L177 174Q164 195 151 225L126 211Z" fill="#eadcbb" stroke="#424e46" stroke-width="1.3"/>'
    if view=='back':collar='<path d="M117 164Q144 181 169 163L175 179Q145 198 112 181Z" fill="#d5c49b" stroke="#424e46" stroke-width="1.3"/>'
    if side:collar='<path d="M145 160Q152 172 162 163L171 179L161 205L151 196Z" fill="#eadcbb" stroke="#424e46" stroke-width="1.3"/>'
    body_art=f'<path d="{body}" fill="#477c7b" stroke="#424e46" stroke-width="2.2"/>'+collar
    shade='M169 207Q180 247 179 282L172 314Q182 340 190 371L169 377Q156 337 158 285Z' if side else 'M151 216L176 178Q178 230 179 280L169 316Q174 353 181 376L156 382L146 297Z'
    body_art+=f'<path d="{shade}" fill="#355f63" opacity=".8"/>'
    if view=='back':body_art+='<path d="M118 205Q143 211 170 205 M148 196L146 304" fill="none" stroke="#7aa093" stroke-width="1.5"/>'
    belt='M124 291Q151 299 182 291L186 311Q157 319 125 309Z' if side else 'M105 291Q149 301 185 290L188 311Q150 322 105 311Z'
    body_art+=f'<path d="{belt}" fill="#cfb581" stroke="#75694e" stroke-width="1.2"/>'
    sash='M179 311Q186 333 190 361L181 367L172 313Z' if side else 'M153 312Q159 339 165 366L154 372L143 316Z'
    if view=='back':sash='M151 311L163 342L150 350L140 332Z'
    body_art+=f'<path d="{sash}" fill="#cfb581" stroke="#75694e" stroke-width="1.1"/>'
    folds='M130 327Q128 347 128 365 M150 331L150 371 M176 331L181 365' if side else 'M119 327Q114 351 113 364 M134 331L131 373 M178 331L185 365'
    body_art+=f'<path d="{folds}" stroke="#80a097" stroke-width="1.3" fill="none"/>'
    if side:
        # True profile: a single near arm at the side shoulder, no far arm.
        sleeve='M147 168Q167 165 177 190Q183 218 187 269Q178 277 169 272L156 208Q144 191 147 168Z'
        arms=f'<g id="side-near-arm" data-kind="arm"><path d="{sleeve}" fill="#648f82" stroke="{INK}" stroke-width="1.8"/><path d="M170 270Q179 272 187 268L188 309Q182 313 175 310Z" fill="{SKIN}" stroke="{INK}" stroke-width="1.4"/>'+profile_hand('side-near-hand',177,308)+'</g>'
    else:
        sleeve_l='M108 167Q86 172 81 204Q75 239 68 275L89 281L113 201Z'
        sleeve_r='M177 170Q200 173 204 207Q209 246 216 280L194 286L174 207Z'
        arms=f'<g id="{view}-far-arm" data-kind="arm"><path d="{sleeve_l}" fill="#587f7a" stroke="{INK}" stroke-width="1.8"/><path d="M70 272L89 276Q85 294 84 311L74 311Q69 294 70 272Z" fill="{SKIN}" stroke="{INK}" stroke-width="1.4"/>'+rest_hand(view+'-far-hand',84,310,flip=True,scale=.88 if view=='quarter' else 1)+'</g>'
        arms+=f'<g id="{view}-near-arm" data-kind="arm"><path d="{sleeve_r}" fill="#648f82" stroke="{INK}" stroke-width="1.8"/><path d="M196 281L214 278Q220 296 218 312L208 313Z" fill="{SKIN}" stroke="{INK}" stroke-width="1.4"/>'+rest_hand(view+'-near-hand',208,311)+'</g>'
    return f'<g id="{view}-whole-character" stroke-linejoin="round" stroke-linecap="round">'+legs+body_art+arms+head(view)+'</g>'


def sheet():
    body='<rect width="1600" height="1120" fill="#f4f0e7"/>'
    body+=label(48,49,'M2 / B方向 · lin身份设定修订稿',30)
    body+=label(48,82,'保留束发、窄脸、青绿交领、米色内衬与暖色腰带；先确认身份，不是生产 rig。',17,'#6b776e')
    views=[('front','正面'),('quarter','四分之三'),('side','侧面'),('back','背面')]
    for i,(view,name) in enumerate(views):
        x=60+i*385
        body+=f'<path d="M{x} 647H{x+320}" stroke="#cdc8b9" stroke-width="1"/>'
        body+=f'<g transform="translate({x+18} 105) scale(.95)">{figure(view)}</g>'
        body+=label(x+90,679,name,21)
    body+='<path d="M48 707H1552" stroke="#cdc8b9" stroke-width="1"/>'
    body+=label(48,748,'表情与开口方向 / 静态设计，不是已验证的九口型',22)
    for i,(expression,name) in enumerate([('neutral','平静'),('speaking','说话'),('surprise','惊讶'),('skeptical','怀疑')]):
        x=85+i*380
        body+=f'<g transform="translate({x-52} 778) scale(1.35)"><path d="M108 161Q143 153 176 164L190 187H94Z" fill="#477c7b"/>{head("quarter",expression)}</g>'
        body+=label(x+56,1049,name,20)
    body+=label(48,1100,'待身份确认后再拆件、绑定骨架、接入真实动作与音频。A/B/C原始方向稿全部保留。',17,'#6b776e')
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1120" viewBox="0 0 1600 1120" role="img" aria-labelledby="title"><title id="title">B方向lin角色身份设定修订稿，非生产资产</title>'+body+'</svg>'


def hand_study():
    body='<rect width="1280" height="440" fill="#f4f0e7"/>'+label(40,42,'手部细节 · 同一绘制轮廓的放大检查',26)
    examples=[('left-rest',170,True,1,'自然垂手 / 左'),('right-rest',565,False,1,'自然垂手 / 右'),('profile-rest',990,False,1,'侧身近手 / 余指遮挡')]
    for name,x,flip,scale,caption in examples:
        drawing=profile_hand(name,0,0) if name=='profile-rest' else rest_hand(name,0,0,flip=flip,scale=scale)
        wrist_width=8 if name=='profile-rest' else 10
        body+=f'<g transform="translate({x} 102) scale(5)"><g transform="scale({-scale if flip else scale} {scale})"><path d="M0 -5L{wrist_width} -5L{wrist_width} 1H0Z" fill="{SKIN}"/></g>'+drawing+'</g>'
        body+=label(x-75,360,caption,18)
    body+=label(40,408,'垂手有掌根、拇指和四指；侧视/握杯按遮挡关系显示，不强求每个姿势露出五指。',17,'#6b776e')
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="440" viewBox="0 0 1280 440" role="img"><title>角色手掌与五指的静态轮廓检查</title>'+body+'</svg>'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out',type=Path)
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'lin-identity-anchor.svg').write_text(sheet())
    (args.out/'lin-hand-detail.svg').write_text(hand_study())
    print(args.out/'lin-identity-anchor.svg')


if __name__=='__main__':main()
