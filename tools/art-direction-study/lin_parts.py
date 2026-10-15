#!/usr/bin/env python3
"""Derive disposable B lin vector parts from the accepted identity.

Draft asset preparation only, not an alternate episode pipeline or renderer.
Native-view geometry is exported explicitly; canonical integration is pending.
"""
import argparse
import copy
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path
import lin_anchor as art

PARTS=('torso','head','arm_u_l','arm_l_l','hand_l','arm_u_r','arm_l_r','hand_r',
       'leg_u_l','leg_l_l','foot_l','leg_u_r','leg_l_r','foot_r')
VIEWS=('front','quarter','side','back','quarter_back')
FAMILIES=('calm','shock','fear','desperate','confused','skeptical','embarrassed','relief','excited','proud','somber')
HAND_SHAPES=('rest','open','point','fist','splayed')
SCALE=1.2
DX=22.4
DY=44.64


def x_offset(view):return round(200-geometry(view)['waist'][0]*SCALE,4)
def point(x,y,view='front'):return [round(x_offset(view)+x*SCALE,4),round(DY+y*SCALE,4)]
def parse(source):return ET.fromstring('<g>'+source+'</g>')
def serialize(nodes):return ''.join(ET.tostring(n,encoding='unicode') for n in nodes)

def svg(content='',view='front'):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="720" viewBox="0 0 400 720">'+(f'<g transform="translate({x_offset(view)} {DY}) scale({SCALE})" stroke-linecap="round" stroke-linejoin="round">{content}</g>' if content else '')+'</svg>'


def cut(nodes,name,y,upper,color,cx,radius=12):
    # Overlap + joint cap are intentional. A clipped bare edge is not a joint.
    y0,y1=(-20,y+6) if upper else (y-6,590)
    clip=f'<defs><clipPath id="{name}-cut"><rect x="0" y="{y0}" width="300" height="{y1-y0}"/></clipPath></defs>'
    cap=f'<circle cx="{cx}" cy="{y}" r="{radius}" fill="{color}"/>'
    return clip+cap+f'<g clip-path="url(#{name}-cut)">{serialize(nodes)}</g>'


def native_head(view):
    if view!='quarter_back':return art.head(view)
    nodes=list(parse(art.head('back')))
    # Rear-quarter is a new derivative native drawing, not a compressed face.
    nodes[0].set('d','M139 127L168 129L175 169Q150 184 130 170Z')
    nodes[1].set('d','M120 68Q119 30 154 28Q187 30 192 69L186 113Q174 139 156 145Q134 139 122 110Z')
    nodes[3].set('d','M119 97Q110 67 120 42Q133 18 156 22Q186 23 194 55Q195 88 184 112L176 123L157 134L140 123L124 110Z')
    bun='M145 119Q132 99 147 92Q162 87 173 101Q179 120 161 128Z'
    nodes[2].set('d',bun);nodes[4].set('d',bun)
    nodes[5].set('d','M130 44Q148 66 145 94 M159 39Q165 64 161 96 M183 51Q176 70 172 99')
    nodes[6].set('d','M146 108Q159 102 169 113')
    ear=ET.fromstring('<path d="M182 94Q195 88 195 100Q193 113 184 114Q178 107 182 94Z" fill="#d5a782" stroke="#7a7561" stroke-width="1.2"/>')
    nodes.append(ear)
    nodes.append(ET.fromstring('<path d="M186 98Q191 96 190 105" fill="none" stroke="#ad8062" stroke-width="1"/>'))
    return serialize(nodes)


def native_figure(view):
    if view!='quarter_back':return art.figure(view)
    figure=parse(art.figure('quarter'))[0]
    n=len(list(parse(art.head('quarter'))))
    for node in list(figure)[-n:]:figure.remove(node)
    for node in figure:
        if node.get('d')=='M119 161L142 184L163 158L177 174Q164 195 151 225L126 211Z':
            node.set('d','M126 166Q146 181 171 166L179 181Q153 196 119 183Z')
        if node.get('d')=='M153 312Q159 339 165 366L154 372L143 316Z':
            node.set('d','M155 311L167 342L154 350L144 332Z')
    seam=ET.fromstring('<path d="M125 205Q149 211 174 205 M155 196L153 290" fill="none" stroke="#7aa093" stroke-width="1.5"/>')
    figure.insert(8,seam)
    for node in parse(native_head(view)):figure.append(node)
    return ET.tostring(figure,encoding='unicode')


def geometry(view):
    j={'waist':(148,303),'neck':(145,162),
       'shoulder_l':(103,181),'elbow_l':(87,241),'hand_l':(76,325),
       'shoulder_r':(184,181),'elbow_r':(196,246),'hand_r':(216,326),
       'hip_l':(137,330),'knee_l':(127,465),'foot_l':(123,543),
       'hip_r':(169,331),'knee_r':(173,473),'foot_r':(181,547)}
    if view in ('quarter','quarter_back'):j['hand_l']=(76.96,323.2)
    if view=='quarter_back':j['neck']=(153,163)
    if view=='side':
        j.update(waist=(157,303),neck=(154,166),shoulder_r=(161,179),
                 elbow_r=(173,244),hand_r=(182,326),hip_r=(162,331),
                 knee_r=(160.5,472),foot_r=(176,546))
        # Hidden limbs still have explicitly declared geometry, not missing keys.
        for stem in ('shoulder','elbow','hand','hip','knee','foot'):j[stem+'_l']=j[stem+'_r']
    return j


def skeleton(view):
    raw=geometry(view);j={k:point(*v,view=view) for k,v in raw.items()}
    p=lambda x,y:point(x,y,view=view)
    torso_bounds=(p(118,157),p(193,383)) if view=='side' else (p(97,157),p(198,383))
    hand_radius=4.8 if view=='side' else 8.4
    parts={'torso':{'box':list(torso_bounds)},
           'head':{'box':[p(92,19),p(199,184)]}}
    for side in ('l','r'):
        for part,a,b in [('upper_arm','shoulder','elbow'),('forearm','elbow','hand'),('thigh','hip','knee'),('shin','knee','foot')]:
            parts[part+'_'+side]={'capsule':{'from':a+'_'+side,'to':b+'_'+side,'radius':14.4 if 'arm' in part else 18}}
        parts['hand_'+side]={'circle':{'at':'hand_'+side,'radius':hand_radius}}
    return {'version':1,'space':{'width':400,'height':720},'joints':j,'parts':parts,
            'arm':{'upper':math.dist(j['shoulder_r'],j['elbow_r']),
                   'fore':math.dist(j['elbow_r'],j['hand_r']),'handRadius':hand_radius},
            'waist':{'pitchMax':40},'balance':{'stepLength':90,'catchFraction':.5,'maxSteps':3}}


def mouth_glyph(view,key):
    if view in ('back','quarter_back'):return ''
    x,y=(146,121) if view=='front' else (167,121) if view=='quarter' else (181,121)
    factor=.52 if view=='side' else 1
    width={'A':7,'B':7,'C':7,'D':8,'E':9,'F':3.5,'G':6,'H':6,'X':7}[key]*factor
    color='#9f6654';inside='#755b53'
    if key=='X':
        shape=f'<path d="M{x-width} {y}Q{x} {y+5} {x+width} {y-1}" fill="none" stroke="{color}" stroke-width="1.8"/>'
    elif key=='A':
        shape=f'<path d="M{x-width} {y}Q{x} {y+1} {x+width} {y}" fill="none" stroke="{color}" stroke-width="1.8"/>'
    else:
        height={'B':2.5,'C':5,'D':8,'E':3.5,'F':5.5,'G':2,'H':5}[key]
        shape=f'<ellipse cx="{x}" cy="{y+1}" rx="{width}" ry="{height}" fill="{inside}" stroke="{color}" stroke-width="1.1"/>'
        if key in ('B','G'):
            shape+=f'<path d="M{x-width*.7} {y}H{x+width*.7}" stroke="#f4e2c2" stroke-width="2"/>'
        if key in ('D','H'):
            shape+=f'<path d="M{x-width*.65} {y+height*.65}Q{x} {y+height*.3} {x+width*.65} {y+height*.65}" fill="none" stroke="#bf897c" stroke-width="1.7"/>'
    # Keep profile vowels within its own face contour; no full-head compression.
    face=list(parse(art.head(view)))[1]
    return f'<defs><clipPath id="{view}-mouth-{key}">{serialize([face])}</clipPath></defs><g data-viseme="{key}" clip-path="url(#{view}-mouth-{key})">{shape}</g>'


def blink_glyph(view,state):
    if view in ('back','quarter_back'):return ''
    if state=='open':return art.eyes(view,'neutral')
    pairs=[(128,88,10),(162,88,10)] if view=='front' else [(147,88,10),(176,88,6)] if view=='quarter' else [(175,88,9)]
    out=[]
    for x,y,w in pairs:
        if state=='half':
            out.append(f'<path d="M{x-w} {y-1}H{x+w}Q{x} {y+6} {x-w} {y-1}Z" fill="#f6edce" stroke="{art.INK}" stroke-width="1.1"/><ellipse cx="{x+2}" cy="{y+1}" rx="2.4" ry="1.7" fill="{art.HAIR}"/><path d="M{x-w} {y-1}H{x+w}" stroke="{art.INK}" stroke-width="1.5"/>')
        else:
            out.append(f'<path d="M{x-w} {y}Q{x} {y+5} {x+w} {y}" fill="none" stroke="{art.INK}" stroke-width="1.6"/>')
        out.append(f'<path d="M{x-w} {y-11}Q{x} {y-16} {x+w} {y-11}" fill="none" stroke="{art.INK}" stroke-width="2"/>')
    return ''.join(out)


def grip_glyph(view,side):
    x,y=geometry(view)['hand_'+side];flip=-1 if side=='l' else 1
    skin='#d5a782' if view=='side' and side=='l' else art.SKIN
    silhouette='M-8 -15L2 -15Q7 -10 8 -4L10 -2Q12 0 9 2L3 3L9 4Q11 7 7 8L1 9L6 10Q8 13 4 14L-3 14Q-9 12 -9 6L-10 1Q-16 0 -14 -5L-8 -8Z'
    return f'<g data-hand-shape="grip" transform="translate({x} {y}) scale({flip} 1)"><path d="{silhouette}" fill="{skin}" stroke="{art.INK}" stroke-width="1.1"/><path data-grip-layer="finger-shadow" d="M-3 3L8 2L7 4L-3 5ZM-4 8L7 7L5 9L-4 10ZM-4 12L4 12L2 14L-3 14Z" fill="#ad8062" opacity=".45"/><path data-grip-layer="thumb-wrap" d="M-10 -7Q-3 -8 -2 -3Q-1 1 -5 3L-9 1" fill="{skin}" stroke="#ad8062" stroke-width=".9"/><path d="M-3 3L8 2M-4 8L7 7M-4 12L4 12" fill="none" stroke="#ad8062" stroke-width=".75"/></g>'


def annotated_eyes(source):
    nodes=list(parse(source));brow=0
    for node in nodes:
        node.set('data-face-role','brow' if node.get('stroke-width')=='2' else 'eye')
        if node.get('stroke-width')=='2':
            node.set('data-brow-index',str(brow));brow+=1
        if node.get('fill')==art.HAIR or (node.tag=='circle' and node.get('r')=='.8'):
            node.set('data-gaze-pupil','true')
    return serialize(nodes)


def family_eyes(view,family):
    if view in ('back','quarter_back'):return ''
    expression='surprise' if family in ('shock','fear') else 'skeptical' if family=='skeptical' else 'neutral'
    nodes=list(parse(art.eyes(view,expression)))
    if family not in ('shock','fear','skeptical','calm','embarrassed'):
        brow_index=0
        for node in nodes:
            if node.get('stroke-width')!='2':continue
            pairs=[(128,88,10),(162,88,10)] if view=='front' else [(147,88,10),(176,88,6)] if view=='quarter' else [(175,88,9)]
            x,y,w=pairs[brow_index];brow_index+=1
            if family in ('somber','desperate'):
                left,right=(y-10,y-17) if brow_index==1 else (y-17,y-10)
                path=f'M{x-w} {left}Q{x} {y-17} {x+w} {right}'
            elif family=='confused':path=f'M{x-w} {y-17 if brow_index==1 else y-10}Q{x} {y-20} {x+w} {y-11}'
            elif family=='proud':path=f'M{x-w} {y-10}Q{x} {y-13} {x+w} {y-15}'
            else:path=f'M{x-w} {y-15}Q{x} {y-22} {x+w} {y-15}'
            node.set('d',path)
    result=annotated_eyes(serialize(nodes))
    if family=='embarrassed':
        pairs=[(126,110,10),(165,110,10)] if view=='front' else [(145,112,10),(178,110,5)] if view=='quarter' else [(174,112,7)]
        result+=''.join(f'<ellipse cx="{x}" cy="{y}" rx="{w}" ry="4" fill="#cc8b7b" opacity=".5"/>' for x,y,w in pairs)
    return result


def family_mouth(view,family):
    if view in ('back','quarter_back'):return ''
    if family in ('shock','fear'):return mouth_glyph(view,'D' if family=='shock' else 'F')
    if family=='desperate':return mouth_glyph(view,'C')
    if family=='skeptical':return art.mouth(view,'skeptical')
    x,y=(146,121) if view=='front' else (167,121) if view=='quarter' else (181,121)
    w=3.5 if view=='side' else 7
    bend=-4 if family=='somber' else 1 if family=='confused' else 7 if family in ('excited','proud','relief') else 5
    return f'<path d="M{x-w} {y}Q{x} {y+bend} {x+w} {y-1}" fill="none" stroke="#9f6654" stroke-width="1.8" stroke-linecap="round"/>'


def hand_glyph(view,side,shape):
    if shape=='fist':return grip_glyph(view,side)
    if shape=='rest':raise ValueError('Rest shape comes directly from the approved part')
    x,y=geometry(view)['hand_'+side];flip=-1 if side=='l' else 1
    skin='#d5a782' if view=='side' and side=='l' else art.SKIN
    # Wrist and palm share the same anchor in every mode. Fingers are drawn,
    # not independent rods emerging directly from the sleeve.
    outline={
      'open':'M-8 -15L2 -15Q8 -10 8 -3L9 17Q9 22 6 18L4 10L4 24Q2 28 0 24L-1 11L-2 24Q-4 28 -5 24L-6 10L-9 19Q-12 22 -11 17L-9 1Q-16 7 -16 2Q-16 -3 -10 -5Z',
      'splayed':'M-8 -15L2 -15Q8 -10 8 -3L15 16Q16 21 12 19L6 9L6 24Q4 29 2 25L0 10L-4 26Q-7 29 -7 24L-6 8L-14 19Q-18 22 -17 17L-11 1Q-19 4 -18 -1L-10 -7Z',
      'point':'M-8 -15L2 -15Q8 -10 7 -2L7 31Q5 36 3 31L1 6Q-4 13 -10 7L-10 1Q-15 0 -13 -5L-8 -8Z',
    }[shape]
    return f'<g data-hand-shape="{shape}" transform="translate({x} {y}) scale({flip} 1)"><path d="{outline}" fill="{skin}" stroke="{art.INK}" stroke-width="1.1"/><path d="M-10 -5Q-3 -4 -4 3" fill="none" stroke="#ad8062" stroke-width=".75"/></g>'


def tear_glyph(view):
    if view in ('back','quarter_back'):return ''
    points=[(128,94),(162,94)] if view=='front' else [(147,94),(176,94)] if view=='quarter' else [(175,94)]
    return ''.join(f'<path d="M{x} {y}q-4 10 0 13q5 -3 3 -13Z" fill="#8fd0e8" stroke="#4a86a3" stroke-width=".7"/>' for x,y in points)


def artwork_data():
    views={}
    for view in VIEWS:
        d=draft(view)
        views[view]={'skeleton':d['skeleton'],'parts':d['parts'],'rearArms':['l'] if view=='side' else [],
                     'eyes':{state:svg(annotated_eyes(blink_glyph(view,state)),view) for state in ('open','half','closed')},
                     'expressions':{f:svg(family_eyes(view,f),view) for f in FAMILIES},
                     'emotionMouths':{f:svg(family_mouth(view,f),view) for f in FAMILIES},
                     'mouths':d['mouths'],'tears':svg(tear_glyph(view),view),
                     'hands':{s:{h:d['parts']['hand_'+s] if h=='rest' else svg(hand_glyph(view,s,h),view) for h in HAND_SHAPES} for s in ('l','r')}}
    return {'format':'svg-bone-parts','views':views}


def draft(view):
    if view not in VIEWS:raise ValueError('Unsupported native view: '+view)
    whole=parse(native_figure(view))[0]
    head_nodes=list(parse(native_head(view)))
    nodes=list(whole)
    content=nodes[:-len(head_nodes)]
    leg_count=4 if view=='side' else 5
    legs=content[:leg_count]
    torso=[n for n in content[leg_count:] if n.get('data-kind')!='arm']
    arms=[n for n in content if n.get('data-kind')=='arm']
    pieces={name:'' for name in PARTS};occluded=[]
    pieces['torso']=serialize(torso)
    # Identity face base retains nose/ears/neck/hair but not eyes or mouth.
    head_base=native_head(view)
    face_view='back' if view=='quarter_back' else view
    for overlay in (art.eyes(face_view,'neutral'),art.mouth(face_view,'neutral')):
        if overlay:
            if head_base.count(overlay)!=1:raise ValueError('Face overlay is not uniquely removable')
            head_base=head_base.replace(overlay,'')
    pieces['head']=head_base
    geom=geometry(view)
    if view=='side':
        far_foot=copy.deepcopy(legs[2]);far_foot.set('fill','#48534a')
        pieces['foot_l']=serialize([legs[0],far_foot,legs[3]])
        pieces['foot_r']=serialize(legs[2:])
        occluded+=['leg_u_l','leg_l_l']
        far_leg=copy.deepcopy(legs[1]);far_leg.set('fill','#2f4248')
        leg_pairs=[('l',far_leg),('r',legs[1])]
        far_arm=copy.deepcopy(arms[0]);far_arm.set('id','side-far-arm')
        list(far_arm)[0].set('fill','#587f7a')
        for node in far_arm.iter():
            if node.get('fill')==art.SKIN:node.set('fill','#d5a782')
            if node.get('id')=='side-near-hand':node.set('id','side-far-hand')
        arms.insert(0,far_arm)
    else:
        soles=re.split(r'\s+(?=M)',legs[4].get('d'))
        if len(soles)!=2:raise ValueError('Expected two authored shoe sole strokes')
        for i,side in enumerate(('l','r')):
            sole=copy.deepcopy(legs[4]);sole.set('d',soles[i])
            pieces['foot_'+side]=serialize([legs[2+i],sole])
        leg_pairs=[('l',legs[0]),('r',legs[1])]
    for side,leg in leg_pairs:
        cx,y=geom['knee_'+side];color=leg.get('fill')
        # The approved still hid these upper-pants regions under the tunic.
        # Bending must expose pants, not empty background between torso/hips.
        pelvis='M141 311L175 311L177 362L145 363Z' if view=='side' else 'M121 311L149 313L152 361L123 367Z' if side=='l' else 'M149 312L180 311L185 359L158 364Z'
        overlap=ET.fromstring(f'<path data-rig-layer="pelvis-overlap" d="{pelvis}" fill="{color}"/>')
        for name,upper in [('leg_u_',True),('leg_l_',False)]:
            radius=10.5 if side=='r' else 14.5
            if view=='side':radius=10.5
            pieces[name+side]=cut([overlap,leg] if upper else [leg],view+'-'+name+side,y,upper,color,cx,radius)
    for i,arm in enumerate(arms):
        side='r' if i==1 else 'l'
        sleeve,fore,hand=list(arm)
        cx,y=geom['elbow_'+side];color=sleeve.get('fill')
        sx,sy=geom['shoulder_'+side]
        shoulder=f'<circle data-rig-layer="shoulder-overlap" cx="{sx}" cy="{sy}" r="9" fill="{color}"/>'
        pieces['arm_u_'+side]=shoulder+cut([sleeve],view+'-upper-'+side,y,True,color,cx)
        pieces['arm_l_'+side]=cut([sleeve],view+'-lower-'+side,y,False,color,cx)+serialize([fore])
        pieces['hand_'+side]=serialize([hand])
    if view=='side':occluded+=['arm_u_l','arm_l_l','hand_l']
    pivots={}
    for name in PARTS:
        joint={'torso':'waist','head':'neck'}.get(name)
        if joint is None:
            stem,side=name.rsplit('_',1)
            joint={'arm_u':'shoulder','arm_l':'elbow','hand':'hand','leg_u':'hip','leg_l':'knee','foot':'foot'}[stem]+'_'+side
        pivots[name]=point(*geom[joint],view=view)
    faces={}
    for expression in ('neutral','speaking','surprise','skeptical'):
        facial=art.eyes(face_view,expression)+art.mouth(face_view,expression)
        faces[expression]=svg(f'<g data-facial-layer="{expression}">{facial}</g>' if facial else '',view)
    sk=skeleton(view)
    return {'parts':{k:svg(v,view) for k,v in pieces.items()},'faces':faces,'pivots':pivots,
            'skeleton':sk,'sockets':{k:v for k,v in sk['joints'].items() if k.startswith('hand_')},
            'occluded':sorted(occluded),
            'mouths':{key:svg(mouth_glyph(view,key),view) for key in 'ABCDEFGHX'},
            'eyes':{state:svg(blink_glyph(view,state),view) for state in ('open','half','closed')},
            'grips':{side:svg(grip_glyph(view,side),view) for side in ('l','r')}}


def assembled(view,show_joints=False):
    d=draft(view)
    # This is a neutral SVG assembly check, never a motion/episode renderer.
    rear=('arm_u_l','arm_l_l','hand_l') if view=='side' else ()
    front=() if view=='side' else ('arm_u_l','arm_l_l','hand_l')
    order=('leg_u_l','leg_l_l','foot_l','leg_u_r','leg_l_r','foot_r')+rear+('torso',)+front+('arm_u_r','arm_l_r','hand_r','head')
    content=''.join(serialize(list(ET.fromstring(d['parts'][name]))) for name in order)
    content+=serialize(list(ET.fromstring(d['faces']['neutral'])))
    if show_joints:
        for name,(x,y) in d['skeleton']['joints'].items():
            content+=f'<circle cx="{x}" cy="{y}" r="3" fill="#be603f"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="720" viewBox="0 0 400 720">'+content+'</svg>'


def board(joints=False):
    body='<rect width="2000" height="880" fill="#f4f0e7"/>'+art.label(35,44,'M2 · 原生视图拆件与中性重组（尚未接入生产引擎）',24)
    for i,view in enumerate(VIEWS):
        root=ET.fromstring(assembled(view,joints))
        body+=f'<g transform="translate({i*400} 80)">'+serialize(list(root))+'</g>'
        body+=art.label(i*400+100,843,view,20)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="880" viewBox="0 0 2000 880">'+body+'</svg>'


def overlay_board():
    body='<rect width="1600" height="1520" fill="#f4f0e7"/>'+art.label(30,40,'M2 · 独立口型、眨眼与握手形状（静态设计，未验音频/杯接触）',23)
    for row,view in enumerate(('front','quarter','side')):
        d=draft(view);y=64+row*300
        body+=art.label(18,y+24,view,18)
        for col,key in enumerate('ABCDEFGHX'):
            nodes=list(ET.fromstring(d['parts']['head']))+list(ET.fromstring(d['eyes']['open']))+list(ET.fromstring(d['mouths'][key]))
            layer=serialize(nodes)
            # IDs are scoped across cells even when the same atlas is reused.
            layer=re.sub(r'id="([^"]+)"',lambda m:f'id="cell-{row}-{col}-{m.group(1)}"',layer)
            layer=re.sub(r'url\(#([^)]*)\)',lambda m:f'url(#cell-{row}-{col}-{m.group(1)})',layer)
            body+=f'<g transform="translate({col*176-102} {y}) scale(.95)">{layer}</g>'
            body+=art.label(col*176+80,y+277,key,20)
    for col,(view,state) in enumerate((v,s) for v in ('front','quarter','side') for s in ('open','half','closed')):
        d=draft(view);y=964
        layer=serialize(list(ET.fromstring(d['parts']['head']))+list(ET.fromstring(d['eyes'][state])))
        layer+=f'<g transform="translate({x_offset(view)} {DY}) scale({SCALE})">{art.mouth(view,"neutral")}</g>'
        body+=f'<g transform="translate({col*176-102} {y}) scale(.95)">{layer}</g>'
        body+=art.label(col*176+24,y+277,view+' / '+state,15)
    for col,(view,side) in enumerate((v,s) for v in ('front','quarter','side','back') for s in ('l','r')):
        d=draft(view);px,py=d['pivots']['hand_'+side]
        layer=serialize(list(ET.fromstring(d['grips'][side])))
        body+=f'<g transform="translate({col*198+95} 1355) scale(3) translate({-px} {-py})">{layer}</g>'
        body+=art.label(col*198+30,1444,view+' / '+side,17)
        if not layer:body+=art.label(col*198+20,1360,'远手遮挡',16)
    body+=art.label(30,1495,'背面没有眼睛/嘴。握手轮廓只是独立草稿，真实包裹与抓取要在 canonical 短片里验收。',17)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1520" viewBox="0 0 1600 1520">'+body+'</svg>'


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('out',type=Path)
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    for view in VIEWS:
        d=draft(view);base=args.out/'draft-library/figure/lin_b_draft'/view
        for group in ('parts','faces','mouths','eyes','grips'):
            (base/group).mkdir(parents=True,exist_ok=True)
            for name,value in d[group].items():(base/group/(name+'.svg')).write_text(value)
        for name in ('skeleton','sockets'):(base/(name+'.json')).write_text(json.dumps(d[name],indent=2)+'\n')
        (base/'draft-receipt.json').write_text(json.dumps({'status':'draft; not production-integrated','pivots':d['pivots'],'occluded':d['occluded']},indent=2)+'\n')
    (args.out/'svg').mkdir(exist_ok=True)
    for name,joints in [('lin-parts-assembly',False),('lin-parts-joints',True)]:
        (args.out/'svg'/(name+'.svg')).write_text(board(joints))
    (args.out/'svg/lin-parts-overlays.svg').write_text(overlay_board())
    asset=args.out/'draft-library/figure/lin_b_draft'
    (asset/'artwork.json').write_text(json.dumps(artwork_data(),indent=2)+'\n')
    (asset/'skeleton.json').write_text(json.dumps(skeleton('front'),indent=2)+'\n')
    (asset/'manifest.json').write_text(json.dumps({'notes':['Draft vector asset for isolated M2 QA; not approved production library.']},indent=2)+'\n')
    print(args.out)


if __name__=='__main__':main()
